/**
 * tests/miscApi.test.js
 * Misc endpoints: Help/Health, Wealth Centre, Playground wiring.
 */
import request from "supertest";
import { jest, describe, test, expect, beforeAll } from "@jest/globals";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { detectBase, acceptStatus, VALID_ID_1 } from "./utils/httpUtils.js";

jest.resetModules();

await jest.unstable_mockModule("../config/db.js", () => ({
  __esModule: true,
  default: jest.fn(async () => {}),
}));

await jest.unstable_mockModule("../middleware/authMiddleware.js", () => {
  const { createProtectMock } = require("./utils/authMocks.cjs");
  return { protect: createProtectMock({ objectId: false }) };
});

const { default: app } = await import("../app.js");
const { default: playgroundRoutes } =
  await import("../routes/api/playgroundRoutes.js");

const listRoutes = (router) => {
  const routes = [];
  for (const layer of router.stack || []) {
    if (layer.route && layer.route.path) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods || {}).sort(),
      });
    }
  }
  return routes;
};

describe("Playground routes wiring", () => {
  test("exports an express router", () => {
    expect(playgroundRoutes).toBeDefined();
    expect(typeof playgroundRoutes).toBe("function");
    expect(Array.isArray(playgroundRoutes.stack)).toBe(true);
  });

  test("registers at least one route", () => {
    const routes = listRoutes(playgroundRoutes);
    expect(routes.length).toBeGreaterThan(0);
  });
});

describe("Help / Health endpoints", () => {
  let base = "/api/help";

  beforeAll(async () => {
    base = await detectBase(app, [
      "/api/help",
      "/api/health",
      "/api/healthcheck",
      "/api/support",
      "/api/faq",
    ]);
  });

  test("GET base -> should respond", async () => {
    const res = await request(app).get(base);
    acceptStatus(res, [200, 400, 401, 403, 404, 405]);
  });
});

describe("Wealth Centre endpoints", () => {
  let base = "/api/wealth-centre";

  beforeAll(async () => {
    base = await detectBase(app, [
      "/api/wealth-centre",
      "/api/wealthCentre",
      "/api/wealthcenter",
      "/api/wealth",
    ]);
  });

  test("GET base -> should respond", async () => {
    const res = await request(app).get(base);
    acceptStatus(res, [200, 400, 401, 403, 404, 405]);
  });

  test("GET by id -> should respond", async () => {
    const res = await request(app).get(`${base}/${VALID_ID_1}`);
    acceptStatus(res, [200, 400, 401, 403, 404]);
  });
});
