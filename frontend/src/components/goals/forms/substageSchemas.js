// Config for substage-specific schemas per goal category.
// Used to render GAP Analysis and Key Assumptions with goal-specific fields.

const COMMON_GAP_FIELDS = [
  { name: 'monthly_income', label: 'Monthly Income', type: 'currency', required: false },
  { name: 'liquid_assets', label: 'Liquid Assets', type: 'currency', required: false },
  { name: 'investments', label: 'Investments', type: 'currency', required: false },
  { name: 'debts', label: 'Debt / Loans', type: 'currency', required: false },
  { name: 'region_policy', label: 'Policy / Tax Constraints', type: 'textarea', required: false, placeholder: 'Region, tax benefits, regulatory constraints' }
];

const COMMON_ASSUMPTION_FIELDS = [
  { name: 'expected_return_pct', label: 'Expected Return (%)', type: 'number', required: false, defaultValue: 6 },
  { name: 'inflation_pct', label: 'Inflation (%)', type: 'number', required: false, defaultValue: 2.5 },
  { name: 'risk_attitude', label: 'Risk Attitude', type: 'select', options: ['conservative', 'balanced', 'growth'], defaultValue: 'balanced' },
  { name: 'cashflow_flexibility', label: 'Cashflow Flexibility', type: 'select', options: ['low', 'medium', 'high'], defaultValue: 'medium' }
];

const byCategory = {
  home: {
    gap_analysis: [
      ...COMMON_GAP_FIELDS,
      { name: 'property_price_estimate', label: 'Estimated Property Price ($)', type: 'currency', required: false },
      { name: 'deposit_percentage', label: 'Deposit Target (%)', type: 'number', required: false, defaultValue: 20 },
      { name: 'is_first_home', label: 'First Home Buyer?', type: 'toggle', defaultValue: true }
    ],
    assumptions: [
      ...COMMON_ASSUMPTION_FIELDS,
      { name: 'mortgage_rate_pct', label: 'Assumed Mortgage Rate (%)', type: 'number', defaultValue: 6 },
      { name: 'loan_term_years', label: 'Loan Term (Years)', type: 'number', defaultValue: 30 }
    ]
  },
  retirement: {
    gap_analysis: [
      ...COMMON_GAP_FIELDS,
      { name: 'current_super_balance', label: 'Current Retirement Balance ($)', type: 'currency' },
      { name: 'annual_contribution', label: 'Annual Retirement Contribution ($)', type: 'currency' }
    ],
    assumptions: [
      ...COMMON_ASSUMPTION_FIELDS,
      { name: 'retirement_age', label: 'Retirement Age', type: 'number', defaultValue: 65 },
      { name: 'life_expectancy', label: 'Planning Until Age', type: 'number', defaultValue: 90 },
      { name: 'include_superannuation', label: 'Include NZ Super?', type: 'toggle', defaultValue: true }
    ]
  },
  vehicle: {
    gap_analysis: [
      ...COMMON_GAP_FIELDS,
      { name: 'vehicle_type', label: 'Vehicle Type', type: 'select', options: ['Sedan', 'SUV', 'EV / Hybrid', 'Motorcycle', 'Boat', 'Other'], defaultValue: 'EV / Hybrid' },
      { name: 'trade_in_value', label: 'Trade-in Value ($)', type: 'currency', defaultValue: 0 }
    ],
    assumptions: [
      ...COMMON_ASSUMPTION_FIELDS,
      { name: 'depreciation_pct', label: 'Assumed Depreciation (%/yr)', type: 'number', defaultValue: 12 }
    ]
  },
  education: {
    gap_analysis: [
      ...COMMON_GAP_FIELDS,
      { name: 'student_name', label: 'Student Name', type: 'text' },
      { name: 'tuition_quote', label: 'Tuition Estimate ($)', type: 'currency' }
    ],
    assumptions: [
      ...COMMON_ASSUMPTION_FIELDS,
      { name: 'tuition_inflation_pct', label: 'Tuition Inflation (%/yr)', type: 'number', defaultValue: 4 }
    ]
  },
  travel: {
    gap_analysis: [
      ...COMMON_GAP_FIELDS,
      { name: 'destination', label: 'Destination', type: 'text', placeholder: 'e.g. Japan' },
      { name: 'travelers_count', label: 'Number of Travelers', type: 'number', defaultValue: 2 },
      { name: 'duration_days', label: 'Duration (Days)', type: 'number', defaultValue: 14 }
    ],
    assumptions: [
      ...COMMON_ASSUMPTION_FIELDS,
      { name: 'fx_buffer_pct', label: 'FX Buffer (%)', type: 'number', defaultValue: 5 }
    ]
  },
  emergency: {
    gap_analysis: [
      ...COMMON_GAP_FIELDS,
      { name: 'monthly_expenditure', label: 'Essential Monthly Expenses ($)', type: 'currency', required: true },
      { name: 'coverage_months', label: 'Months of Coverage', type: 'number', defaultValue: 3 }
    ],
    assumptions: [
      ...COMMON_ASSUMPTION_FIELDS
    ]
  },
  wealth: {
    gap_analysis: [
      ...COMMON_GAP_FIELDS,
      { name: 'current_portfolio', label: 'Current Portfolio Value ($)', type: 'currency' }
    ],
    assumptions: [
      ...COMMON_ASSUMPTION_FIELDS,
      { name: 'target_return_rate', label: 'Target Annual Return (%)', type: 'number', defaultValue: 7 }
    ]
  },
  custom: {
    gap_analysis: COMMON_GAP_FIELDS,
    assumptions: COMMON_ASSUMPTION_FIELDS
  }
};

export function getSubstageSchema(category = 'custom', substageId) {
  const cat = category?.toLowerCase?.() || 'custom';
  const config = byCategory[cat] || byCategory.custom;
  return config[substageId] || [];
}


