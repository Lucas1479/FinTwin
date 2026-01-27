/**
 * Privacy-Aware Data Service
 * 
 * Purpose: Centralize all database queries with automatic privacy filtering
 * 
 * Benefits:
 * - Single source of truth for data access
 * - Automatic privacy checks (no need for if-else in controller)
 * - Consistent return format
 * - Easy to add caching/optimization later
 * 
 * Usage:
 *   const dataService = new PrivacyAwareDataService(req.privacyContext);
 *   const assets = await dataService.getFinancialAssets();
 *   if (assets.has_data) {
 *       // Process assets.data
 *   }
 */

import FinancialAsset from '../models/financialAssetModel.js';
import CashFlow from '../models/cashFlowModel.js';
import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import Plan from '../models/planModel.js';
import { DATA_TYPES, buildPrivacyBlockedResponse } from '../middleware/privacyMiddleware.js';

export class PrivacyAwareDataService {
    /**
     * @param {Object} privacyContext - req.privacyContext from middleware
     */
    constructor(privacyContext) {
        if (!privacyContext) {
            throw new Error('PrivacyContext is required. Did you forget to apply privacyMiddleware?');
        }
        
        this.privacyContext = privacyContext;
        this.userId = privacyContext.userId;
    }
    
    /**
     * Get Financial Assets
     * @param {Object} filter - Additional MongoDB filter (optional)
     * @returns {Promise<{data: Array|null, has_data: boolean, data_source: string}>}
     */
    async getFinancialAssets(filter = {}) {
        if (!this.privacyContext.canAccess(DATA_TYPES.FINANCIAL_ASSETS)) {
            console.log('[PrivacyService] 🔒 Blocked: financial_assets');
            return buildPrivacyBlockedResponse(DATA_TYPES.FINANCIAL_ASSETS, this.privacyContext);
        }
        
        try {
            const assets = await FinancialAsset.find({ 
                user_id: this.userId,
                ...filter 
            }).lean();
            
            return {
                data: assets,
                has_data: assets.length > 0,
                data_source: 'database',
                count: assets.length
            };
        } catch (error) {
            console.error('[PrivacyService] Error fetching financial assets:', error);
            return {
                data: null,
                has_data: false,
                data_source: 'error',
                error: error.message
            };
        }
    }
    
    /**
     * Get Cash Flows
     * @param {Object} filter - Additional MongoDB filter (optional)
     */
    async getCashFlows(filter = {}) {
        if (!this.privacyContext.canAccess(DATA_TYPES.CASH_FLOWS)) {
            console.log('[PrivacyService] 🔒 Blocked: cash_flows');
            return buildPrivacyBlockedResponse(DATA_TYPES.CASH_FLOWS, this.privacyContext);
        }
        
        try {
            const cashFlows = await CashFlow.find({ 
                user_id: this.userId,
                ...filter 
            }).lean();
            
            return {
                data: cashFlows,
                has_data: cashFlows.length > 0,
                data_source: 'database',
                count: cashFlows.length
            };
        } catch (error) {
            console.error('[PrivacyService] Error fetching cash flows:', error);
            return {
                data: null,
                has_data: false,
                data_source: 'error',
                error: error.message
            };
        }
    }
    
    /**
     * Get Goals
     * @param {Object} filter - Additional MongoDB filter (optional)
     */
    async getGoals(filter = {}) {
        if (!this.privacyContext.canAccess(DATA_TYPES.GOALS)) {
            console.log('[PrivacyService] 🔒 Blocked: goals');
            return buildPrivacyBlockedResponse(DATA_TYPES.GOALS, this.privacyContext);
        }
        
        try {
            const goals = await Goal.find({ 
                user_id: this.userId,
                ...filter 
            }).lean();
            
            return {
                data: goals,
                has_data: goals.length > 0,
                data_source: 'database',
                count: goals.length
            };
        } catch (error) {
            console.error('[PrivacyService] Error fetching goals:', error);
            return {
                data: null,
                has_data: false,
                data_source: 'error',
                error: error.message
            };
        }
    }
    
    /**
     * Get Plans
     * @param {Object} filter - Additional MongoDB filter (optional)
     */
    async getPlans(filter = {}) {
        if (!this.privacyContext.canAccess(DATA_TYPES.PLANS)) {
            console.log('[PrivacyService] 🔒 Blocked: plans');
            return buildPrivacyBlockedResponse(DATA_TYPES.PLANS, this.privacyContext);
        }
        
        try {
            const plans = await Plan.find({ 
                user_id: this.userId,
                ...filter 
            }).lean();
            
            return {
                data: plans,
                has_data: plans.length > 0,
                data_source: 'database',
                count: plans.length
            };
        } catch (error) {
            console.error('[PrivacyService] Error fetching plans:', error);
            return {
                data: null,
                has_data: false,
                data_source: 'error',
                error: error.message
            };
        }
    }
    
