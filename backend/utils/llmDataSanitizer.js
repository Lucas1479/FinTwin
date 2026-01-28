/**
 * LLM Data Sanitizer
 * 
 * Purpose: Remove Personally Identifiable Information (PII) before sending to remote LLM
 * 
 * Strategy: "Selective Sanitization" - Remove identity while keeping financial accuracy
 * - ❌ Remove: User ID, names, emails, phone numbers, addresses
 * - ✅ Keep: Financial values (needed for accurate advice)
 * - 🔒 Why: Single financial numbers cannot identify a person, but PII can
 * 
 * Trade-off Analysis:
 * - Normalizing financial data → Inaccurate advice (e.g., "save $30K" means different things for $50K vs $500K assets)
 * - Removing only PII → Accurate advice + Privacy protection
 * 
 * Control: Set SANITIZE_LLM_DATA=false in dev .env to disable for debugging
 */

/**
 * Round a number to a general range for privacy
 * Preserves magnitude while masking exact values
 */
const toRange = (value, buckets = null) => {
    if (value == null || isNaN(value)) return 0;
    
    const num = Number(value);
    
    // Default bucketing strategy
    if (!buckets) {
        if (num === 0) return 0;
        if (num < 0) return -toRange(Math.abs(num), buckets); // Handle debts
        if (num < 5000) return 2500; // $0-$5K → $2.5K
        if (num < 10000) return 7500;
        if (num < 25000) return 17500;
        if (num < 50000) return 37500;
        if (num < 100000) return 75000;
        if (num < 250000) return 175000;
        if (num < 500000) return 375000;
        if (num < 1000000) return 750000;
        return 1500000; // $1M+
    }
    
    // Custom buckets (e.g., for percentages)
    for (let i = 0; i < buckets.length; i++) {
        if (num <= buckets[i]) {
            return i === 0 ? buckets[0] / 2 : (buckets[i - 1] + buckets[i]) / 2;
        }
    }
    return buckets[buckets.length - 1];
};

/**
 * STRICT MODE: Remove all financial data, return only goal structure
 * Use case: Maximum privacy, but AI will only give generic advice
 */
const sanitizeStrict = (context) => {
    const minimal = {
        category: context.category,
        goal_name: context.goal_name,
        goal_title: context.goal_title,
        time_horizon: context.time_horizon,
        _sanitized: true,
        _privacy_mode: 'strict',
        _note: 'All financial data removed. AI will provide generic advice only.'
    };
    
    console.log('[LLM Sanitizer] ✅ Strict sanitization complete (generic advice mode)\n');
    return minimal;
};

/**
 * NORMALIZED MODE: Preserve ratios while masking absolute values
 * Use case: Balance between privacy and advice accuracy
 */
const sanitizeWithNormalization = (context) => {
    if (!context || typeof context !== 'object') return context;
    
    const sanitized = JSON.parse(JSON.stringify(context));
    
    // Remove PII first
    const piiFields = ['user_id', 'userId', '_id', 'user_name', 'email', 'phone', 'address', 'session_id'];
    piiFields.forEach(field => {
        if (field in sanitized) delete sanitized[field];
    });
    
    // Normalize financial snapshots
    if (sanitized.real_financial_snapshot?.has_data) {
        sanitized.real_financial_snapshot = {
            ...sanitized.real_financial_snapshot,
            ...normalizeFinancialProfile(sanitized.real_financial_snapshot),
            data_source: 'normalized_for_privacy'
        };
    }
    
    if (sanitized.target_amount) {
        sanitized.target_amount = toRange(sanitized.target_amount);
    }
    
    sanitized._sanitized = true;
    sanitized._privacy_mode = 'normalized';
    sanitized._note = 'Financial values normalized to preserve ratios. Advice may be less precise.';
    
    console.log('[LLM Sanitizer] ✅ Normalization complete\n');
    return sanitized;
};

/**
 * Preserve ratio relationships while masking absolute values
 * Example: $100K assets, $50K debts → 66.67% ratio preserved, but values normalized
 */
