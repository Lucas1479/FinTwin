// tests/setup.js
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

jest.mock("../services/llmService.js", () => ({
  __esModule: true,
  default: {
    generate: jest.fn(async () => ({
      provider: "mock",
      text: "mock decision",
      json: { ok: true },
      raw: null,
    })),
    generateWithTools: jest.fn(async () => ({
      provider: "mock",
      text: "mock decision with tools",
      json: { ok: true, toolCalls: [] },
      toolCalls: [],
      raw: null,
    })),
  },
}));

let mongo;

beforeAll(async () => {
  // Start an in-memory MongoDB instance for Jest
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  // Connect mongoose to the in-memory DB
  await mongoose.connect(uri, {
    dbName: "jest",
  });
});

afterEach(async () => {
  // Clean the in-memory DB between tests (ONLY the in-memory one)
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
});

afterAll(async () => {
  // Disconnect and stop the in-memory DB
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
