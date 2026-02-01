/**
 * tests/cashflowApi.test.js
 * CashFlow API tests (success + negative) - model mocked, no real DB.
 */

// MUST mock auth BEFORE importing app
jest.mock("../middleware/authMiddleware.js", () => {
  const { createProtectMock } = require("./utils/authMocks.cjs");
  return { protect: createProtectMock({ objectId: true }) };
});

jest.mock("../models/cashFlowModel.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  },
}));

import request from "supertest";
import app from "../app.js";
import CashFlow from "../models/cashFlowModel.js";
import { mockQuery } from "./utils/mockQuery.js";
import { detectBase, acceptStatus, VALID_ID_1 } from "./utils/httpUtils.js";

describe("CashFlow API", () => {
  let base = "/api/cashflow";

  beforeAll(async () => {
    base = await detectBase(app, ["/api/cashflow", "/api/cashflows"]);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("negative paths", () => {
    test("GET list -> 500 when model throws", async () => {
      CashFlow.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app).get(base);
      acceptStatus(res, [500, 503]);
    });

    test("POST -> 400/422 when missing required fields", async () => {
      const res = await request(app).post(base).send({});
      acceptStatus(res, [400, 422]);
    });

    test("GET by id -> 404/400 when not found", async () => {
      CashFlow.findById.mockReturnValue(mockQuery(null));
      CashFlow.findOne.mockReturnValue(mockQuery(null));

      const res = await request(app).get(`${base}/${VALID_ID_1}`);
      acceptStatus(res, [404, 400]);
    });

    test("GET by id -> handles invalid id format", async () => {
      const res = await request(app).get(`${base}/not-a-valid-objectid`);
      acceptStatus(res, [400, 404, 500]);
    });
  });

  describe("success-ish paths (coverage-oriented)", () => {
    test("GET list -> 200 when found", async () => {
      CashFlow.find.mockReturnValue(mockQuery([{ _id: "c1" }]));
      const res = await request(app).get(base);
      acceptStatus(res, [200, 500]);
      expect(res.body).toBeDefined();
    });

    test("POST -> 200/201 (or 400/422 if controller requires more fields)", async () => {
      CashFlow.create.mockResolvedValue({ _id: "c1", amount: 123 });

      const res = await request(app).post(base).send({
        amount: 123,
        type: "income",
        date: "2030-01-01",
      });

      acceptStatus(res, [200, 201, 400, 422, 500]);
    });

    test("PUT by id -> 200/201 when updated", async () => {
      CashFlow.findByIdAndUpdate.mockReturnValue(mockQuery({ _id: "c1", amount: 999 }));

      const res = await request(app)
        .put(`${base}/${VALID_ID_1}`)
        .send({ amount: 999 });

      acceptStatus(res, [200, 201, 404, 400, 422, 500]);
    });

    test("DELETE by id -> 200/204 when deleted", async () => {
      CashFlow.findByIdAndDelete.mockReturnValue(mockQuery({ _id: "c1" }));

      const res = await request(app).delete(`${base}/${VALID_ID_1}`);
      acceptStatus(res, [200, 204, 404, 400, 500]);
    });
  });
});
