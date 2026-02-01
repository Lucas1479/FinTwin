export const VALID_ID_1 = "64b000000000000000000000";
export const VALID_ID_2 = "64b000000000000000000001";

export const acceptStatus = (res, allowed) => {
  expect(allowed).toContain(res.statusCode);
};

/**
 * Detect a working base route by trying candidates until not 404.
 */
export async function detectBase(app, candidates, { method = "get" } = {}) {
  for (const base of candidates) {
    const res = await (await import("supertest")).default(app)[method](base);
    if (res.statusCode !== 404) return base;
  }
  return candidates[0];
}