    /**
     * Get User Profile (demographics, preferences)
     * @param {Array<string>} fields - Specific fields to select (default: all)
     */
    async getUserProfile(fields = null) {
        if (!this.privacyContext.canAccess(DATA_TYPES.USER_PROFILE)) {
            console.log('[PrivacyService] 🔒 Blocked: user_profile');
            return buildPrivacyBlockedResponse(DATA_TYPES.USER_PROFILE, this.privacyContext);
        }
        
        try {
            let query = User.findById(this.userId);
            
            if (fields) {
                query = query.select(fields.join(' '));
            }
            
            const user = await query.lean();
            
            return {
                data: user,
                has_data: !!user,
                data_source: 'database'
            };
        } catch (error) {
            console.error('[PrivacyService] Error fetching user profile:', error);
            return {
                data: null,
                has_data: false,
                data_source: 'error',
                error: error.message
            };
        }
    }
    
    /**
     * Batch fetch multiple data types at once (optimized for common use cases)
     * @param {Array<string>} dataTypes - Array of DATA_TYPES to fetch
     * @returns {Promise<Object>} - Object with keys matching dataTypes
     */
    async batchFetch(dataTypes = []) {
        const results = {};
        
        const promises = dataTypes.map(async (type) => {
            switch (type) {
                case DATA_TYPES.FINANCIAL_ASSETS:
                    results[type] = await this.getFinancialAssets();
                    break;
                case DATA_TYPES.CASH_FLOWS:
                    results[type] = await this.getCashFlows();
                    break;
                case DATA_TYPES.GOALS:
                    results[type] = await this.getGoals();
                    break;
                case DATA_TYPES.PLANS:
                    results[type] = await this.getPlans();
                    break;
                case DATA_TYPES.USER_PROFILE:
                    results[type] = await this.getUserProfile();
                    break;
                default:
                    console.warn(`[PrivacyService] Unknown data type: ${type}`);
            }
        });
        
        await Promise.all(promises);
        
        return results;
    }
    
    /**
     * Get comprehensive financial snapshot (used in Gap Analysis)
     * Combines assets and cash flows with privacy-aware filtering
     */
    async getFinancialSnapshot(goalId = null) {
        const [assetsResult, cashFlowsResult] = await Promise.all([
            this.getFinancialAssets(),
            this.getCashFlows()
        ]);
        
        // If privacy blocks any part, return blocked response
        if (!assetsResult.has_data && assetsResult.data_source === 'privacy_disabled') {
            return assetsResult; // Return privacy block message
        }
        
        if (!cashFlowsResult.has_data && cashFlowsResult.data_source === 'privacy_disabled') {
            return cashFlowsResult;
        }
        
        // Calculate financial metrics
        const assets = assetsResult.data || [];
        const cashFlows = cashFlowsResult.data || [];
        
        // Filter available assets (unallocated or allocated to current goal)
        const availableAssets = assets.filter(a => 
            !a.allocated_to_goal_id || 
            (goalId && a.allocated_to_goal_id.toString() === goalId.toString())
        );
        
        const liquidAssets = availableAssets
            .filter(a => a.record_type === 'Asset' && a.is_liquid)
            .reduce((sum, a) => sum + (a.value || 0), 0);
        
        const investments = availableAssets
            .filter(a => a.record_type === 'Asset' && !a.is_liquid)
            .reduce((sum, a) => sum + (a.value || 0), 0);
        
        const debts = availableAssets
            .filter(a => a.record_type === 'Liability')
            .reduce((sum, a) => sum + (a.value || 0), 0);
        
        const currentSuperBalance = availableAssets
            .filter(a => a.sub_type === 'KiwiSaver')
            .reduce((sum, a) => sum + (a.value || 0), 0);
        
        // Calculate monthly income
        const monthlyIncome = cashFlows
            .filter(f => f.type === 'Income')
            .reduce((sum, f) => {
                const amt = f.amount || 0;
                const freq = f.frequency;
                if (freq === 'Monthly') return sum + amt;
                if (freq === 'Annually') return sum + amt / 12;
                if (freq === 'Fortnightly') return sum + (amt * 26 / 12);
                if (freq === 'Weekly') return sum + (amt * 52 / 12);
                return sum;
            }, 0);
        
        const netPosition = liquidAssets + investments + currentSuperBalance - debts;
        
        return {
            data: {
                liquid_assets: liquidAssets,
                investments,
                debts,
                current_super_balance: currentSuperBalance,
                monthly_income: monthlyIncome,
                net_position: netPosition,
                available_asset_count: availableAssets.length
            },
            has_data: true,
            data_source: 'calculated',
            note: 'Calculated from available (unallocated) assets and cash flows'
        };
    }
}

export default PrivacyAwareDataService;
