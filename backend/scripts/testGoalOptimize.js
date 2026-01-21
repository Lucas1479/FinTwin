import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TOKEN = process.env.TOKEN;
const PAYLOAD_PATH = process.env.PAYLOAD || path.join(process.cwd(), 'scripts', 'testGoalOptimize.payload.json');

const loadPayload = () => {
  if (fs.existsSync(PAYLOAD_PATH)) {
    return JSON.parse(fs.readFileSync(PAYLOAD_PATH, 'utf-8'));
  }
  return {
    goalContext: {
      goal_name: 'Purchase villa on Waiheke Island',
      category: 'home',
      priority: 'need',
      target_amount: 0,
      current_amount: 300000,
      due_date: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString(),
      goal_details: {
        property_price_estimate: 1200000,
        deposit_percentage: 40,
        mortgage_rate_pct: 6.5,
        loan_term_years: 30,
        expected_return_pct: 6,
        inflation_pct: 2.5
      },
      simulation_data: {
        financials: {
          monthly_income: 8000,
          monthly_outflow: 3000,
          monthly_surplus_total: 5000,
          monthly_surplus_allocatable: 3000,
          reserve_for_other_goals_pct: 40
        }
      }
    },
    options: {
      algorithm: 'solver',
      incomeGrowthPct: 3,
      inflationPct: 2.5,
      debug: true
    }
  };
};

const main = async () => {
  if (!TOKEN) {
    console.error('Missing TOKEN env. Example: TOKEN=... node scripts/testGoalOptimize.js');
    process.exit(1);
  }

  const payload = loadPayload();
  const res = await fetch(`${BASE_URL}/api/goals/engine/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('Request failed:', res.status, text);
    process.exit(1);
  }

  const json = JSON.parse(text);
  console.log(JSON.stringify(json, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
