// backend/tests/utils/mockQuery.js
// A small helper to mock a Mongoose-like query chain in Jest.
// Supports: select(), sort(), skip(), limit(), populate(), lean(), exec(), then().
// Works in ESM Jest projects.

import { jest } from "@jest/globals";

export const mockQuery = (data) => {
  // We create the object first so methods can close over it.
  const q = {
    select: jest.fn(() => q),
    sort: jest.fn(() => q),
    skip: jest.fn(() => q),
    limit: jest.fn(() => q),
    populate: jest.fn(() => q),
    lean: jest.fn(() => q),
    exec: jest.fn(async () => data),

    // Allow `await Model.find()` style usage (thenable)
    then: (onFulfilled, onRejected) =>
      Promise.resolve(data).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(data).catch(onRejected),
    finally: (onFinally) => Promise.resolve(data).finally(onFinally),
  };

  return q;
};
