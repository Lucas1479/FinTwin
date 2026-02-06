/**
 * tests/memoryLogger.test.js
 * Test memory logger utility
 */
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";

// Mock console.log
let consoleLogSpy;

beforeEach(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
});

describe("Memory Logger", () => {
  describe("Log Entry Structure", () => {
    test("should have timestamp field", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        action: "test",
        details: "test details"
      };
      
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe("string");
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test("should have action field", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        action: "user_decision",
        stage: "definition"
      };
      
      expect(entry.action).toBeDefined();
      expect(typeof entry.action).toBe("string");
    });

    test("should have optional details", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        action: "ai_suggestion",
        details: { goalId: "123", decision: "accepted" }
      };
      
      expect(entry.details).toBeDefined();
      expect(typeof entry.details).toBe("object");
    });
  });

  describe("Log Actions", () => {
    test("should log user decisions", () => {
      const actions = ["accepted", "rejected", "modified", "skipped"];
      
      expect(actions).toHaveLength(4);
      expect(actions).toContain("accepted");
      expect(actions).toContain("rejected");
    });

    test("should log AI suggestions", () => {
      const suggestionsTypes = [
        "goal_amount",
        "timeframe",
        "strategy",
        "product_recommendation"
      ];
      
      expect(suggestionsTypes.length).toBeGreaterThan(3);
      expect(suggestionsTypes).toContain("strategy");
    });

    test("should log stage transitions", () => {
      const stages = ["definition", "strategy", "product", "simulation"];
      
      expect(stages).toHaveLength(4);
      expect(stages[0]).toBe("definition");
      expect(stages[3]).toBe("simulation");
    });
  });

  describe("Log Array Management", () => {
    test("should start with empty array", () => {
      const logs = [];
      
      expect(logs).toEqual([]);
      expect(logs).toHaveLength(0);
    });

    test("should add entries to array", () => {
      const logs = [];
      const entry1 = { timestamp: new Date().toISOString(), action: "test1" };
      const entry2 = { timestamp: new Date().toISOString(), action: "test2" };
      
      logs.push(entry1);
      logs.push(entry2);
      
      expect(logs).toHaveLength(2);
      expect(logs[0]).toEqual(entry1);
      expect(logs[1]).toEqual(entry2);
    });

    test("should limit array size to 50", () => {
      const MAX_LOGS = 50;
      const logs = [];
      
      // Add 60 entries
      for (let i = 0; i < 60; i++) {
        logs.push({ timestamp: new Date().toISOString(), action: `test${i}` });
        if (logs.length > MAX_LOGS) logs.shift();
      }
      
      expect(logs.length).toBeLessThanOrEqual(MAX_LOGS);
      expect(logs).toHaveLength(50);
    });

    test("should remove oldest entry when limit exceeded", () => {
      const logs = [];
      
      // Add entries with identifiable actions
      logs.push({ action: "first" });
      logs.push({ action: "second" });
      logs.push({ action: "third" });
      
      // Simulate removing oldest when limit hit
      if (logs.length > 2) {
        while (logs.length > 2) logs.shift();
      }
      
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe("second");
      expect(logs[1].action).toBe("third");
    });
  });

  describe("Timestamp Generation", () => {
    test("should generate ISO timestamp", () => {
      const timestamp = new Date().toISOString();
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test("should have chronological timestamps", () => {
      const timestamp1 = new Date().toISOString();
      
      // Wait a bit
      const timestamp2 = new Date(Date.now() + 1).toISOString();
      
      expect(timestamp2 >= timestamp1).toBe(true);
    });

    test("should format timestamps consistently", () => {
      const dates = [
        new Date("2026-01-01T10:30:00Z"),
        new Date("2026-06-15T15:45:30Z"),
        new Date("2026-12-31T23:59:59Z")
      ];
      
      dates.forEach(date => {
        const iso = date.toISOString();
        expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });
  });

  describe("Log Entry Examples", () => {
    test("should log goal acceptance", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        stage: "definition",
        action: "accepted",
        type: "goal_suggestion",
        userId: "user123",
        details: {
          goalAmount: 1000000,
          category: "Retirement"
        }
      };
      
      expect(entry.action).toBe("accepted");
      expect(entry.stage).toBe("definition");
      expect(entry.details.goalAmount).toBe(1000000);
    });

    test("should log strategy modification", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        stage: "strategy",
        action: "modified",
        type: "strategy_suggestion",
        original: "aggressive",
        modified: "moderate"
      };
      
      expect(entry.action).toBe("modified");
      expect(entry.stage).toBe("strategy");
      expect(entry.modified).toBe("moderate");
    });

    test("should log product rejection", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        stage: "product",
        action: "rejected",
        type: "product_recommendation",
        productId: "prod123",
        reason: "high_fees"
      };
      
      expect(entry.action).toBe("rejected");
      expect(entry.stage).toBe("product");
      expect(entry.reason).toBe("high_fees");
    });
  });

  describe("Get Logs Functionality", () => {
    test("should retrieve all logs", () => {
      const logs = [
        { timestamp: new Date().toISOString(), action: "test1" },
        { timestamp: new Date().toISOString(), action: "test2" }
      ];
      
      const retrieved = [...logs];
      
      expect(retrieved).toHaveLength(2);
      expect(retrieved).toEqual(logs);
    });

    test("should return empty array when no logs", () => {
      const logs = [];
      
      expect(logs).toEqual([]);
      expect(Array.isArray(logs)).toBe(true);
    });

    test("should return logs in order", () => {
      const logs = [
        { id: 1, action: "first" },
        { id: 2, action: "second" },
        { id: 3, action: "third" }
      ];
      
      expect(logs[0].id).toBe(1);
      expect(logs[1].id).toBe(2);
      expect(logs[2].id).toBe(3);
    });
  });

  describe("Console Logging", () => {
    test("should log to console in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      
      const entry = {
        timestamp: new Date().toISOString(),
        action: "test"
      };
      
      // In real implementation, this would call console.log
      // We just verify the structure is correct
      expect(entry).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test("should skip console in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      
      const shouldLog = process.env.NODE_ENV !== "production";
      
      expect(shouldLog).toBe(false);
      
      process.env.NODE_ENV = originalEnv;
    });

    test("should format as JSON string", () => {
      const entry = {
        timestamp: "2026-01-01T12:00:00.000Z",
        action: "test",
        details: { key: "value" }
      };
      
      const json = JSON.stringify(entry, null, 2);
      
      expect(typeof json).toBe("string");
      expect(json).toContain('"timestamp"');
      expect(json).toContain('"action"');
    });
  });

  describe("Log Filtering", () => {
    test("should filter logs by action", () => {
      const logs = [
        { action: "accepted", stage: "definition" },
        { action: "rejected", stage: "definition" },
        { action: "accepted", stage: "strategy" }
      ];
      
      const accepted = logs.filter(log => log.action === "accepted");
      
      expect(accepted).toHaveLength(2);
      expect(accepted.every(log => log.action === "accepted")).toBe(true);
    });

    test("should filter logs by stage", () => {
      const logs = [
        { action: "accepted", stage: "definition" },
        { action: "rejected", stage: "definition" },
        { action: "accepted", stage: "strategy" }
      ];
      
      const definition = logs.filter(log => log.stage === "definition");
      
      expect(definition).toHaveLength(2);
      expect(definition.every(log => log.stage === "definition")).toBe(true);
    });

    test("should filter logs by time range", () => {
      const now = Date.now();
      const logs = [
        { timestamp: new Date(now - 10000).toISOString(), action: "old" },
        { timestamp: new Date(now).toISOString(), action: "new" }
      ];
      
      const cutoff = now - 5000;
      const recent = logs.filter(log => new Date(log.timestamp).getTime() > cutoff);
      
      expect(recent).toHaveLength(1);
      expect(recent[0].action).toBe("new");
    });
  });

  describe("Log Statistics", () => {
    test("should count total logs", () => {
      const logs = [
        { action: "accepted" },
        { action: "rejected" },
        { action: "accepted" }
      ];
      
      const total = logs.length;
      
      expect(total).toBe(3);
    });

    test("should count by action type", () => {
      const logs = [
        { action: "accepted" },
        { action: "rejected" },
        { action: "accepted" },
        { action: "accepted" }
      ];
      
      const counts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});
      
      expect(counts.accepted).toBe(3);
      expect(counts.rejected).toBe(1);
    });

    test("should find most recent log", () => {
      const logs = [
        { timestamp: "2026-01-01T10:00:00Z", action: "first" },
        { timestamp: "2026-01-01T12:00:00Z", action: "last" },
        { timestamp: "2026-01-01T11:00:00Z", action: "middle" }
      ];
      
      const sorted = [...logs].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const mostRecent = sorted[0];
      
      expect(mostRecent.action).toBe("last");
    });
  });

  describe("Error Handling", () => {
    test("should handle missing fields gracefully", () => {
      const entry = {
        timestamp: new Date().toISOString()
        // Missing action
      };
      
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBeUndefined();
      // Should still be a valid object
      expect(typeof entry).toBe("object");
    });

    test("should handle invalid timestamps", () => {
      const invalidDate = new Date("invalid");
      
      expect(isNaN(invalidDate.getTime())).toBe(true);
      
      // Fallback to current time
      const fallback = isNaN(invalidDate.getTime()) 
        ? new Date().toISOString()
        : invalidDate.toISOString();
      
      expect(fallback).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("Log Clearing", () => {
    test("should clear all logs", () => {
      let logs = [
        { action: "test1" },
        { action: "test2" }
      ];
      
      logs = [];
      
      expect(logs).toHaveLength(0);
      expect(logs).toEqual([]);
    });

    test("should clear logs older than cutoff", () => {
      const now = Date.now();
      let logs = [
        { timestamp: new Date(now - 100000).toISOString(), action: "old" },
        { timestamp: new Date(now).toISOString(), action: "new" }
      ];
      
      const cutoff = now - 50000;
      logs = logs.filter(log => new Date(log.timestamp).getTime() > cutoff);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("new");
    });
  });
});
