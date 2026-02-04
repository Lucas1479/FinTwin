// backend/tests/setup.js
// Test-global setup for Jest (ESM-friendly)

import { jest } from "@jest/globals";

// Keep tests fast + predictable
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

// Some controllers may read these
process.env.MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/__jest_should_not_be_used__";

// Reduce noise in output (you can comment this out when debugging)
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  jest.setTimeout(30000);

  // Silence noisy logs from controllers/middleware during tests
  console.error = (...args) => {
    const msg = String(args?.[0] ?? "");
    // keep unexpected errors visible if you want
    if (msg.includes("JestAssertionError")) return originalError(...args);
  };

  console.log = () => {};
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});
