import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import CashFlow from '../models/cashFlowModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

connectDB();

const seedData = async () => {
  try {
    const email = 'Lullaby147@demo.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user._id})`);

    // Clear existing data (Commented out to support "Create" mode)
    // await CashFlow.deleteMany({ user_id: user._id });
    console.log('Adding new Cash Flow data (existing ones preserved)');

    // Seed Data
    const cashFlows = [
      // --- Income ---
      {
        user_id: user._id,
        name: 'Senior Dev Salary',
        amount: 8500,
        type: 'Income',
        category: 'Salary',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 15, // 15th of month
        is_variable: false,
      },
      {
        user_id: user._id,
        name: 'Tech Blog Revenue',
        amount: 450,
        type: 'Income',
        category: 'Side Hustle',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 20, // 20th of month
        is_variable: true,
      },
      {
        user_id: user._id,
        name: 'Dividends (US Stocks)',
        amount: 120,
        type: 'Income',
        category: 'Investment',
        frequency: 'Monthly',
        timing_mode: 'Daily_Spread', // Accrues daily technically? Or specific date? Let's say variable date
        anchor_date: 1,
        is_variable: true,
      },

      // --- Expenses (Fixed) ---
      {
        user_id: user._id,
        name: 'Rent - City Apt',
        amount: 650, // Changed to Weekly to demonstrate weekly logic
        type: 'Expense',
        category: 'Housing',
        frequency: 'Weekly',
        timing_mode: 'Specific_Date',
        anchor_date: 2, // Tuesday
        is_variable: false,
      },
      {
        user_id: user._id,
        name: 'Power & Internet',
        amount: 220,
        type: 'Expense',
        category: 'Utilities',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 25, // 25th due date
        is_variable: true,
      },
      {
        user_id: user._id,
        name: 'Car Insurance',
        amount: 85,
        type: 'Expense',
        category: 'Insurance',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 1, // 1st of month
        is_variable: false,
      },

      // --- Expenses (Budget/Variable - Daily Spread) ---
      {
        user_id: user._id,
        name: 'Groceries Budget',
        amount: 800,
        type: 'Expense',
        category: 'Living',
        frequency: 'Monthly',
        timing_mode: 'Daily_Spread',
        is_variable: true,
      },
      {
        user_id: user._id,
        name: 'Transport / Fuel',
        amount: 300,
        type: 'Expense',
        category: 'Transport',
        frequency: 'Monthly',
        timing_mode: 'Daily_Spread',
        is_variable: true,
      },
      {
        user_id: user._id,
        name: 'Dining Out',
        amount: 400,
        type: 'Expense',
        category: 'Entertainment',
        frequency: 'Monthly',
        timing_mode: 'Daily_Spread',
        is_variable: true,
      },

      // --- Subscriptions ---
      {
        user_id: user._id,
        name: 'Netflix Premium',
        amount: 24.99,
        type: 'Subscription',
        category: 'Entertainment',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 5,
      },
      {
        user_id: user._id,
        name: 'Spotify Duo',
        amount: 19.99,
        type: 'Subscription',
        category: 'Entertainment',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 2,
      },
      {
        user_id: user._id,
        name: 'ChatGPT Plus',
        amount: 35.00,
        type: 'Subscription',
        category: 'Productivity',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 28,
      },
      {
        user_id: user._id,
        name: 'Gym Membership',
        amount: 60.00,
        type: 'Subscription',
        category: 'Health',
        frequency: 'Fortnightly',
        timing_mode: 'Specific_Date',
        start_date: new Date(), // Starts now
      },
      {
        user_id: user._id,
        name: 'AWS Bill',
        amount: 45.50,
        type: 'Subscription',
        category: 'Tech',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 10,
        is_variable: true,
      }
    ];

    await CashFlow.insertMany(cashFlows);
    console.log(`Successfully imported ${cashFlows.length} cash flow items with Time Granularity!`);
    
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

seedData();
