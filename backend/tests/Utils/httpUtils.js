// tests/utils/httpUtils.js
import request from "supertest";

/**
 * Helper: accept multiple status codes
 */
export const acceptStatus = (res, allowed) => {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  expect(list).toContain(res.statusCode);
};

/**
 * Deterministic ObjectId-like strings for mocks
 */
export const VALID_ID_1 = "64b000000000000000000000";
export const VALID_ID_2 = "64b000000000000000000001";

/**
 *  detectBase(app, candidates, probePath?, method?)
 * Auto-detect which base route is actually mounted (not 404).
 *
 * HARDENED:
 * - Adds short timeout so route probing will not hang (e.g. DB buffering).
 * - Treats probe errors/timeouts as "not mounted".
 */
export const detectBase = async (
  app,
  candidates,
  probePath = "",
  method = "get",
) => {
  for (const base of candidates) {
    const url = `${base}${probePath}`;

    try {
      const req = request(app)[method](url);

      // Avoid long hangs (Mongoose buffering, external calls, etc.)
      // response: time waiting for first byte; deadline: total time
      req.timeout({ response: 1200, deadline: 1500 });

      const res = await req;

      // If not 404, assume this base exists
      if (res.statusCode !== 404) return base;
    } catch (e) {
      // timeout or any error => consider not mounted and continue
      continue;
    }
  }

  // Fall back to the first candidate
  return candidates[0];
};
