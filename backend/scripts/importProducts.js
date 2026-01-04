/**
 * FinTwin Product Import Script
 * =============================
 * Imports products_final.json into MongoDB
 * 
 * Usage:
 *   cd backend
 *   node scripts/importProducts.js
 * 
 * Options:
 *   --clear    Clear existing products before import (default: false)
 *   --dry-run  Preview without writing to database
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES Module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import Product model
import Product from '../models/productModel.js';

// Configuration
const JSON_FILE = path.join(__dirname, '..', 'products_final.json');
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI not found in .env file');
  console.error('   Please ensure backend/.env contains MONGO_URI=mongodb://...');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const CLEAR_EXISTING = args.includes('--clear');
const DRY_RUN = args.includes('--dry-run');

async function importProducts() {
  console.log('='.repeat(60));
  console.log('🚀 FinTwin Product Import Script');
  console.log('='.repeat(60));
  
  // 1. Check if JSON file exists
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ Error: ${JSON_FILE} not found.`);
    console.error('   Please run the Python pipeline first:');
    console.error('   python "scripts/feature engineering of data 2.py"');
    process.exit(1);
  }
  
  // 2. Load JSON data
  console.log(`\n📂 Loading data from ${JSON_FILE}...`);
  const rawData = fs.readFileSync(JSON_FILE, 'utf-8');
  const products = JSON.parse(rawData);
  console.log(`   ✅ Loaded ${products.length} products`);
  
  // 3. Validate data structure (sample check)
  const requiredFields = ['name', 'provider', 'category', 'strategy', 'metrics'];
  const invalidProducts = products.filter(p => 
    !requiredFields.every(field => p.hasOwnProperty(field))
  );
  
  if (invalidProducts.length > 0) {
    console.warn(`   ⚠️  ${invalidProducts.length} products missing required fields`);
    invalidProducts.slice(0, 3).forEach(p => {
      console.warn(`      - ${p.name || 'Unknown'}`);
    });
  }
  
  // 4. Show summary before import
  const categoryCounts = {};
  const strategyCounts = {};
  products.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    strategyCounts[p.strategy] = (strategyCounts[p.strategy] || 0) + 1;
  });
  
  console.log('\n📊 Data Summary:');
  console.log('   By Category:', categoryCounts);
  console.log('   By Strategy:', strategyCounts);
  
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN mode - no data will be written');
    console.log('   Remove --dry-run flag to actually import');
    process.exit(0);
  }
  
  // 5. Connect to MongoDB
  console.log(`\n🔌 Connecting to MongoDB: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}...`);
  try {
    await mongoose.connect(MONGO_URI);
    console.log('   ✅ Connected successfully');
  } catch (err) {
    console.error(`   ❌ Connection failed: ${err.message}`);
    process.exit(1);
  }
  
  // 6. Clear existing products if requested
  if (CLEAR_EXISTING) {
    console.log('\n🗑️  Clearing existing products...');
    const deleteResult = await Product.deleteMany({});
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} existing products`);
  }
  
  // 7. Import products
  console.log('\n📥 Importing products...');
  
  // Pre-process products to add aggregated allocation fields
  const processedProducts = products.map(p => {
    // Basic allocation calculation
    let allocation = p.allocation ? { ...p.allocation } : {};

    // Special handling for Term Deposits: ensure they are 100% cash if not specified
    if (p.category === 'TermDeposit') {
      allocation.cash = allocation.cash || 100;
      allocation.equities = allocation.equities || 0;
      allocation.property = allocation.property || 0;
      allocation.bonds = allocation.bonds || 0;
    }

    if (p.allocation || p.category === 'TermDeposit') {
      return {
        ...p,
        allocation: {
          ...allocation,
          growth: (allocation.equities || 0) + (allocation.property || 0),
          defensive: allocation.bonds || 0,
          cash: allocation.cash || 0
        }
      };
    }
    return p;
  });

  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  // Use insertMany for better performance, but handle errors individually
  const BATCH_SIZE = 100;
  for (let i = 0; i < processedProducts.length; i += BATCH_SIZE) {
    const batch = processedProducts.slice(i, i + BATCH_SIZE);
    
    try {
      // Use ordered: false to continue on error
      await Product.insertMany(batch, { ordered: false });
      successCount += batch.length;
    } catch (err) {
      // Handle partial success in batch
      if (err.insertedDocs) {
        successCount += err.insertedDocs.length;
      }
      
      // Log individual errors
      if (err.writeErrors) {
        err.writeErrors.forEach(writeErr => {
          errorCount++;
          const failedDoc = batch[writeErr.index];
          errors.push({
            name: failedDoc?.name || 'Unknown',
            error: writeErr.errmsg
          });
        });
      } else {
        errorCount += batch.length;
        errors.push({ batch: i, error: err.message });
      }
    }
    
    // Progress indicator
    const progress = Math.min(i + BATCH_SIZE, products.length);
    process.stdout.write(`   Progress: ${progress}/${products.length}\r`);
  }
  
  console.log('\n');
  
  // 8. Report results
  console.log('='.repeat(60));
  console.log('📋 Import Results');
  console.log('='.repeat(60));
  console.log(`   ✅ Successfully imported: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n   First 5 errors:');
    errors.slice(0, 5).forEach(e => {
      console.log(`      - ${e.name}: ${e.error}`);
    });
  }
  
  // 9. Verify by counting documents
  const totalInDb = await Product.countDocuments();
  console.log(`\n   📊 Total products in database: ${totalInDb}`);
  
  // 10. Disconnect
  await mongoose.disconnect();
  console.log('\n✅ Done! Database connection closed.');
}

// Run the import
importProducts().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

