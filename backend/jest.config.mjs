// backend/jest.config.mjs
export default {
  testEnvironment: "node",

  testMatch: ["**/tests/**/*.test.js", "**/Tests/**/*.test.js"],

  setupFilesAfterEnv: ["<rootDir>/Tests/setup.js"],

  transform: {},
  moduleFileExtensions: ["js", "json"],
};
