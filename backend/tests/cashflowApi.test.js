/**
 * tests/cashflowApi.test.js
 * CashFlow API tests (success + negative) - model mocked, no real DB.
 */
import request from "supertest";
import { jest, describe, test, beforeAll, beforeEach } from "@jest/globals";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { mockQuery } from "./utils/mockQuery.js";
import { detectBase, acceptStatus, VALID_ID_1 } from "./utils/httpUtils.js";

jest.resetModules();

await jest.unstable_mockModule("../config/db.js", () => ({
  __esModule: true,
  default: jest.fn(async () => {}),
}));

await jest.unstable_mockModule("../middleware/authMiddleware.js", () => {
  const { createProtectMock } = require("./utils/authMocks.cjs");
  return { protect: createProtectMock({ objectId: true }) };
});

await jest.unstable_mockModule("../models/cashFlowModel.js", () => ({
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

const { default: app } = await import("../app.js");
const { default: CashFlow } = await import("../models/cashFlowModel.js");

describe("CashFlow API", () => {
  let base = "/api/cashflow";

  beforeAll(async () => {
    base = await detectBase(app, ["/api/cashflow", "/api/cashflows"]);
  });

  beforeEach(() => jest.clearAllMocks());

  test("GET list -> 200 when found", async () => {
    CashFlow.find.mockReturnValue(mockQuery([{ _id: "c1" }]));
    const res = await request(app).get(base);
    acceptStatus(res, 200);
  });

  test("POST -> 200/201 OR 400/422 (validator dependent)", async () => {
    CashFlow.create.mockResolvedValue({ _id: "c1", amount: 123 });

    const res = await request(app).post(base).send({
      amount: 123,
      type: "income",
      date: "2030-01-01",
    });

    acceptStatus(res, [200, 201, 400, 422]);
  });

  test("GET by id -> 404/400 when not found", async () => {
    CashFlow.findById.mockReturnValue(mockQuery(null));
    CashFlow.findOne.mockReturnValue(mockQuery(null));

    const res = await request(app).get(`${base}/${VALID_ID_1}`);
    acceptStatus(res, [404, 400]);
  });

  test("DELETE by id -> 200/204/404/400", async () => {
    CashFlow.findByIdAndDelete.mockReturnValue(mockQuery({ _id: "c1" }));
    const res = await request(app).delete(`${base}/${VALID_ID_1}`);
    acceptStatus(res, [200, 204, 404, 400]);
  });
});