const normalizeFinancialProfile = (profile) => {
    if (!profile || typeof profile !== 'object') return profile;
    
    const liquid = Number(profile.liquid_assets) || 0;
    const investments = Number(profile.investments) || 0;
    const debts = Math.abs(Number(profile.debts)) || 0;
    const income = Number(profile.monthly_income) || Number(profile.income_pa) / 12 || 0;
    const super_balance = Number(profile.current_super_balance) || 0;
    
    const totalAssets = liquid + investments + super_balance;
    const netWorth = totalAssets - debts;
    
    // Key insight: AI needs *relationships*, not exact numbers
    // Scale everything to a normalized base (e.g., $100K total assets)
    const BASE_SCALE = 100000;
    const scale = totalAssets > 0 ? BASE_SCALE / totalAssets : 1;
    
    return {
        ...profile,
        liquid_assets: Math.round(liquid * scale),
        investments: Math.round(investments * scale),
        debts: Math.round(debts * scale),
        current_super_balance: Math.round(super_balance * scale),
        monthly_income: Math.round(income * scale),
        net_position: Math.round(netWorth * scale),
        _normalized: true, // Flag for AI prompt awareness
        _note: 'Values normalized to preserve ratios while protecting privacy'
    };
};

/**
 * Main sanitization function - call this before sending context to LLM
 * 
 * Privacy Levels (set via SANITIZE_LLM_DATA env var):
 * - 'false' or 'none': No sanitization (dev debugging)
 * - 'minimal' or 'pii_only': Remove PII only, keep financial values (RECOMMENDED)
 * - 'normalized': Normalize financial values to preserve ratios (less accurate advice)
 * - 'strict': Maximum privacy, generic advice only
 */
export const sanitizeContextForLLM = (context) => {
    const privacyLevel = (process.env.SANITIZE_LLM_DATA || 'pii_only').toLowerCase();
    
    if (privacyLevel === 'false' || privacyLevel === 'none') {
        console.log('[LLM Sanitizer] 🔓 Disabled (dev mode) - sending raw data to LLM');
        return context;
    }
    
    if (privacyLevel === 'normalized') {
        console.log('[LLM Sanitizer] 🔒 Normalizing financial data (ratio-preserving mode)...');
        return sanitizeWithNormalization(context);
    }
    
    if (privacyLevel === 'strict') {
        console.log('[LLM Sanitizer] 🔒🔒 Strict mode: Removing all financial data...');
        return sanitizeStrict(context);
    }
    
    // Default: 'pii_only' or 'minimal'
    console.log('[LLM Sanitizer] 🔒 Removing PII before sending to remote LLM...');
    
    if (!context || typeof context !== 'object') return context;
    
    const sanitized = JSON.parse(JSON.stringify(context)); // Deep clone
    
    // === PII Removal (High Priority) ===
    
    // 1. Remove direct identifiers
    const piiFields = [
        'user_id', 'userId', '_id',
        'user_name', 'userName', 'name', 'full_name',
        'email', 'user_email',
        'phone', 'phone_number', 'mobile',
        'address', 'street_address', 'home_address',
        'ip_address', 'device_id',
        'session_id' // Can be used to correlate requests
    ];
    
    piiFields.forEach(field => {
        if (field in sanitized) {
            delete sanitized[field];
            console.log(`   ✓ Removed PII: ${field}`);
        }
    });
    
    // 2. Sanitize nested objects (real_financial_snapshot, user_financial_profile, etc.)
    const sanitizeNestedPII = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        piiFields.forEach(field => {
            if (field in obj) delete obj[field];
        });
        
        // Recurse into nested objects/arrays
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeNestedPII(obj[key]);
            }
        });
        
        return obj;
    };
    
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitizeNestedPII(sanitized[key]);
        }
    });
    
    // 3. Redact specific identifying combinations
    // Example: "Auckland" + "Age 35" + "Income $8950" might be somewhat identifying
    // But we'll keep these for now as they're needed for localized advice
    
    // 4. Add metadata to indicate sanitization
    sanitized._sanitized = true;
    sanitized._sanitization_strategy = 'pii_removal_only';
    sanitized._note = 'Financial values retained for accurate advice. PII removed for privacy.';
    
    console.log('[LLM Sanitizer] ✅ PII removal complete (financial values preserved)\n');
    
    return sanitized;
};

/**
 * Sanitize goal context for logging (lighter touch - just remove PII)
 */
export const sanitizeForLogging = (context) => {
    if (!context || typeof context !== 'object') return context;
    
    const sanitized = { ...context };
    
    // Remove personally identifiable information
    delete sanitized.user_name;
    delete sanitized.user_email;
    delete sanitized.user_phone;
    
    return sanitized;
};

export default sanitizeContextForLLM;
