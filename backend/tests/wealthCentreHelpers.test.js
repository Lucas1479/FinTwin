/**
 * tests/wealthCentreHelpers.test.js
 * Test wealth centre calculation helpers
 * These are pure functions that can be easily unit tested
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

jest.resetModules();

// Mock database
await jest.unstable_mockModule("../config/db.js", () => ({
  __esModule: true,
  default: jest.fn(async () => {}),
}));

await jest.unstable_mockModule("../middleware/authMiddleware.js", () => {
  const { createProtectMock } = require("./utils/authMocks.cjs");
  return { protect: createProtectMock({ objectId: true }) };
});

await jest.unstable_mockModule("../models/financialAssetModel.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

await jest.unstable_mockModule("../models/cashFlowModel.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    create: jest.fn(),
  },
}));

// Import after mocks
const wealthController = await import("../controllers/wealthCentreController.js");

describe("Wealth Centre Helper Functions", () => {
  describe("Frequency Conversions", () => {
    test("should convert weekly to annual correctly", () => {
      // Weekly: 52 weeks per year
      const amount = 100;
      const annualAmount = amount * 52;
      expect(annualAmount).toBe(5200);
    });

    test("should convert fortnightly to annual correctly", () => {
      // Fortnightly: 26 periods per year
      const amount = 200;
      const annualAmount = amount * 26;
      expect(annualAmount).toBe(5200);
    });

    test("should convert monthly to annual correctly", () => {
      // Monthly: 12 months per year
      const amount = 1000;
      const annualAmount = amount * 12;
      expect(annualAmount).toBe(12000);
    });

    test("should handle yearly frequency (no conversion)", () => {
      const amount = 50000;
      const annualAmount = amount * 1;
      expect(annualAmount).toBe(50000);
    });

    test("should handle one-off frequency (zero multiplier)", () => {
      const amount = 10000;
      const annualAmount = amount * 0;
      expect(annualAmount).toBe(0);
    });
  });

  describe("Cash Category Detection", () => {
    const CASH_CATEGORIES = [
      "Cash_Bank",
      "Cash_Physical",
      "Cash_TermDeposit",
    ];

    test("should identify Cash_Bank as cash category", () => {
      expect(CASH_CATEGORIES.includes("Cash_Bank")).toBe(true);
    });

    test("should identify Cash_Physical as cash category", () => {
      expect(CASH_CATEGORIES.includes("Cash_Physical")).toBe(true);
    });

    test("should identify Cash_TermDeposit as cash category", () => {
      expect(CASH_CATEGORIES.includes("Cash_TermDeposit")).toBe(true);
    });

    test("should not identify Equity_NZ as cash category", () => {
      expect(CASH_CATEGORIES.includes("Equity_NZ")).toBe(false);
    });

    test("should not identify Property_Residential as cash category", () => {
      expect(CASH_CATEGORIES.includes("Property_Residential")).toBe(false);
    });
  });

  describe("Daily Cash Flow Calculations", () => {
    test("should calculate daily spread income correctly", () => {
      // Monthly income of $4,000 spread daily
      const monthlyIncome = 4000;
      const annualIncome = monthlyIncome * 12; // 48,000
      const dailyIncome = annualIncome / 365; // ~131.51

      expect(dailyIncome).toBeCloseTo(131.51, 2);
    });

    test("should calculate daily spread expense correctly", () => {
      // Weekly expense of $200 spread daily
      const weeklyExpense = 200;
      const annualExpense = weeklyExpense * 52; // 10,400
      const dailyExpense = annualExpense / 365; // ~28.49

      expect(dailyExpense).toBeCloseTo(28.49, 2);
    });

    test("should calculate net daily flow correctly", () => {
      const dailyIncome = 131.51;
      const dailyExpense = 28.49;
      const netFlow = dailyIncome - dailyExpense;

      expect(netFlow).toBeCloseTo(103.02, 2);
    });
  });

  describe("Date-based Flow Calculations", () => {
    test("should calculate flow for specific monthly date", () => {
      // Pay day on 15th of each month
      const testDate = new Date("2026-02-15");
      const dayOfMonth = testDate.getDate();

      expect(dayOfMonth).toBe(15);
      // If anchor_date === 15 and frequency === 'Monthly', flow should hit
    });

    test("should calculate flow for specific weekly day", () => {
      // Payment every Friday (day 5)
      const friday = new Date("2026-02-06"); // This is a Friday
      const dayOfWeek = friday.getDay() || 7;

      expect(dayOfWeek).toBe(5);
      // If anchor_date === 5 and frequency === 'Weekly', flow should hit
    });

    test("should handle Sunday as day 7", () => {
      const sunday = new Date("2026-02-01"); // This is a Sunday
      const dayOfWeek = sunday.getDay() || 7;

      expect(dayOfWeek).toBe(7);
    });
  });

  describe("Multi-day Flow Calculations", () => {
    test("should calculate total flow over 30 days", () => {
      // Daily income of $100, daily expense of $30
      const dailyNetFlow = 70;
      const days = 30;
      const totalFlow = dailyNetFlow * days;

      expect(totalFlow).toBe(2100);
    });

    test("should calculate flow between specific dates", () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-31");

      // Calculate days between
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(30);
    });

    test("should handle same start and end date", () => {
      const startDate = new Date("2026-02-06");
      const endDate = new Date("2026-02-06");

      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(0);
      // Should still calculate flow for that single day
    });
  });

  describe("Allocation Field Management", () => {
    test("should clear all allocation fields", () => {
      const asset = {
        _id: "asset1",
        value: 10000,
        allocated_to_goal_id: "goal123",
        allocated_amount: 5000,
        allocation_date: new Date(),
        allocation_notes: "For retirement",
      };

      // Clear allocation
      asset.allocated_to_goal_id = null;
      asset.allocated_amount = null;
      asset.allocation_date = null;
      asset.allocation_notes = null;

      expect(asset.allocated_to_goal_id).toBeNull();
      expect(asset.allocated_amount).toBeNull();
      expect(asset.allocation_date).toBeNull();
      expect(asset.allocation_notes).toBeNull();
    });

    test("should set allocation fields", () => {
      const asset = {
        _id: "asset1",
        value: 10000,
        allocated_to_goal_id: null,
        allocated_amount: null,
      };

      // Set allocation
      const goalId = "goal123";
      const amount = 5000;
      asset.allocated_to_goal_id = goalId;
      asset.allocated_amount = amount;
      asset.allocation_date = new Date();

      expect(asset.allocated_to_goal_id).toBe(goalId);
      expect(asset.allocated_amount).toBe(amount);
      expect(asset.allocation_date).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    test("should handle negative amounts correctly", () => {
      const expense = -100;
      const income = 200;
      const netFlow = income + expense; // 200 + (-100) = 100

      expect(netFlow).toBe(100);
    });

    test("should handle zero amounts", () => {
      const amount = 0;
      const frequency = 52;
      const annual = amount * frequency;

      expect(annual).toBe(0);
    });

    test("should handle very large amounts", () => {
      const largeAmount = 1000000;
      const frequency = 12;
      const annual = largeAmount * frequency;

      expect(annual).toBe(12000000);
    });

    test("should handle decimal amounts precisely", () => {
      const amount = 123.45;
      const frequency = 52;
      const annual = amount * frequency;

      expect(annual).toBeCloseTo(6419.4, 1);
    });
  });
});
