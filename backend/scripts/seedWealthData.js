import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/userModel.js';
import FinancialAsset from '../models/financialAssetModel.js';
import Product from '../models/productModel.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedWealthData = async () => {
  await connectDB();

  try {
    // 1. Find a target user (First user found)
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No users found. Please register a user first.');
      process.exit(1);
    }
    console.log(`👤 Seeding data for user: ${user.name} (${user.email})`);

    // 2. Clear existing assets for this user
    await FinancialAsset.deleteMany({ user_id: user._id });
    console.log('🗑️  Cleared existing financial assets/liabilities.');

    // 3. Find some Products to link (KiwiSaver & Fund)
    const kiwiSaverProduct = await Product.findOne({ category: 'KiwiSaver', strategy: 'Growth' });
    const managedFundProduct = await Product.findOne({ category: 'ManagedFund', strategy: 'Balanced' }); // Or 'Fund' if DB has 'Fund'
    // Note: DB category might be 'Fund' or 'ManagedFund'. The python script output 'KiwiSaver' and 'Fund'.
    // Let's try to find one with category 'Fund' if 'ManagedFund' fails.
    let fundProduct = managedFundProduct;
    if (!fundProduct) {
        fundProduct = await Product.findOne({ category: 'Fund', strategy: 'Balanced' });
    }

    const assets = [
      // --- Cash ---
      {
        user_id: user._id,
        name: 'Everyday Account',
        record_type: 'Asset',
        category: 'Cash_Bank',
        value: 5430.50,
        currency: 'NZD',
        is_liquid: true,
        asset_details: {
          bank_name: 'ANZ',
          account_suffix: '00',
          interest_rate: 0.1
        }
      },
      {
        user_id: user._id,
        name: 'High Interest Savings',
        record_type: 'Asset',
        category: 'Cash_Bank',
        value: 15000.00,
        currency: 'NZD',
        is_liquid: true,
        asset_details: {
          bank_name: 'Rabobank',
          account_suffix: '50',
          interest_rate: 4.5
        }
      },

      // --- Property & Mortgage ---
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
        is_liquid: false, // Liabilities aren't "liquid" in asset sense, but field exists
        asset_details: {
          lender: 'ANZ',
          interest_rate: 6.85,
          fixed_until: new Date('2025-12-31')
        }
      },

      // --- Investments (Linked to Products) ---
      {
        user_id: user._id,
        name: 'KiwiSaver Growth Fund',
        record_type: 'Asset',
        category: 'KiwiSaver',
        value: 48500.25,
        currency: 'NZD',
        is_liquid: false, // Locked
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
        is_liquid: true, // Usually redeemable
        source_product_id: fundProduct?._id,
        asset_details: {
          provider: fundProduct?.provider || 'Fisher Funds',
          fund_name: fundProduct?.name || 'Growth Fund',
          risk_level: fundProduct?.riskLevel || 'Balanced'
        }
      },

      // --- Shares ---
      {
        user_id: user._id,
        name: 'US Tech Portfolio',
        record_type: 'Asset',
        category: 'Invest_Shares',
        value: 12500.00,
        currency: 'USD',
        is_liquid: true,
        asset_details: {
          platform: 'Sharesies',
          market: 'US',
          ticker: 'NVDA, AAPL',
          quantity: 150
        }
      },

      // --- Other Liabilities ---
      {
        user_id: user._id,
        name: 'Credit Card',
        record_type: 'Liability',
        category: 'Credit_Card',
        value: 1200.00,
        currency: 'NZD',
        is_liquid: false,
        asset_details: {
            issuer: 'AMEX',
            credit_limit: 10000,
            interest_rate: 19.95
        }
      }
    ];

    await FinancialAsset.insertMany(assets);
    console.log(`✅ Successfully seeded ${assets.length} financial records.`);
    
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedWealthData();

