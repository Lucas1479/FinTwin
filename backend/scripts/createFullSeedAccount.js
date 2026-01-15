import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import FinancialAsset from '../models/financialAssetModel.js';
import CashFlow from '../models/cashFlowModel.js';
import Product from '../models/productModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedFullAccount = async (emailArg) => {
  await connectDB();

  try {
    const timestamp = Date.now();
    const email = emailArg || 'Lullaby147@demo.com';
    const name = 'Seed Test User';
    const password = 'password123';

    let user = await User.findOne({ email });

    if (!user) {
      console.log(`👤 Creating new user: ${name} (${email})`);
      user = await User.create({
        name,
        email,
        password,
      });
      console.log(`✅ User created with ID: ${user._id}`);
    } else {
      console.log(`👤 User already exists: ${user.name} (${user.email})`);
      // The user asked to change "write" (overwrite) to "create" (new records).
      // So we won't delete existing records here.
    }

    // 1. Seed Wealth Data (Assets & Liabilities)
    console.log('💰 Seeding Wealth Data...');
    
    // Find some Products to link (KiwiSaver & Fund)
    const kiwiSaverProduct = await Product.findOne({ category: 'KiwiSaver', strategy: 'Growth' });
    let fundProduct = await Product.findOne({ category: 'ManagedFund', strategy: 'Balanced' });
    if (!fundProduct) {
        fundProduct = await Product.findOne({ category: 'Fund', strategy: 'Balanced' });
    }

    const assets = [
      {
        user_id: user._id,
        name: 'Everyday Account',
        record_type: 'Asset',
        category: 'Cash_Bank',
        value: 50000.00,
        currency: 'NZD',
        is_liquid: true,
        asset_details: { bank_name: 'ANZ', account_suffix: '00', interest_rate: 0.1 }
      },
      {
        user_id: user._id,
        name: 'High Interest Savings',
        record_type: 'Asset',
        category: 'Cash_Bank',
        value: 200000.00,
        currency: 'NZD',
        is_liquid: true,
        asset_details: { bank_name: 'Rabobank', account_suffix: '50', interest_rate: 4.5 }
      },
      {
        user_id: user._id,
        name: 'Family Home',
        record_type: 'Asset',
        category: 'Property',
        value: 1250000.00,
        currency: 'NZD',
        is_liquid: false,
        asset_details: {
          address: '123 Queen Street, Auckland',
          property_type: 'Owner_Occupied',
          purchase_price: 950000,
          purchase_year: 2018,
          has_mortgage: true
        }
      },
      {
        user_id: user._id,
        name: 'Home Loan',
        record_type: 'Liability',
        category: 'Mortgage',
        value: 780000.00,
        currency: 'NZD',
        is_liquid: false,
        asset_details: {
          lender: 'ANZ',
          interest_rate: 6.85,
          fixed_until: new Date('2025-12-31')
        }
      },
      {
        user_id: user._id,
        name: 'KiwiSaver Growth Fund',
        record_type: 'Asset',
        category: 'KiwiSaver',
        value: 48500.25,
        currency: 'NZD',
        is_liquid: false,
        source_product_id: kiwiSaverProduct?._id,
        asset_details: {
          provider: kiwiSaverProduct?.provider || 'Milford',
          risk_level: kiwiSaverProduct?.riskLevel || 'Growth',
          contribution_rate: 3,
          employer_contributes: true
        }
      },
      {
        user_id: user._id,
        name: 'Managed Growth Fund',
        record_type: 'Asset',
        category: 'Invest_ManagedFund',
        value: 22000.00,
        currency: 'NZD',
        is_liquid: true,
        source_product_id: fundProduct?._id,
        asset_details: {
          provider: fundProduct?.provider || 'Fisher Funds',
          fund_name: fundProduct?.name || 'Growth Fund',
          risk_level: fundProduct?.riskLevel || 'Balanced'
        }
      },
      {
        user_id: user._id,
        name: 'US Tech Portfolio',
        record_type: 'Asset',
        category: 'Invest_Shares',
        value: 12500.00,
        currency: 'USD',
        is_liquid: true,
        asset_details: { platform: 'Sharesies', market: 'US', ticker: 'NVDA, AAPL', quantity: 150 }
      },
      {
        user_id: user._id,
        name: 'Credit Card',
        record_type: 'Liability',
        category: 'Credit_Card',
        value: 1200.00,
        currency: 'NZD',
        is_liquid: false,
        asset_details: { issuer: 'AMEX', credit_limit: 10000, interest_rate: 19.95 }
      }
    ];

    await FinancialAsset.insertMany(assets);
    console.log(`✅ Successfully seeded ${assets.length} financial records.`);

    // 2. Seed Cash Flow Data
    console.log('💸 Seeding Cash Flow Data...');
    const cashFlows = [
      {
        user_id: user._id,
        name: 'Senior Dev Salary',
        amount: 8500,
        type: 'Income',
        category: 'Salary',
        frequency: 'Monthly',
        timing_mode: 'Specific_Date',
        anchor_date: 15,
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
        anchor_date: 20,
        is_variable: true,
      },
      {
        user_id: user._id,
        name: 'Rent - City Apt',
        amount: 650,
        type: 'Expense',
        category: 'Housing',
        frequency: 'Weekly',
        timing_mode: 'Specific_Date',
        anchor_date: 2,
        is_variable: false,
      },
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
        name: 'Gym Membership',
        amount: 60.00,
        type: 'Subscription',
        category: 'Health',
        frequency: 'Fortnightly',
        timing_mode: 'Specific_Date',
        start_date: new Date(),
      }
    ];

    await CashFlow.insertMany(cashFlows);
    console.log(`✅ Successfully imported ${cashFlows.length} cash flow items!`);

    console.log('\n🚀 Setup Complete!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

// Get email from command line argument if provided
const emailArg = process.argv[2];
seedFullAccount(emailArg);
