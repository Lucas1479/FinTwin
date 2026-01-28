/**
 * Privacy Middleware - Centralized Privacy Control
 * 
 * Purpose: Attach privacy context to every request, enabling fine-grained data access control
 * 
 * Features:
 * 1. Global Privacy Switch: privacy.shareWithAI (true/false)
 * 2. Fine-grained Allowlist: privacy.dataAllowlist[] (specific data types)
 * 3. Request-level Override: allowAIDataSharing in request body
 * 
 * Usage in Controller:
 *   if (req.privacyContext.canAccess('financial_assets')) {
 *       const assets = await FinancialAsset.find({ user_id: userId });
 *   }
 */

import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

// Simple in-memory cache for privacy settings (optional performance optimization)
const privacyCache = new Map();
const CACHE_TTL = 60000; // 1 minute

// Helper: Get privacy settings with optional caching
const getUserPrivacy = async (userId) => {
    const cacheKey = userId.toString();
    
    // Check cache
    if (privacyCache.has(cacheKey)) {
        const cached = privacyCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
        // Cache expired, remove it
        privacyCache.delete(cacheKey);
    }
    
    // Fetch from database
    const userPrivacy = await User.findById(userId)
        .select('privacy')
        .lean();
    
    // Store in cache
    privacyCache.set(cacheKey, {
        data: userPrivacy,
        timestamp: Date.now()
    });
    
    return userPrivacy;
};

// Data type definitions for allowlist
export const DATA_TYPES = {
    FINANCIAL_ASSETS: 'financial_assets',
    CASH_FLOWS: 'cash_flows',
    GOALS: 'goals',
    PLANS: 'plans',
    USER_PROFILE: 'user_profile',
    ALL: 'all'
};

// Helper: Check if allowlist permits access to a data type
const isAllowedByList = (allowlist, dataType) => {
    if (!Array.isArray(allowlist) || allowlist.length === 0) {
        // Default: if no allowlist specified, allow all (legacy behavior)
        return true;
    }
    
    // Check for 'all' wildcard
    if (allowlist.includes(DATA_TYPES.ALL)) {
        return true;
    }
    
    // Check specific permission
    return allowlist.includes(dataType);
};

/**
 * Privacy Middleware - Attach privacy context to req
 * 
 * Populates req.privacyContext with:
 * - userId: Current user ID
 * - globalSharingEnabled: User's global privacy.shareWithAI setting
 * - requestOverride: Request-specific override (from body)
 * - finalAISharing: Effective privacy setting (global OR request)
 * - allowlist: Array of permitted data types
 * - canAccess(dataType): Function to check if data type is accessible
 */
export const attachPrivacyContext = asyncHandler(async (req, res, next) => {
    // Skip if not authenticated (public endpoints)
    if (!req.user || !req.user._id) {
        req.privacyContext = {
            userId: null,
            globalSharingEnabled: false,
            finalAISharing: false,
            allowlist: [],
            canAccess: () => false
        };
        return next();
    }
    
    const userId = req.user._id;
    
    // Fetch user's privacy settings (with optional caching)
    const userPrivacy = await getUserPrivacy(userId);
    
    const globalSharingEnabled = userPrivacy?.privacy?.shareWithAI !== false;
    const globalAllowlist = userPrivacy?.privacy?.dataAllowlist || [DATA_TYPES.ALL];
    
    // Request-level overrides (from chatbox or frontend)
    const requestOverride = req.body?.allowAIDataSharing;
    const requestAllowlist = req.body?.dataAllowlist; // Optional: request-specific allowlist
    
    // Determine final sharing state
    // Priority: requestOverride > globalSharingEnabled
    const finalAISharing = requestOverride !== undefined 
        ? requestOverride 
        : globalSharingEnabled;
    
    // Determine final allowlist
    // If sharing disabled, allowlist is empty
    const finalAllowlist = finalAISharing 
        ? (requestAllowlist || globalAllowlist)
        : [];
    
    // Log privacy decision (dev debugging)
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Privacy Middleware] 🔒 Privacy Context:', {
            userId: userId.toString().substring(0, 8) + '...',
            global: globalSharingEnabled,
            request: requestOverride,
            final: finalAISharing,
            allowlist: finalAllowlist
        });
    }
    
    // Attach privacy context to request
    req.privacyContext = {
        userId,
        globalSharingEnabled,
        requestOverride,
        finalAISharing,
        allowlist: finalAllowlist,
        
        /**
         * Check if a specific data type is accessible
         * @param {string} dataType - One of DATA_TYPES constants
         * @returns {boolean} - True if access permitted
         */
        canAccess: (dataType) => {
            if (!finalAISharing) {
                // Global sharing disabled
                return false;
            }
            
            return isAllowedByList(finalAllowlist, dataType);
        },
        
        /**
         * Get privacy reason for logging/debugging
         * @param {string} dataType - Data type being checked
         * @returns {string} - Human-readable reason
         */
        getAccessReason: (dataType) => {
            if (!finalAISharing) {
                return 'User disabled AI data sharing';
            }
            
            if (!isAllowedByList(finalAllowlist, dataType)) {
                return `Data type '${dataType}' not in allowlist: [${finalAllowlist.join(', ')}]`;
            }
            
            return 'Access granted';
        }
    };
    
    next();
});

/**
 * Helper to build privacy-aware response for empty data
 * Use this when privacy blocks data access
 */
export const buildPrivacyBlockedResponse = (dataType, privacyContext) => {
    return {
        data: null,
        has_data: false,
        data_source: 'privacy_disabled',
        reason: privacyContext.getAccessReason(dataType),
        note: `Enable '${dataType}' in Privacy Settings to get personalized advice.`
    };
};

export default attachPrivacyContext;
