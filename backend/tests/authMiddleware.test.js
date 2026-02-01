// tests/auth.middleware.test.js
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { protect } from "../middleware/authMiddleware.js";

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

/**
 * Mock a Mongoose Query:
 * - supports: await User.findById(...)
 * - supports: await User.findById(...).select(...)
 */
const mockQuery = (result) => {
  return {
    select: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
};

const buildTestApp = () => {
  const app = express();

  // a protected route
  app.get("/protected", protect, (req, res) => {
    res.status(200).json({ ok: true });
  });

  // error handler (so thrown Error becomes JSON with correct statusCode)
  app.use((err, req, res, next) => {
    const code =
      res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    res.status(code).json({ message: err.message || "Server Error" });
  });

  return app;
};

describe("Auth Middleware (protect)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.AUTH_BYPASS = "false"; // IMPORTANT: do not bypass in this test suite
  });

  test("should return 401 when Authorization header missing", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/protected");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("should return 401 for malformed Authorization header", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "invalid-header-value");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("should return 401 for invalid Bearer token", async () => {
    const app = buildTestApp();

    jwt.verify.mockImplementation(() => {
      throw new Error("invalid token");
    });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("should return 401 when token is valid but user not found", async () => {
    const app = buildTestApp();

    jwt.verify.mockReturnValue({ id: "507f191e810c19729de860ea" });

    // IMPORTANT: return a mongoose-like query
    User.findById.mockReturnValue(mockQuery(null));

    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-but-user-missing");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("should allow access when token valid and user exists", async () => {
    const app = buildTestApp();

    jwt.verify.mockReturnValue({ id: "507f191e810c19729de860ea" });

    // IMPORTANT: return a mongoose-like query
    User.findById.mockReturnValue(
      mockQuery({ _id: "507f191e810c19729de860ea", email: "a@b.com" })
    );

    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
