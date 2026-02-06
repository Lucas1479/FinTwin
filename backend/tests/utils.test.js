/**
 * tests/utils.test.js
 * Utility functions tests - error handling and helpers
 */
import { jest, describe, test, expect } from "@jest/globals";

jest.resetModules();

// No DB mocking needed for pure utility functions
const {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  AppError,
} = await import("../utils/errors.js");

describe("Error Utilities", () => {
  describe("BadRequestError", () => {
    test("should create BadRequestError with message", () => {
      const error = new BadRequestError("Invalid input");

      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error).toBeInstanceOf(Error);
    });

    test("should have correct status code", () => {
      const error = new BadRequestError("Test");

      expect(error.statusCode).toBe(400);
    });

    test("should preserve stack trace", () => {
      const error = new BadRequestError("Test error");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("Test error");
    });
  });

  describe("NotFoundError", () => {
    test("should create NotFoundError with message", () => {
      const error = new NotFoundError("Resource not found");

      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error).toBeInstanceOf(Error);
    });

    test("should have correct status code", () => {
      const error = new NotFoundError("Not found");

      expect(error.statusCode).toBe(404);
    });

    test("should work with dynamic messages", () => {
      const resourceId = "user123";
      const error = new NotFoundError(`User ${resourceId} not found`);

      expect(error.message).toContain("user123");
    });
  });

  describe("ForbiddenError", () => {
    test("should create ForbiddenError with message", () => {
      const error = new ForbiddenError("Access forbidden");

      expect(error.message).toBe("Access forbidden");
      expect(error.statusCode).toBe(403);
    });

    test("should have correct status code", () => {
      const error = new ForbiddenError("No permission");

      expect(error.statusCode).toBe(403);
    });

    test("should handle custom messages", () => {
      const error = new ForbiddenError("User not authorized for this resource");

      expect(error.message).toContain("not authorized");
    });
  });

  describe("UnauthorizedError", () => {
    test("should create UnauthorizedError with message", () => {
      const error = new UnauthorizedError("Not authorized");

      expect(error.message).toBe("Not authorized");
      expect(error.statusCode).toBe(401);
    });

    test("should have correct status code", () => {
      const error = new UnauthorizedError("Invalid token");

      expect(error.statusCode).toBe(401);
    });
  });

  describe("Error Throwing and Catching", () => {
    test("should throw and catch BadRequestError", () => {
      expect(() => {
        throw new BadRequestError("Bad request");
      }).toThrow("Bad request");
    });

    test("should throw and catch NotFoundError", () => {
      expect(() => {
        throw new NotFoundError("Not found");
      }).toThrow("Not found");
    });

    test("should differentiate between error types", () => {
      const badRequest = new BadRequestError("Bad");
      const notFound = new NotFoundError("Not found");

      expect(badRequest.statusCode).not.toBe(notFound.statusCode);
      expect(badRequest.statusCode).toBe(400);
      expect(notFound.statusCode).toBe(404);
    });
  });

  describe("Error Properties", () => {
    test("should have name property", () => {
      const error = new BadRequestError("Test");

      // Error name should be the class name or Error
      expect(error.name).toBeDefined();
    });

    test("should be catchable as generic Error", () => {
      try {
        throw new NotFoundError("Test");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(404);
      }
    });

    test("should preserve error context", () => {
      const context = { field: "email", value: "invalid" };
      const error = new BadRequestError(
        `Invalid ${context.field}: ${context.value}`,
      );

      expect(error.message).toContain("email");
      expect(error.message).toContain("invalid");
    });
  });

  describe("Real-world Usage Scenarios", () => {
    test("should handle goal not found", () => {
      const goalId = "goal123";
      const error = new NotFoundError(`Goal with ID ${goalId} not found`);

      expect(error.statusCode).toBe(404);
      expect(error.message).toContain("goal123");
    });

    test("should handle invalid goal data", () => {
      const error = new BadRequestError(
        "Target amount must be greater than 0",
      );

      expect(error.statusCode).toBe(400);
      expect(error.message).toContain("Target amount");
    });

    test("should handle validation errors with details", () => {
      const validationErrors = [
        "goal_name is required",
        "target_amount must be positive",
        "due_date must be in the future",
      ];
      const error = new BadRequestError(
        `Validation failed: ${validationErrors.join("; ")}`,
      );

      expect(error.statusCode).toBe(400);
      expect(error.message).toContain("goal_name");
      expect(error.message).toContain("target_amount");
      expect(error.message).toContain("due_date");
    });

    test("should handle unauthorized access attempts", () => {
      const error = new UnauthorizedError(
        "Invalid or expired authentication token",
      );

      expect(error.statusCode).toBe(401);
      expect(error.message).toContain("token");
    });
  });

  describe("Error Message Formatting", () => {
    test("should handle empty message", () => {
      const error = new BadRequestError("");

      expect(error.message).toBe("");
      expect(error.statusCode).toBe(400);
    });

    test("should handle very long messages", () => {
      const longMessage = "Error: " + "x".repeat(1000);
      const error = new BadRequestError(longMessage);

      expect(error.message.length).toBeGreaterThan(1000);
      expect(error.statusCode).toBe(400);
    });

    test("should handle special characters in messages", () => {
      const error = new BadRequestError("Invalid email: user@domain.com");

      expect(error.message).toContain("@");
      expect(error.message).toContain(".");
    });

    test("should handle unicode characters", () => {
      const error = new BadRequestError("错误：无效的输入");

      expect(error.message).toContain("错误");
      expect(error.statusCode).toBe(400);
    });
  });
});
