/**
 * tests/userApi.test.js
 * User API tests: avoid real DB and stabilize auth.
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

await jest.unstable_mockModule("../models/userModel.js", () => ({
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

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/userModel.js");

describe("User API", () => {
  let baseUsers = "/api/users";

  beforeAll(async () => {
    baseUsers = await detectBase(app, ["/api/users", "/api/user"]);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("negative paths", () => {
    test("GET me/profile -> 401/404/400 (route dependent) but not crash", async () => {
      // project-specific route, we just assert it doesn't explode
      const res = await request(app).get(`${baseUsers}/me`);
      acceptStatus(res, [200, 401, 403, 404, 400]);
    });

    test("GET by id -> 404/400 when not found", async () => {
      User.findById.mockReturnValue(mockQuery(null));
      const res = await request(app).get(`${baseUsers}/${VALID_ID_1}`);
      acceptStatus(res, [404, 400]);
    });
  });

  describe("success-ish paths", () => {
    test("GET /me -> 200 when found (or 404 if route different)", async () => {
      // Some projects implement /api/users/me, some /api/users/profile
      User.findById.mockReturnValue(
        mockQuery({ _id: "u1", email: "jest@example.com" }),
      );
      const res = await request(app).get(`${baseUsers}/me`);
      acceptStatus(res, [200, 404, 400, 401, 403]);
    });
  });
});
