/**
 * Analyze candidate pool + optimization results for product selection
 *
 * Usage:
 *   cd backend
 *   node scripts/analyzeCandidatePools.js
 *   node scripts/analyzeCandidatePools.js --growth=64 --defensive=28 --liquidity=8 --maxFees=2 --retirement=true
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import productTools from '../services/productTools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const parseArgs = () => {
  const args = process.argv.slice(2);
  const getArg = (name, fallback) => {
    const prefix = `--${name}=`;
    const entry = args.find((a) => a.startsWith(prefix));
    if (!entry) return fallback;
    return entry.slice(prefix.length);
  };
  return {
    target_growth_pct: Number(getArg('growth', 60)),
    target_defensive_pct: Number(getArg('defensive', 30)),
    target_liquidity_pct: Number(getArg('liquidity', 10)),
    max_fees: getArg('maxFees', '') === '' ? undefined : Number(getArg('maxFees', 2)),
    is_retirement_goal: String(getArg('retirement', 'false')).toLowerCase() === 'true',
  };
};

const summarizeReturns = (list = []) => {
  const total = list.length;
  const negative = list.filter((p) => Number.isFinite(p.return_5yr) && p.return_5yr < 0).length;
  const nonNegative = list.filter((p) => Number.isFinite(p.return_5yr) && p.return_5yr >= 0).length;
  const missing = list.filter((p) => !Number.isFinite(p.return_5yr)).length;
  return { total, negative, nonNegative, missing };
};

const printSample = (label, list, limit = 5) => {
  console.log(`\n${label} (top ${limit}):`);
  list.slice(0, limit).forEach((p, idx) => {
    console.log(
      `${idx + 1}. ${p.name} | fees=${p.fees ?? '—'} | 5y=${Number.isFinite(p.return_5yr) ? p.return_5yr : '—'} | ${p.provider}`,
    );
  });
};

const buildProductLookup = (candidates) => {
  const map = new Map();
  ['growth', 'defensive', 'liquidity'].forEach((bucket) => {
    (candidates?.[bucket] || []).forEach((p) => {
      map.set(String(p.id), p);
    });
  });
  return map;
};

const main = async () => {
  const params = parseArgs();
  console.log('[Analyze] Params:', params);

  await mongoose.connect(process.env.MONGO_URI);

  const candidates = await productTools.searchPortfolioCandidates(params);
  const buckets = candidates.candidates || {};
  console.log('\n[Analyze] Candidate counts:', candidates.summary);

  const growthSummary = summarizeReturns(buckets.growth || []);
  const defensiveSummary = summarizeReturns(buckets.defensive || []);
  const liquiditySummary = summarizeReturns(buckets.liquidity || []);

  console.log('\n[Analyze] Return coverage (5Y):');
  console.log('  Growth   :', growthSummary);
  console.log('  Defensive:', defensiveSummary);
  console.log('  Liquidity:', liquiditySummary);

  printSample('Growth candidates', buckets.growth || []);
  printSample('Defensive candidates', buckets.defensive || []);
  printSample('Liquidity candidates', buckets.liquidity || []);

  const optimized = await productTools.buildOptimizedPortfolios(params);
  if (optimized?.error) {
    console.log('\n[Analyze] Optimization error:', optimized.error);
  } else {
    const lookup = buildProductLookup(buckets);
    console.log('\n[Analyze] Portfolio options:', optimized.portfolio_options?.length || 0);
    (optimized.portfolio_options || []).forEach((opt) => {
      console.log(`\n- ${opt.option_id}: ${opt.option_name} | fees=${opt.total_fees_estimate}% | exposure=${opt.calculated_exposure?.growth}/${opt.calculated_exposure?.defensive}/${opt.calculated_exposure?.liquidity}`);
      (opt.products || []).forEach((p) => {
        const meta = lookup.get(String(p.product_id));
        const ret = meta && Number.isFinite(meta.return_5yr) ? meta.return_5yr : '—';
        const fees = meta?.fees ?? '—';
        console.log(`  • ${meta?.name || p.product_id} | weight=${p.weight_pct}% | 5y=${ret} | fees=${fees}`);
      });
    });
  }

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('[Analyze] Failed:', err);
  process.exit(1);
});
