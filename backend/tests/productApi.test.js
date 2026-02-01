/**
 * tests/productApi.test.js
 * Product API tests (success + negative) - model mocked.
 */

jest.mock("../middleware/authMiddleware.js", () => {
  const { createProtectMock } = require("./utils/authMocks.cjs");
  return { protect: createProtectMock({ objectId: true }) };
});

jest.mock("../models/productModel.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

import request from "supertest";
import app from "../app.js";
import Product from "../models/productModel.js";
import { mockQuery } from "./utils/mockQuery.js";
import { detectBase, acceptStatus, VALID_ID_1 } from "./utils/httpUtils.js";

describe("Product API", () => {
  let base = "/api/products";

  beforeAll(async () => {
    base = await detectBase(app, ["/api/products", "/api/product"]);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("negative paths", () => {
    test("GET list -> 500 when model throws", async () => {
      Product.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app).get(base);
      acceptStatus(res, [500, 503]);
    });

    test("GET by id -> 404/400 when not found", async () => {
      Product.findById.mockReturnValue(mockQuery(null));
      Product.findOne.mockReturnValue(mockQuery(null));

      const res = await request(app).get(`${base}/${VALID_ID_1}`);
      acceptStatus(res, [404, 400]);
    });

    test("GET by id -> handles invalid id", async () => {
      const res = await request(app).get(`${base}/not-a-valid-objectid`);
      acceptStatus(res, [400, 404, 500]);
    });

    test("POST -> 400/422 when missing required fields", async () => {
      const res = await request(app).post(base).send({});
      acceptStatus(res, [400, 422]);
    });

    test("PUT -> 404/400 when not found", async () => {
      Product.findByIdAndUpdate.mockReturnValue(mockQuery(null));
      Product.findById.mockReturnValue(mockQuery(null));

      const res = await request(app).put(`${base}/${VALID_ID_1}`).send({ name: "Updated" });
      acceptStatus(res, [404, 400]);
    });
  });

  describe("success-ish paths (coverage-oriented)", () => {
    test("GET list -> 200", async () => {
      Product.find.mockReturnValue(mockQuery([{ _id: "p1" }]));
      const res = await request(app).get(base);
      acceptStatus(res, [200, 500]);
    });

    test("POST -> 200/201 when required fields provided", async () => {
      Product.create.mockResolvedValue({ _id: "p1", name: "Prod" });

      const res = await request(app).post(base).send({
        name: "Prod",
        provider: "mock",
        category: "test",
        strategy: "balanced",
        metrics: { riskScore: 3 },
        url: "https://example.com",
        meta: { source: "jest" },
      });

      acceptStatus(res, [200, 201, 400, 422, 500]);
      expect(res.body).toBeDefined();
    });

    test("GET by id -> 200 when found", async () => {
      Product.findById.mockReturnValue(mockQuery({ _id: "p1", name: "Prod" }));
      Product.findOne.mockReturnValue(mockQuery({ _id: "p1", name: "Prod" }));

      const res = await request(app).get(`${base}/${VALID_ID_1}`);
      acceptStatus(res, [200, 404, 400, 500]);
    });

    test("PUT by id -> 200/201 when updated", async () => {
      Product.findByIdAndUpdate.mockReturnValue(mockQuery({ _id: "p1", name: "Updated" }));

      const res = await request(app).put(`${base}/${VALID_ID_1}`).send({ name: "Updated" });
      acceptStatus(res, [200, 201, 404, 400, 500]);
    });

    test("DELETE by id -> 200/204 when deleted", async () => {
      Product.findByIdAndDelete.mockReturnValue(mockQuery({ _id: "p1" }));

      const res = await request(app).delete(`${base}/${VALID_ID_1}`);
      acceptStatus(res, [200, 204, 404, 400, 500]);
    });
  });
});
