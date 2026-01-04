// ==========================================
// Predefined Goal Form Schemas
// ==========================================
// These schemas define the "Standard Fields" for known goal categories.
// They match the Mongoose sub-schemas in goalModel.js.
// Used by the Goal Engine to instruct the Frontend on what to render.

const COMMON_FIELDS = [
  {
    name: 'goal_name',
    label: 'Goal Name',
    type: 'text',
    required: true,
    placeholder: 'e.g. My Dream House'
  },
  {
    name: 'target_amount',
    label: 'Target Amount ($)',
    type: 'currency', // Frontend should render with $ prefix
    required: true,
    min: 0,
    step: 1000
  },
  {
    name: 'due_date',
    label: 'Target Date',
    type: 'date',
    required: true
  },
  {
    name: 'priority',
    label: 'Priority',
    type: 'select',
    options: ['need', 'want', 'wish'],
    required: true,
    defaultValue: 'want',
    helpText: 'Needs are essential. Wants are important. Wishes are nice to have.'
  }
];

export const GOAL_FORM_SCHEMAS = {
  // --- 1. Retirement ---
  retirement: {
    title: 'Retirement Planning',
    description: 'Plan your golden years with confidence.',
    fields: [
      ...COMMON_FIELDS,
      {
        name: 'goal_details.retirement_age',
        label: 'Retirement Age',
        type: 'number',
        required: true,
        defaultValue: 65,
        min: 50,
        max: 80
      },
      {
        name: 'goal_details.living_expense_pa',
        label: 'Desired Annual Income ($)',
        type: 'currency',
        required: true,
        helpText: 'How much do you need per year in today\'s money?'
      },
      {
        name: 'goal_details.life_expectancy',
        label: 'Planning Until Age',
        type: 'number',
        defaultValue: 90,
        min: 70,
        max: 110
      },
      {
        name: 'goal_details.include_superannuation',
        label: 'Include NZ Super?',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Subtract NZ Super payments from your required savings.'
      }
    ]
  },

  // --- 2. Home Ownership ---
  home: {
    title: 'Buy a Home',
    description: 'Save for a deposit on your property.',
    fields: [
      ...COMMON_FIELDS,
      {
        name: 'goal_details.property_price_estimate',
        label: 'Estimated Property Price ($)',
        type: 'currency',
        required: true
      },
      {
        name: 'goal_details.deposit_percentage',
        label: 'Deposit Target (%)',
        type: 'slider',
        min: 5,
        max: 100,
        step: 5,
        defaultValue: 20
      },
      {
        name: 'goal_details.location',
        label: 'Target Location',
        type: 'text', // Could be select in future
        placeholder: 'e.g. Auckland Central'
      },
      {
        name: 'goal_details.is_first_home',
        label: 'First Home Buyer?',
        type: 'toggle',
        defaultValue: true,
        helpText: 'You may be eligible for KiwiSaver withdrawals and grants.'
      }
    ]
  },

  // --- 3. Emergency Fund ---
  emergency: {
    title: 'Emergency Fund',
    description: 'Build a safety net for unexpected costs.',
    fields: [
      {
        name: 'goal_name',
        label: 'Goal Name',
        type: 'text',
        defaultValue: 'Emergency Fund',
        required: true
      },
      {
        name: 'goal_details.monthly_expenditure',
        label: 'Essential Monthly Expenses ($)',
        type: 'currency',
        required: true,
        helpText: 'Rent, food, utilities, debt payments.'
      },
      {
        name: 'goal_details.coverage_months',
        label: 'Months of Coverage',
        type: 'slider',
        min: 1,
        max: 12,
        defaultValue: 3,
        helpText: 'Experts recommend 3-6 months of expenses.'
      },
      // Target Amount is calculated: monthly * coverage (handled by AI/Frontend logic)
      {
        name: 'due_date',
        label: 'Target Date',
        type: 'date',
        required: true
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        options: ['need', 'want', 'wish'],
        defaultValue: 'need',
        readOnly: true // Emergency funds are usually Needs
      }
    ]
  },

  // --- 4. Vehicle ---
  vehicle: {
    title: 'Buy a Vehicle',
    description: 'Save for a car, bike, or boat.',
    fields: [
      ...COMMON_FIELDS,
      {
        name: 'goal_details.vehicle_type',
        label: 'Type',
        type: 'select',
        options: ['Sedan', 'SUV', 'EV / Hybrid', 'Motorcycle', 'Boat', 'Other'],
        defaultValue: 'EV / Hybrid'
      },
      {
        name: 'goal_details.trade_in_value',
        label: 'Trade-in Value ($)',
        type: 'currency',
        defaultValue: 0,
        helpText: 'Value of your current vehicle to swap.'
      }
    ]
  },

  // --- 5. Travel ---
  travel: {
    title: 'Travel / Holiday',
    description: 'Budget for your next adventure.',
    fields: [
      ...COMMON_FIELDS,
      {
        name: 'goal_details.destination',
        label: 'Destination',
        type: 'text',
        placeholder: 'e.g. Japan'
      },
      {
        name: 'goal_details.travelers_count',
        label: 'Number of Travelers',
        type: 'number',
        min: 1,
        defaultValue: 2
      },
      {
        name: 'goal_details.duration_days',
        label: 'Duration (Days)',
        type: 'number',
        min: 1,
        defaultValue: 14
      }
    ]
  },

  // --- 6. Education ---
  education: {
    title: 'Education',
    description: 'Save for tuition, courses, or study-related costs.',
    fields: [
      ...COMMON_FIELDS,
      {
        name: 'goal_details.student_name',
        label: 'Student Name',
        type: 'text',
        placeholder: 'e.g. Self or Child Name'
      },
      {
        name: 'goal_details.start_year',
        label: 'Start Year',
        type: 'number',
        min: new Date().getFullYear(),
        defaultValue: new Date().getFullYear() + 1
      },
      {
        name: 'goal_details.duration_years',
        label: 'Duration (Years)',
        type: 'number',
        min: 1,
        defaultValue: 3
      },
      {
        name: 'goal_details.institution_type',
        label: 'Institution Type',
        type: 'select',
        options: ['University', 'Polytech', 'Private', 'School', 'Other'],
        defaultValue: 'University'
      }
    ]
  },

  // --- 7. Wealth Growth ---
  wealth: {
    title: 'Wealth Growth',
    description: 'Invest to grow your capital over time.',
    fields: [
      ...COMMON_FIELDS,
      {
        name: 'goal_details.investment_vehicle',
        label: 'Preferred Vehicle',
        type: 'select',
        options: ['managed_fund', 'shares', 'crypto', 'business', 'other'],
        defaultValue: 'managed_fund'
      },
      {
        name: 'goal_details.target_return_rate',
        label: 'Target Annual Return (%)',
        type: 'number',
        min: 0,
        max: 100,
        defaultValue: 7,
        helpText: 'Be realistic: 4-6% for balanced, 7-10% for growth.'
      },
      {
        name: 'goal_details.reinvest_dividends',
        label: 'Reinvest Dividends?',
        type: 'toggle',
        defaultValue: true
      }
    ]
  },

  // --- 8. Big Purchase / Event ---
  big_purchase: {
    title: 'Major Purchase / Event',
    description: 'Save for a wedding, renovation, or luxury item.',
    fields: [
      ...COMMON_FIELDS,
      {
        name: 'goal_details.item_name',
        label: 'What are you buying?',
        type: 'text',
        placeholder: 'e.g. Wedding, Kitchen Renovation'
      },
      {
        name: 'goal_details.purchase_type',
        label: 'Purchase Type',
        type: 'select',
        options: ['renovation', 'wedding', 'electronics', 'luxury', 'other'],
        defaultValue: 'other'
      },
      {
        name: 'goal_details.vendor_quote',
        label: 'Estimated Quote ($)',
        type: 'currency',
        helpText: 'If you already have a quote from a vendor.'
      }
    ]
  },

  // --- 9. Custom / General ---
  custom: {
    title: 'Custom Goal',
    description: 'Define your own financial target.',
    fields: [
      ...COMMON_FIELDS,
      {
        name: 'notes',
        label: 'What is this for?',
        type: 'textarea',
        placeholder: 'Describe your goal...'
      }
    ]
  }
};

/**
 * Helper to get schema by category key
 * @param {string} category 
 * @returns {object} Schema object or Custom Schema
 */
export const getFormSchemaForCategory = (category) => {
  return GOAL_FORM_SCHEMAS[category] || GOAL_FORM_SCHEMAS.custom;
};

