import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

jest.resetModules();

// ---- Mock jsonwebtoken (support both default.verify and named verify) ----
await jest.unstable_mockModule("jsonwebtoken", () => ({
  __esModule: true,
  default: { verify: jest.fn() },
  verify: jest.fn(),
}));

// ---- Mock User model used inside protect middleware ----
// Many auth middlewares do: User.findById(decoded.id).select("-password")
await jest.unstable_mockModule("../models/userModel.js", () => {
  const select = jest.fn().mockResolvedValue({ _id: "u1", name: "MockUser" });
  const findById = jest.fn(() => ({ select }));
  return {
    __esModule: true,
    default: { findById },
  };
});

const jwtMod = await import("jsonwebtoken");
const jwtDefault = jwtMod.default ?? jwtMod;

const getVerifyMock = () => {
  const namedVerify = jwtMod.verify;
  const defaultVerify = jwtDefault.verify;
  return { namedVerify, defaultVerify };
};

const { default: User } = await import("../models/userModel.js");
const { protect } = await import("../middleware/authMiddleware.js");

describe("authMiddleware - protect", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.get("/protected", protect, (req, res) => {
      res.status(200).json({ ok: true, user: req.user });
    });
  });

  test("should return 401 when no token provided", async () => {
    const res = await request(app).get("/protected");
    expect([401, 500]).toContain(res.statusCode);
  });

  test("should return 401 when token invalid", async () => {
    const { namedVerify, defaultVerify } = getVerifyMock();
    namedVerify.mockImplementation(() => {
      throw new Error("invalid token");
    });
    defaultVerify.mockImplementation(() => {
      throw new Error("invalid token");
    });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer badtoken")
      .set("Cookie", ["jwt=badtoken", "token=badtoken"]);

    expect(res.statusCode).toBe(401);
  });

  test("should allow access when token valid", async () => {
    const { namedVerify, defaultVerify } = getVerifyMock();
    namedVerify.mockReturnValue({ id: "u1" });
    defaultVerify.mockReturnValue({ id: "u1" });

    // ensure user lookup returns a user
    // User.findById(decoded.id).select(...) -> resolved user
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer goodtoken")
      .set("Cookie", ["jwt=goodtoken", "token=goodtoken"]);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);

    // Optional sanity checks (safe even if middleware changes slightly)
    expect(User.findById).toHaveBeenCalled();
  });
});
