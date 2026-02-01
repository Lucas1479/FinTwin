/**
 * Product Search Tools for AI Function Calling
 * 
 * 这是 "AI 负责想参数，代码负责跑逻辑" 的工业级架构。
 * AI 只需要调用 search_products(filter)，后端执行真正的数据库查询。
 * 
 * 优点：
 * - Token 消耗极低（只传递查询参数，不传递所有产品数据）
 * - 可扩展到 10万+ 产品
 * - AI 可以进行多轮搜索精炼结果
 */

import Product from '../models/productModel.js';

const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

// ==========================================
// Tool Definitions (给 LLM 的函数描述)
// ==========================================

export const productToolDefinitions = [
    {
        name: 'build_optimized_portfolios',
        description: `**PRIMARY TOOL** - Builds 3 pre-optimized portfolio options in one call.
Given target allocation, this tool:
1. Searches for candidate products
2. Automatically builds 3 different portfolios (lowest_cost, diversified, balanced)
3. Optimizes weights for each to match target exposure
4. Returns ready-to-use portfolio options with calculated_exposure and fees

This is the ONLY tool you need for most cases. Just call it once and use the results.`,
        parameters: {
            type: 'object',
            properties: {
                target_growth_pct: {
                    type: 'number',
                    description: 'Target growth/equity exposure percentage (0-100).'
                },
                target_defensive_pct: {
                    type: 'number',
                    description: 'Target defensive/bond exposure percentage (0-100).'
                },
                target_liquidity_pct: {
                    type: 'number',
                    description: 'Target cash/liquidity exposure percentage (0-100).'
                },
                max_fees: {
                    type: 'number',
                    description: 'Maximum total fees percentage (e.g., 1.5 means ≤1.5%).'
                },
                is_retirement_goal: {
                    type: 'boolean',
                    description: 'If true, prioritizes KiwiSaver products for retirement savings.'
                },
                is_home_goal: {
                    type: 'boolean',
                    description: 'If true, indicates a home purchase goal (first home or investment property).'
                },
                has_employment_income: {
                    type: 'boolean',
                    description: 'If true, user has employment income and can access KiwiSaver employer contributions.'
                },
                user_preferences: {
                    type: 'object',
                    description: 'Optional user preferences to influence portfolio selection',
                    properties: {
                        prefer_local_providers: { type: 'boolean', description: 'Prefer NZ-based providers' },
                        prefer_ethical: { type: 'boolean', description: 'Prefer ESG/ethical funds' },
                        prefer_passive: { type: 'boolean', description: 'Prefer index/passive funds over active' }
                    }
                }
            },
            required: ['target_growth_pct', 'target_defensive_pct', 'target_liquidity_pct']
        }
    },
    {
        name: 'search_portfolio_candidates',
        description: `(ADVANCED) Get raw product candidates without optimization.
Use this only if you need to manually select products or build custom portfolios.
For standard use, prefer build_optimized_portfolios instead.`,
        parameters: {
            type: 'object',
            properties: {
                target_growth_pct: { type: 'number' },
                target_defensive_pct: { type: 'number' },
                target_liquidity_pct: { type: 'number' },
                max_fees: { type: 'number' },
                is_retirement_goal: { type: 'boolean' }
            },
            required: ['target_growth_pct', 'target_defensive_pct', 'target_liquidity_pct']
        }
    },
    {
        name: 'search_products',
        description: `(LOW PRIORITY) Search products by specific criteria within a single category.
Only use this if search_portfolio_candidates doesn't return enough candidates.
For most cases, search_portfolio_candidates is sufficient.`,
        parameters: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Product category filter. Options: Growth, Balanced, Conservative, Aggressive, Income, Cash, Default',
                    enum: ['Growth', 'Balanced', 'Conservative', 'Aggressive', 'Income', 'Cash', 'Default']
                },
                strategy: {
                    type: 'string',
                    description: 'Investment strategy filter. Options: Growth, Balanced, Conservative, Aggressive, Income, Cash, Default',
                    enum: ['Growth', 'Balanced', 'Conservative', 'Aggressive', 'Income', 'Cash', 'Default']
                },
                max_fees: {
                    type: 'number',
                    description: 'Maximum total fees percentage (e.g., 1.5 means ≤1.5%)'
                },
                min_growth_exposure: {
                    type: 'number',
                    description: 'Minimum growth/equity exposure percentage (0-100)'
                },
                max_growth_exposure: {
                    type: 'number',
                    description: 'Maximum growth/equity exposure percentage (0-100)'
                },
                provider: {
                    type: 'string',
                    description: 'Filter by specific provider name (partial match)'
                },
                exclude_kiwisaver: {
                    type: 'boolean',
                    description: 'If true, excludes KiwiSaver products (for non-retirement goals)'
                },
                sort_by: {
                    type: 'string',
                    description: 'Sort results by field',
                    enum: ['fees_asc', 'fees_desc', 'return_desc', 'growth_exposure_desc']
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (default 15, max 30)'
                }
            },
            required: []
        }
    },
    {
        name: 'get_product_details',
        description: `(OPTIONAL) Get detailed information about specific products.
Not needed if using optimize_portfolio_weights - it already returns product details.
Only use this if you need extra info like returns or risk metrics.`,
        parameters: {
            type: 'object',
            properties: {
                product_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of product IDs to fetch details for (max 8)'
                }
            },
            required: ['product_ids']
        }
    },
    {
        name: 'calculate_portfolio_exposure',
        description: `(VERIFICATION ONLY) Calculate weighted exposure for given products and weights.
Not needed if using optimize_portfolio_weights - it already calculates exposure.
Use this only if you manually assigned weights and need to verify.`,
        parameters: {
            type: 'object',
            properties: {
                products: {
                    type: 'array',
                    description: 'Array of {product_id, weight_pct} objects',
                    items: {
                        type: 'object',
                        properties: {
                            product_id: { type: 'string', description: 'Product ID from search results' },
                            weight_pct: { type: 'number', description: 'Weight percentage (0-100)' }
                        }
                    }
                },
                target_exposure: {
                    type: 'object',
                    description: 'Target exposure to compare against',
                    properties: {
                        growth: { type: 'number' },
                        defensive: { type: 'number' },
                        liquidity: { type: 'number' }
                    }
                }
            },
            required: ['products']
        }
    },
    {
        name: 'optimize_portfolio_weights',
        description: `**RECOMMENDED** - Automatically find optimal weights for products to match target exposure.
Given a set of product IDs and a target allocation, this tool uses optimization to find the best weights.
This is more accurate than manual calculation and guarantees the best possible fit.`,
        parameters: {
            type: 'object',
            properties: {
                product_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of product IDs to include in portfolio (2-6 products)'
                },
                target_exposure: {
                    type: 'object',
                    description: 'Target growth/defensive/liquidity percentages',
                    properties: {
                        growth: { type: 'number', description: 'Target growth %' },
                        defensive: { type: 'number', description: 'Target defensive %' },
                        liquidity: { type: 'number', description: 'Target liquidity/cash %' }
                    },
                    required: ['growth', 'defensive', 'liquidity']
                },
                constraints: {
                    type: 'object',
                    description: 'Optional constraints on weights',
                    properties: {
                        min_weight_per_product: { type: 'number', description: 'Minimum weight per product (default 5%)' },
                        max_weight_per_product: { type: 'number', description: 'Maximum weight per product (default 70%)' }
                    }
                }
            },
            required: ['product_ids', 'target_exposure']
        }
    }
];

// ==========================================
// Tool Implementations (实际执行的函数)
// ==========================================

/**
 * 🌟 PRIMARY TOOL: 一次性构建3个预优化的投资组合
 * 
 * 这个工具是 AI 的主要入口，它会：
 * 1. 搜索候选产品
 * 2. 构建3个不同策略的组合（最低费率、多样化、平衡）
 * 3. 为每个组合优化权重以匹配目标配置
 * 4. 返回可直接使用的组合选项
 * 
 * AI 的角色变成：根据用户上下文解释这些组合，推荐最合适的
 * 
 * @param {Object} params
 * @returns {Promise<Object>} - 3个预优化的投资组合
 */
export async function buildOptimizedPortfolios(params = {}) {
    const {
        target_growth_pct = 60,
        target_defensive_pct = 30,
        target_liquidity_pct = 10,
        max_fees,
        is_retirement_goal = false,
        is_home_goal = false,
        has_employment_income = false,
        user_preferences = {}
    } = params;

    console.log(`[ProductTools] buildOptimizedPortfolios: target=${target_growth_pct}/${target_defensive_pct}/${target_liquidity_pct}, retirement=${is_retirement_goal}, home=${is_home_goal}, employment=${has_employment_income}`);

    // Step 1: 获取候选产品
    const candidates = await searchPortfolioCandidates({
        target_growth_pct,
        target_defensive_pct,
        target_liquidity_pct,
        max_fees,
        is_retirement_goal,
        is_home_goal
    });

    if (candidates.summary.total_candidates < 3) {
        return { error: 'Not enough products found to build portfolios', candidates_found: candidates.summary.total_candidates };
    }

    const allProducts = [
        ...candidates.candidates.growth,
        ...candidates.candidates.defensive,
        ...candidates.candidates.liquidity
    ];

    // === 强制 KiwiSaver 检查（方案 A）===
    // 对于有就业收入的退休或购房目标，强制至少包含一个 KiwiSaver 产品
    const requiresKiwiSaver = (is_retirement_goal || is_home_goal) && has_employment_income;
    if (requiresKiwiSaver) {
        const kiwiSaverProducts = allProducts.filter(p => 
            p.category?.toLowerCase().includes('kiwisaver')
        );
        
        if (kiwiSaverProducts.length === 0) {
            const goalType = is_retirement_goal ? 'retirement' : 'home purchase';
            console.warn(`[ProductTools] ⚠️ No KiwiSaver products in candidate pool for ${goalType} goal with employment income`);
            return { 
                error: `No suitable KiwiSaver products available. For ${goalType} goals with employment income, KiwiSaver is strongly recommended due to employer contribution (3%) and government contribution benefits ($521/year).`,
                suggestion: 'Please ensure KiwiSaver products are active in the system.',
                candidates_found: candidates.summary.total_candidates,
                kiwisaver_found: 0
            };
        }
        console.log(`[ProductTools] ✅ Found ${kiwiSaverProducts.length} KiwiSaver products for ${is_retirement_goal ? 'retirement' : 'home'} goal`);
    }

    // 创建产品查找映射
    const productMap = new Map(allProducts.map(p => [p.id, p]));

    // Step 2: 定义3种组合策略
    const alignmentScore = (p) => {
        const growth = Number.isFinite(p.allocation?.growth) ? p.allocation.growth : 0;
        const defensive = Number.isFinite(p.allocation?.defensive) ? p.allocation.defensive : 0;
        const cash = Number.isFinite(p.allocation?.cash) ? p.allocation.cash : 0;
        return -(
            Math.abs(growth - target_growth_pct) +
            Math.abs(defensive - target_defensive_pct) +
            Math.abs(cash - target_liquidity_pct)
        );
    };

    const rankByAlignment = (list) => [...list].sort((a, b) => alignmentScore(b) - alignmentScore(a));
    const topByAlignment = (list, limit = 20) => rankByAlignment(list).slice(0, limit);

    const portfolioStrategies = [
        {
            id: 'lowest_cost',
            name: 'Lowest Cost Portfolio',
            description: 'Minimizes fees to maximize long-term compound returns',
            selectProducts: (growth, defensive, liquidity) => {
                // 纯粹追求最低费率：直接选费率最低的产品
                const growthPool = topByAlignment(growth).sort((a, b) => (a.fees || 0) - (b.fees || 0));
                const defensivePool = topByAlignment(defensive).sort((a, b) => (a.fees || 0) - (b.fees || 0));
                const liquidityPool = topByAlignment(liquidity).sort((a, b) => (a.fees || 0) - (b.fees || 0));
                const allProducts = [...growthPool, ...defensivePool, ...liquidityPool];
                
                // 按费率排序所有产品
                const sorted = [...allProducts].sort((a, b) => (a.fees || 0) - (b.fees || 0));
                
                // 如果需要 KiwiSaver，找到费率最低的 KiwiSaver
                const requiresKS = is_retirement_goal || is_home_goal;
                const ksProducts = requiresKS ? sorted.filter(p => p.category?.toLowerCase().includes('kiwisaver')) : [];
                
                const selected = [];
                const usedIds = new Set();
                
                // 策略：选3个费率最低的产品（降低优化难度）
                if (requiresKS && ksProducts.length > 0) {
                    // 先加入费率最低的 KiwiSaver
                    selected.push(ksProducts[0]);
                    usedIds.add(ksProducts[0].id);
                }
                
                // 然后选费率最低的产品，确保包含各个资产类别
                // 优先从每个类别选至少一个
                const addFromPool = (pool, count = 1) => {
                    let added = 0;
                    for (const p of pool) {
                        if (selected.length >= 3) break;
                        if (!usedIds.has(p.id)) {
                            selected.push(p);
                            usedIds.add(p.id);
                            added++;
                            if (added >= count) break;
                        }
                    }
                };
                
                // 从每个类别至少选一个（最便宜的）
                if (selected.length < 3) addFromPool(growthPool, 1);
                if (selected.length < 3) addFromPool(defensivePool, 1);
                if (selected.length < 3) addFromPool(liquidityPool, 1);
                
                // 补充到3个（从全局最便宜的产品中选）
                for (const p of sorted) {
                    if (selected.length >= 3) break;
                    if (!usedIds.has(p.id)) {
                        selected.push(p);
                        usedIds.add(p.id);
                    }
                }
                
                return selected;
            }
        },
        {
            id: 'diversified',
            name: 'Diversified Portfolio',
            description: 'Spreads risk across multiple providers and asset classes',
            selectProducts: (growth, defensive, liquidity) => {
                // 选择不同 provider 的产品 - 目标4个产品以实现更好的分散
                // 关键：确保每个资产类别都有代表，然后才考虑供应商分散
                const selected = [];
                const usedProviders = new Set();
                const growthPool = rankByAlignment(growth);
                const defensivePool = rankByAlignment(defensive);
                const liquidityPool = rankByAlignment(liquidity);
                
                // === 强制 KiwiSaver 逻辑 ===
                if (is_retirement_goal || is_home_goal) {
                    const ksCandidate = [...growthPool, ...defensivePool, ...liquidityPool]
                        .find(p => p.category?.toLowerCase().includes('kiwisaver'));
                    if (ksCandidate) {
                        selected.push(ksCandidate);
                        usedProviders.add(ksCandidate.provider);
                    }
                }

                // **改进逻辑**：先从每个资产类别选一个不同provider的产品（确保资产配置覆盖）
                const pools = [
                    { name: 'growth', pool: growthPool },
                    { name: 'defensive', pool: defensivePool },
                    { name: 'liquidity', pool: liquidityPool }
                ];
                
                for (const { pool } of pools) {
                    if (selected.length >= 4) break;
                    // 从这个类别中找一个不同provider的产品
                    for (const p of pool) {
                        if (!usedProviders.has(p.provider) && !selected.find(s => s.id === p.id)) {
                            selected.push(p);
                            usedProviders.add(p.provider);
                            break; // 找到一个就停止，继续下一个类别
                        }
                    }
                }
                
                // 如果还不够4个，从剩余产品中选择不同provider的
                for (const { pool } of pools) {
                    if (selected.length >= 4) break;
                    for (const p of pool) {
                        if (!usedProviders.has(p.provider) && !selected.find(s => s.id === p.id)) {
                            selected.push(p);
                            usedProviders.add(p.provider);
                            if (selected.length >= 4) break;
                        }
                    }
                }
                
                // 如果还不够，放宽provider限制，只要产品不重复即可
                if (selected.length < 4) {
                    for (const { pool } of pools) {
                        if (selected.length >= 4) break;
                        for (const p of pool) {
                    if (!selected.find(s => s.id === p.id)) {
                        selected.push(p);
                                if (selected.length >= 4) break;
                    }
                }
                    }
                }
                
                return selected;
            }
        },
        {
            id: 'balanced',
            name: 'Balanced Portfolio',
            description: 'Balances cost, diversification, and historical performance',
            selectProducts: (growth, defensive, liquidity) => {
                // 综合评分：费率低 + 回报高 + 风险配置适中
                // 让 KiwiSaver 和 Fund 产品公平竞争，基于实际表现评分
                const score = (p) => {
                    const feeScore = 1 / (1 + (p.fees || 0.5));  // 费率越低分越高
                    const returnScore = (p.return_5yr || 0) / 10;  // 回报越高分越高
                    const alignBoost = alignmentScore(p) / 100;
                    return feeScore + returnScore + alignBoost;
                };

                const all = [...growth, ...defensive, ...liquidity]
                    .map(p => ({ ...p, score: score(p) }))
                    .sort((a, b) => b.score - a.score);
                
                // === 强制 KiwiSaver 逻辑 ===
                // 确保至少包含一个 KiwiSaver（如果是退休或购房目标）
                const selected = [];
                const usedIds = new Set();
                
                if (is_retirement_goal || is_home_goal) {
                    const ksProduct = all.find(p => p.category?.toLowerCase().includes('kiwisaver'));
                    if (ksProduct) {
                        selected.push(ksProduct);
                        usedIds.add(ksProduct.id);
                    }
                }
                
                // 从每个类别选择评分最高的
                for (const cat of [rankByAlignment(growth), rankByAlignment(defensive), rankByAlignment(liquidity)]) {
                    if (cat.length > 0) {
                        const best = cat.map(p => ({...p, score: score(p)})).reduce((a, b) => a.score > b.score ? a : b);
                        if (!usedIds.has(best.id)) {
                        selected.push(best);
                        usedIds.add(best.id);
                    }
                }
                }
                // 灵活补充到3-4个（根据评分决定）
                for (const p of all) {
                    if (selected.length >= 4) break;
                    if (!usedIds.has(p.id)) {
                        selected.push(p);
                        usedIds.add(p.id);
                    }
                }
                return selected;
            }
        }
    ];

    // Step 3: 为每个策略构建并优化组合
    const targetExposure = { 
        growth: target_growth_pct, 
        defensive: target_defensive_pct, 
        liquidity: target_liquidity_pct 
    };

    const portfolioOptions = [];
    const usedProductIds = new Set();

    const maxAllowedDeviation = 18;  // 放宽偏差限制到18%，提高组合成功率
    for (const strategy of portfolioStrategies) {
        const filterByUsed = (list) => list.filter(p => !usedProductIds.has(p.id));
        const filteredGrowth = filterByUsed(candidates.candidates.growth);
        const filteredDefensive = filterByUsed(candidates.candidates.defensive);
        const filteredLiquidity = filterByUsed(candidates.candidates.liquidity);

        const selectedProducts = strategy.selectProducts(
            filteredGrowth.length ? filteredGrowth : candidates.candidates.growth,
            filteredDefensive.length ? filteredDefensive : candidates.candidates.defensive,
            filteredLiquidity.length ? filteredLiquidity : candidates.candidates.liquidity
        );

        if (selectedProducts.length < 2) continue;

        // 打印选出的产品配置，用于诊断
        console.log(`[ProductTools] ${strategy.id} selected products:`);
        selectedProducts.forEach(p => {
            console.log(`  - ${p.name}: ${(p.allocation.growth || 0).toFixed(2)}% growth / ${(p.allocation.defensive || 0).toFixed(2)}% defensive / ${(p.allocation.cash || 0).toFixed(2)}% cash`);
        });

        // 使用优化器计算最佳权重
        // 为 diversified 策略设置更严格的权重约束，确保真正的分散
        const constraints = strategy.id === 'diversified' 
            ? { min_weight_per_product: 15, max_weight_per_product: 40 }  // 分散持仓：15-40%
            : {};  // 其他策略使用默认约束（5-70%）
        
        const optimized = await optimizePortfolioWeights({
            product_ids: selectedProducts.map(p => p.id),
            target_exposure: targetExposure,
            constraints: constraints
        });

        if (optimized.error) {
            console.warn(`[ProductTools] Optimization failed for ${strategy.id}: ${optimized.error}`);
            continue;
        }
        const maxDeviation = Math.max(
            Math.abs(optimized.deviation?.growth || 0),
            Math.abs(optimized.deviation?.defensive || 0),
            Math.abs(optimized.deviation?.liquidity || 0)
        );
        if (maxDeviation > maxAllowedDeviation) {
            console.warn(`[ProductTools] ${strategy.id} skipped (deviation ${maxDeviation}% > ${maxAllowedDeviation}%)`);
            continue;
        }

        // === 验证 KiwiSaver 包含性（最后保障）===
        if (requiresKiwiSaver) {
            const hasKiwiSaver = optimized.optimized_products.some(p => 
                p.name?.toLowerCase().includes('kiwisaver') || 
                selectedProducts.find(sp => sp.id === p.product_id)?.category?.toLowerCase().includes('kiwisaver')
            );
            if (!hasKiwiSaver) {
                console.warn(`[ProductTools] ⚠️ ${strategy.id} does not include KiwiSaver - skipping (required for ${is_retirement_goal ? 'retirement' : 'home'} goal with employment income)`);
                continue;
            }
        }

        // 打印每个组合的费率信息用于调试
        console.log(`[ProductTools] ${strategy.name} - Total Fees: ${optimized.total_fees_estimate?.toFixed(2)}%`);
        optimized.optimized_products.forEach(p => {
            console.log(`  - ${p.name}: ${p.fees?.toFixed(2)}% fee, ${p.weight_pct?.toFixed(1)}% weight`);
        });

        portfolioOptions.push({
            option_id: strategy.id,
            option_name: strategy.name,
            description: `${strategy.description}. Achieves ${optimized.calculated_exposure.growth}/${optimized.calculated_exposure.defensive}/${optimized.calculated_exposure.liquidity} exposure.`,
            total_fees_estimate: optimized.total_fees_estimate,
            calculated_exposure: optimized.calculated_exposure,
            fit_quality: optimized.fit_quality,
            deviation: optimized.deviation,
            products: optimized.optimized_products.map(p => ({
                product_id: p.product_id,
                name: p.name,
                provider: p.provider,
                weight_pct: p.weight_pct,
                allocation: p.allocation,
                rationale: `${p.name} - ${(p.allocation.growth || 0).toFixed(2)}% growth / ${(p.allocation.defensive || 0).toFixed(2)}% defensive / ${(p.allocation.cash || 0).toFixed(2)}% cash`
            }))
        });
        optimized.optimized_products.forEach(p => usedProductIds.add(p.product_id));
    }

    console.log(`[ProductTools] Built ${portfolioOptions.length} optimized portfolios`);
    
    // 按方法排序（保持策略定义的顺序）：Lowest Cost -> Diversified -> Balanced
    // 不按结果费率排序

    return {
        target_exposure: targetExposure,
        portfolio_options: portfolioOptions,
        summary: {
            portfolios_built: portfolioOptions.length,
            candidates_searched: candidates.summary.total_candidates,
            best_fit: portfolioOptions.reduce((best, p) => 
                (!best || (p.fit_quality === 'excellent' && best.fit_quality !== 'excellent') || p.total_fees_estimate < best.total_fees_estimate) ? p : best
            , null)?.option_id
        },
        ai_guidance: `
These 3 portfolios all match the ${target_growth_pct}/${target_defensive_pct}/${target_liquidity_pct} target exposure.

Your role as AI advisor:
1. Review the user's specific situation (goal, timeline, risk tolerance)
2. Explain WHY one portfolio might suit them better
3. Highlight trade-offs (e.g., "lowest_cost saves fees but has less diversification")
4. If user has special needs, you can call optimize_portfolio_weights with custom product selection
`
    };
}

/**
 * 智能组合搜索 - 一次性为所有资产类别找到候选产品
 * 这是最高效的方式，AI 只需调用一次就能获得完整的候选列表
 * 
 * @param {Object} params
 * @returns {Promise<Object>} - 分类整理好的产品候选列表
 */
export async function searchPortfolioCandidates(params = {}) {
    const {
        target_growth_pct = 60,
        target_defensive_pct = 30,
        target_liquidity_pct = 10,
        max_fees,
        is_retirement_goal = false,
        is_home_goal = false
    } = params;

    // Final counts: 15 growth, 15 defensive, 5 liquidity = 35 total
    const growthLimit = 15;
    const defensiveLimit = 15;
    const liquidityLimit = 5;
    
    console.log(`[ProductTools] searchPortfolioCandidates: growth=${target_growth_pct}%, defensive=${target_defensive_pct}%, liquidity=${target_liquidity_pct}%`);
    console.log('[ProductTools] Fetching full candidate pools for scoring');

    // 构建基础查询条件
    const baseQuery = { isActive: true };
    if (max_fees !== undefined) {
        baseQuery['metrics.fees.total'] = { $lte: max_fees };
    }

    // 根据是否是退休或购房目标决定是否包含 KiwiSaver
    // 退休目标：KiwiSaver 有雇主贡献 (3%) + 政府补贴 ($521/年)
    // 购房目标：KiwiSaver 支持 First Home Withdrawal + First Home Grant
    const excludeKiwiSaver = !(is_retirement_goal || is_home_goal);

    // 并行查询三个资产类别
    // 策略：让 KiwiSaver 和 Fund 产品公平竞争，基于回报、费用、风险配置进行筛选
    // 不在查询阶段给 KiwiSaver 特殊待遇，只在最终选择阶段确保至少有一个 KiwiSaver
    const [growthProducts, defensiveProducts, liquidityProducts] = await Promise.all([
        // Growth 类：高股票配置的产品 (15个)
        target_growth_pct > 0 ? Product.find({
            ...baseQuery,
            $or: [
                { strategy: { $in: ['Growth', 'Aggressive'] } },
                { 'allocation.growth': { $gte: 60 } }
            ],
            ...(excludeKiwiSaver ? { category: { $not: /kiwisaver/i } } : {})
        })
            .select('name provider category strategy allocation metrics.fees.total metrics.returns.y1 metrics.returns.y5 metrics.returns.annualized5yr description')
            .sort({ 'metrics.fees.total': 1 })
            .lean() : Promise.resolve([]),

        // Defensive 类：债券/保守型产品 (15个)
        target_defensive_pct > 0 ? Product.find({
            ...baseQuery,
            $or: [
                { strategy: { $in: ['Conservative', 'Income', 'Balanced'] } },
                { 'allocation.defensive': { $gte: 40 } }
            ],
            ...(excludeKiwiSaver ? { category: { $not: /kiwisaver/i } } : {})
        })
            .select('name provider category strategy allocation metrics.fees.total metrics.returns.y1 metrics.returns.y5 metrics.returns.annualized5yr description')
            .sort({ 'metrics.fees.total': 1 })
            .lean() : Promise.resolve([]),

        // Liquidity 类：现金/货币市场产品 (5个)
        target_liquidity_pct > 0 ? Product.find({
            ...baseQuery,
            $or: [
                { strategy: { $in: ['Cash', 'Default'] } },
                { 'allocation.cash': { $gte: 80 } }
            ],
            ...(excludeKiwiSaver ? { category: { $not: /kiwisaver/i } } : {})
        })
            .select('name provider category strategy allocation metrics.fees.total metrics.returns.y1 metrics.returns.y5 metrics.returns.annualized5yr description')
            .sort({ 'metrics.fees.total': 1 })
            .lean() : Promise.resolve([])
    ]);

    // 格式化产品数据 - 确保 allocation 数据清晰可用于计算
    const formatProduct = (p) => {
        const growth = p.allocation?.growth ?? 0;
        const defensive = p.allocation?.defensive ?? 0;
        const cash = p.allocation?.cash ?? 0;
        
        const return1y = toNumber(p.metrics?.returns?.y1);
        const return5y = toNumber(p.metrics?.returns?.y5);
        const return5yAnnualized = toNumber(p.metrics?.returns?.annualized5yr);

        return {
            id: p._id.toString(),
            name: p.name,
            provider: p.provider,
            category: p.category,
            strategy: p.strategy,
            fees: p.metrics?.fees?.total ?? 0,
            return_1y: return1y,
            return_5yr: return5y ?? return5yAnnualized,
            // 内部资产配置 - 用于计算加权 exposure
            allocation: {
                growth: growth,
                defensive: defensive,
                cash: cash
            },
            // 便于 AI 快速参考的摘要
            allocation_summary: `${growth.toFixed(2)}% growth / ${defensive.toFixed(2)}% defensive / ${cash.toFixed(2)}% cash`
        };
    };

    const scoreWeights = is_retirement_goal
        ? { return5y: 1.0, return1y: 0.4, fees: 1.2, alignment: 0.8 }
        : { return5y: 1.2, return1y: 0.6, fees: 0.8, alignment: 1.0 };
    const baselineConfig = is_retirement_goal
        ? { minScore: -0.5, percentileCutoff: 0.3 }
        : { minScore: 0.0, percentileCutoff: 0.3 };

    const scoreCandidate = (p) => {
        const return5y = Number.isFinite(p.return_5yr) ? p.return_5yr : null;
        const return1y = Number.isFinite(p.return_1y) ? p.return_1y : null;
        const fees = Number.isFinite(p.fees) ? p.fees : 0;
        const growth = Number.isFinite(p.allocation?.growth) ? p.allocation.growth : 0;
        const defensive = Number.isFinite(p.allocation?.defensive) ? p.allocation.defensive : 0;
        const cash = Number.isFinite(p.allocation?.cash) ? p.allocation.cash : 0;

        const targetGrowth = target_growth_pct ?? 0;
        const targetDefensive = target_defensive_pct ?? 0;
        const targetCash = target_liquidity_pct ?? 0;
        const alignmentDiff =
            Math.abs(growth - targetGrowth) +
            Math.abs(defensive - targetDefensive) +
            Math.abs(cash - targetCash);

        const baseReturn = return5y ?? return1y ?? 0;
        const returnScore =
            (return5y ?? 0) * scoreWeights.return5y +
            (return1y ?? 0) * scoreWeights.return1y;
        const feePenalty = fees * scoreWeights.fees;
        const alignmentPenalty = (alignmentDiff / 100) * scoreWeights.alignment * 10;
        const negativePenalty = baseReturn < 0 ? Math.abs(baseReturn) * 1.5 : 0;

        return returnScore - feePenalty - alignmentPenalty - negativePenalty;
    };

    const rankCandidates = (list, limit) => {
        if (!Array.isArray(list) || list.length === 0) return [];
        const scored = list
            .map((p) => ({ ...p, _score: scoreCandidate(p) }))
            .sort((a, b) => (b._score - a._score) || ((a.fees || 0) - (b.fees || 0)));
        // Hard filter: exclude only negative 5Y return candidates.
        // Keep products with missing/unknown 5Y returns to avoid empty pools.
        const eligible = scored.filter((p) => {
            // Strict baseline: must have numeric 5Y return and it must be non-negative
            if (!Number.isFinite(p.return_5yr)) return false;
            return p.return_5yr >= 0;
        });
        if (eligible.length === 0) return [];

        const cutoffIndex = Math.floor(eligible.length * baselineConfig.percentileCutoff);
        const cutoffScore = eligible[Math.min(Math.max(cutoffIndex, 0), eligible.length - 1)]?._score ?? baselineConfig.minScore;
        const baselineScore = Math.max(cutoffScore, baselineConfig.minScore);

        const baselineFiltered = eligible.filter((p) => p._score >= baselineScore);
        const finalPool = baselineFiltered.length > 0 ? baselineFiltered : eligible;
        return finalPool.slice(0, limit).map(({ _score, ...rest }) => rest);
    };

    const formattedGrowth = growthProducts.map(formatProduct);
    const formattedDefensive = defensiveProducts.map(formatProduct);
    const formattedLiquidity = liquidityProducts.map(formatProduct);

    const rankedGrowth = rankCandidates(formattedGrowth, growthLimit);
    const rankedDefensive = rankCandidates(formattedDefensive, defensiveLimit);
    const rankedLiquidity = rankCandidates(formattedLiquidity, liquidityLimit);

    const result = {
        target_allocation: {
            growth: target_growth_pct,
            defensive: target_defensive_pct,
            liquidity: target_liquidity_pct
        },
        candidates: {
            growth: rankedGrowth,
            defensive: rankedDefensive,
            liquidity: rankedLiquidity
        },
        summary: {
            total_candidates: rankedGrowth.length + rankedDefensive.length + rankedLiquidity.length,
            growth_count: rankedGrowth.length,
            defensive_count: rankedDefensive.length,
            liquidity_count: rankedLiquidity.length
        },
        next_step: `Use optimize_portfolio_weights() to build portfolios:
1. Pick 2-4 product IDs from candidates above
2. Call optimize_portfolio_weights({ product_ids: [...], target_exposure: { growth: ${target_growth_pct}, defensive: ${target_defensive_pct}, liquidity: ${target_liquidity_pct} } })
3. The optimizer returns optimal weights and calculated_exposure automatically
4. Repeat for 2-3 different product combinations (lowest fees, diversified, etc.)`
    };

    console.log(`[ProductTools] Found: ${result.summary.growth_count} growth, ${result.summary.defensive_count} defensive, ${result.summary.liquidity_count} liquidity`);
    
    return result;
}

/**
 * 搜索产品 - AI调用这个工具来筛选产品（单类别搜索）
 * @param {Object} params - 搜索参数
 * @returns {Promise<Array>} - 匹配的产品列表（精简版）
 */
export async function searchProducts(params = {}) {
    const {
        category,
        strategy,
        max_fees,
        min_growth_exposure,
        max_growth_exposure,
        provider,
        exclude_kiwisaver = false,
        sort_by = 'fees_asc',
        limit = 15
    } = params;

    // 构建查询条件
    const query = { isActive: true };

    if (category) {
        query.category = { $regex: new RegExp(category, 'i') };
    }

    if (strategy) {
        query.strategy = { $regex: new RegExp(strategy, 'i') };
    }

    if (max_fees !== undefined) {
        query['metrics.fees.total'] = { $lte: max_fees };
    }

    if (min_growth_exposure !== undefined || max_growth_exposure !== undefined) {
        query['allocation.growth'] = {};
        if (min_growth_exposure !== undefined) {
            query['allocation.growth'].$gte = min_growth_exposure;
        }
        if (max_growth_exposure !== undefined) {
            query['allocation.growth'].$lte = max_growth_exposure;
        }
    }

    if (provider) {
        query.provider = { $regex: new RegExp(provider, 'i') };
    }

    // 排除 KiwiSaver（用于非退休目标）
    if (exclude_kiwisaver) {
        query.category = query.category 
            ? { $and: [query.category, { $not: /kiwisaver/i }] }
            : { $not: /kiwisaver/i };
    }

    // 构建排序
    let sortOption = {};
    switch (sort_by) {
        case 'fees_asc':
            sortOption = { 'metrics.fees.total': 1 };
            break;
        case 'fees_desc':
            sortOption = { 'metrics.fees.total': -1 };
            break;
        case 'return_desc':
            sortOption = { 'metrics.returns.y5': -1, 'metrics.returns.y1': -1 };
            break;
        case 'growth_exposure_desc':
            sortOption = { 'allocation.growth': -1 };
            break;
        default:
            sortOption = { 'metrics.fees.total': 1 };
    }

    // 限制返回数量（增加到30个以覆盖更多选择）
    const effectiveLimit = Math.min(Math.max(1, limit), 30);

    try {
        const products = await Product.find(query)
            .select('name provider category strategy allocation metrics.fees.total metrics.returns.y1 metrics.returns.y5 metrics.returns.annualized5yr description')
            .sort(sortOption)
            .limit(effectiveLimit)
            .lean();

        // 返回精简版产品信息（格式与 searchPortfolioCandidates 一致）
        return products.map(p => {
            const growth = p.allocation?.growth ?? 0;
            const defensive = p.allocation?.defensive ?? 0;
            const cash = p.allocation?.cash ?? 0;
            const return1y = toNumber(p.metrics?.returns?.y1);
            const return5y = toNumber(p.metrics?.returns?.y5);
            const return5yAnnualized = toNumber(p.metrics?.returns?.annualized5yr);
            return {
                id: p._id.toString(),
                name: p.name,
                provider: p.provider,
                category: p.category,
                strategy: p.strategy,
                fees: p.metrics?.fees?.total ?? 0,
                return_1y: return1y,
                return_5yr: return5y ?? return5yAnnualized,
                allocation: { growth, defensive, cash },
                allocation_summary: `${growth.toFixed(2)}% growth / ${defensive.toFixed(2)}% defensive / ${cash.toFixed(2)}% cash`
            };
        });
    } catch (err) {
        console.error('[ProductTools] searchProducts error:', err);
        return [];
    }
}

/**
 * 获取产品详情 - AI 在初步筛选后获取完整信息
 * @param {Object} params 
 * @returns {Promise<Array>}
 */
export async function getProductDetails(params) {
    const { product_ids = [] } = params;
    
    if (!product_ids.length) return [];
    
    // 限制最多8个产品的详情请求（配合更大的组合搜索）
    const limitedIds = product_ids.slice(0, 8);

    try {
        const products = await Product.find({
            _id: { $in: limitedIds },
            isActive: true
        }).lean();

        return products.map(p => ({
            id: p._id.toString(),
            name: p.name,
            provider: p.provider,
            category: p.category,
            strategy: p.strategy,
            description: p.description,
            fees: p.metrics?.fees?.total,
            fee_breakdown: p.metrics?.fees,
            returns: p.metrics?.returns,
            allocation: p.allocation,
            risk_score: p.metrics?.risk?.score,
            volatility: p.metrics?.risk?.volatility
        }));
    } catch (err) {
        console.error('[ProductTools] getProductDetails error:', err);
        return [];
    }
}

/**
 * 计算投资组合的加权 exposure
 * AI 调用此工具来验证其选择的产品和权重是否满足目标配比
 * 
 * @param {Object} params
 * @param {Array} params.products - [{product_id, weight_pct}, ...]
 * @param {Object} params.target_exposure - {growth, defensive, liquidity}
 * @returns {Promise<Object>} - 计算结果和验证信息
 */
export async function calculatePortfolioExposure(params) {
    const { products = [], target_exposure } = params;
    
    if (!products.length) {
        return { error: 'No products provided' };
    }

    // 验证权重总和
    const totalWeight = products.reduce((sum, p) => sum + (p.weight_pct || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
        return { 
            error: `Weights must sum to 100%, got ${totalWeight.toFixed(1)}%`,
            provided_weights: products.map(p => ({ id: p.product_id, weight: p.weight_pct }))
        };
    }

    // 获取产品的 allocation 数据
    const productIds = products.map(p => p.product_id).filter(Boolean);
    
    try {
        const dbProducts = await Product.find({
            _id: { $in: productIds },
            isActive: true
        }).select('name allocation metrics.fees.total').lean();

        const productMap = new Map(dbProducts.map(p => [p._id.toString(), p]));

        // 计算加权 exposure
        let totalGrowth = 0;
        let totalDefensive = 0;
        let totalLiquidity = 0;
        let totalFees = 0;
        const breakdown = [];

        for (const item of products) {
            const product = productMap.get(item.product_id);
            if (!product) {
                breakdown.push({
                    product_id: item.product_id,
                    error: 'Product not found'
                });
                continue;
            }

            const weight = item.weight_pct / 100;
            const growth = product.allocation?.growth || 0;
            const defensive = product.allocation?.defensive || 0;
            const cash = product.allocation?.cash || 0;
            const fees = product.metrics?.fees?.total || 0;

            totalGrowth += weight * growth;
            totalDefensive += weight * defensive;
            totalLiquidity += weight * cash;
            totalFees += weight * fees;

            breakdown.push({
                product_id: item.product_id,
                name: product.name,
                weight_pct: item.weight_pct,
                allocation: { growth, defensive, cash },
                contribution: {
                    growth: +(weight * growth).toFixed(1),
                    defensive: +(weight * defensive).toFixed(1),
                    liquidity: +(weight * cash).toFixed(1)
                }
            });
        }

        const calculated_exposure = {
            growth: +totalGrowth.toFixed(1),
            defensive: +totalDefensive.toFixed(1),
            liquidity: +totalLiquidity.toFixed(1)
        };

        // 验证是否满足目标（±5% 容差）
        let validation = { passed: true, issues: [] };
        if (target_exposure) {
            const tolerance = 5;
            if (Math.abs(calculated_exposure.growth - target_exposure.growth) > tolerance) {
                validation.passed = false;
                validation.issues.push(`Growth: ${calculated_exposure.growth}% vs target ${target_exposure.growth}% (diff > ${tolerance}%)`);
            }
            if (Math.abs(calculated_exposure.defensive - target_exposure.defensive) > tolerance) {
                validation.passed = false;
                validation.issues.push(`Defensive: ${calculated_exposure.defensive}% vs target ${target_exposure.defensive}% (diff > ${tolerance}%)`);
            }
            if (Math.abs(calculated_exposure.liquidity - target_exposure.liquidity) > tolerance) {
                validation.passed = false;
                validation.issues.push(`Liquidity: ${calculated_exposure.liquidity}% vs target ${target_exposure.liquidity}% (diff > ${tolerance}%)`);
            }
        }

        console.log(`[ProductTools] calculatePortfolioExposure: ${calculated_exposure.growth}/${calculated_exposure.defensive}/${calculated_exposure.liquidity}, passed=${validation.passed}`);

        return {
            calculated_exposure,
            total_fees_estimate: +totalFees.toFixed(2),
            breakdown,
            target_exposure: target_exposure || null,
            validation,
            recommendation: validation.passed 
                ? 'Portfolio meets target exposure within ±5% tolerance. Good to use!'
                : `Portfolio does not meet target. ${validation.issues.join('; ')}. Adjust weights or swap products.`
        };
    } catch (err) {
        console.error('[ProductTools] calculatePortfolioExposure error:', err);
        return { error: err.message };
    }
}

/**
 * 自动优化投资组合权重以匹配目标 exposure
 * 使用简单的优化算法找到最佳权重分配
 * 
 * @param {Object} params
 * @param {Array} params.product_ids - 产品 ID 列表
 * @param {Object} params.target_exposure - {growth, defensive, liquidity}
 * @param {Object} params.constraints - 权重约束
 * @returns {Promise<Object>} - 优化后的权重分配
 */
export async function optimizePortfolioWeights(params) {
    const { 
        product_ids = [], 
        target_exposure,
        constraints = {}
    } = params;

    const minWeight = constraints.min_weight_per_product || 5;   // 最小权重5%，提供最大灵活性
    const maxWeight = constraints.max_weight_per_product || 70;

    if (product_ids.length < 2) {
        return { error: 'Need at least 2 products for optimization' };
    }
    if (product_ids.length > 6) {
        return { error: 'Maximum 6 products for optimization' };
    }
    if (!target_exposure) {
        return { error: 'target_exposure is required' };
    }

    try {
        // 获取产品 allocation 和 performance 数据
        const dbProducts = await Product.find({
            _id: { $in: product_ids },
            isActive: true
        }).select('name provider category strategy riskLevel allocation metrics.fees.total metrics.returns.y1 metrics.returns.y5').lean();

        if (dbProducts.length !== product_ids.length) {
            const foundIds = dbProducts.map(p => p._id.toString());
            const missing = product_ids.filter(id => !foundIds.includes(id));
            return { error: `Products not found: ${missing.join(', ')}` };
        }

        const products = dbProducts.map(p => ({
            id: p._id.toString(),
            name: p.name,
            provider: p.provider,
            growth: p.allocation?.growth || 0,
            defensive: p.allocation?.defensive || 0,
            cash: p.allocation?.cash || 0,
            fees: p.metrics?.fees?.total || 0
        }));

        // 简单优化算法：梯度下降式搜索
        // 目标：最小化 exposure 误差
        const n = products.length;
        let weights = new Array(n).fill(100 / n); // 初始均匀分配
        
        const calculateError = (w) => {
            let g = 0, d = 0, l = 0;
            for (let i = 0; i < n; i++) {
                const weight = w[i] / 100;
                g += weight * products[i].growth;
                d += weight * products[i].defensive;
                l += weight * products[i].cash;
            }
            return Math.pow(g - target_exposure.growth, 2) +
                   Math.pow(d - target_exposure.defensive, 2) +
                   Math.pow(l - target_exposure.liquidity, 2);
        };

        const normalizeWeights = (w) => {
            // 应用约束
            for (let i = 0; i < n; i++) {
                w[i] = Math.max(minWeight, Math.min(maxWeight, w[i]));
            }
            // 归一化到 100%
            const sum = w.reduce((a, b) => a + b, 0);
            return w.map(x => x * 100 / sum);
        };

        // 改进的迭代优化：多步长 + 随机扰动
        const maxIter = 2000;
        let bestWeights = [...weights];
        let bestError = calculateError(weights);
        let iter = 0;
        let noImprovementCount = 0;

        // 多步长策略：从粗到细
        const steps = [5, 2, 1, 0.5];
        
        for (const step of steps) {
            let improved = true;
            let stepIter = 0;
            const maxStepIter = 500;

            while (improved && stepIter < maxStepIter && iter < maxIter) {
                improved = false;
                iter++;
                stepIter++;

                // 尝试所有两两权重转移
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        if (i === j) continue;

                        const newWeights = [...bestWeights];
                        newWeights[i] += step;
                        newWeights[j] -= step;
                        
                        const normalized = normalizeWeights(newWeights);
                        const error = calculateError(normalized);

                        if (error < bestError - 0.001) {
                            bestWeights = normalized;
                            bestError = error;
                            improved = true;
                            noImprovementCount = 0;
                        }
                    }
                }

                if (!improved) {
                    noImprovementCount++;
                }

                // 如果连续多次无改进，尝试随机扰动跳出局部最优
                if (noImprovementCount > 3 && step > 0.5) {
                    const perturbation = bestWeights.map(w => {
                        const rand = (Math.random() - 0.5) * step * 2;
                        return w + rand;
                    });
                    const normalized = normalizeWeights(perturbation);
                    const error = calculateError(normalized);
                    if (error < bestError * 1.5) { // 接受稍差的解来探索
                        bestWeights = normalized;
                        bestError = error;
                        noImprovementCount = 0;
                    }
                }
            }
        }

        weights = bestWeights;

        // 计算最终 exposure
        let finalGrowth = 0, finalDefensive = 0, finalLiquidity = 0, finalFees = 0;
        const result = [];

        for (let i = 0; i < n; i++) {
            const weight = weights[i] / 100;
            finalGrowth += weight * products[i].growth;
            finalDefensive += weight * products[i].defensive;
            finalLiquidity += weight * products[i].cash;
            finalFees += weight * products[i].fees;

            result.push({
                product_id: products[i].id,
                name: products[i].name,
                provider: products[i].provider,
                weight_pct: +weights[i].toFixed(1),
                fees: products[i].fees,
                allocation: {
                    growth: products[i].growth,
                    defensive: products[i].defensive,
                    cash: products[i].cash
                }
            });
        }

        const calculated_exposure = {
            growth: +finalGrowth.toFixed(1),
            defensive: +finalDefensive.toFixed(1),
            liquidity: +finalLiquidity.toFixed(1)
        };

        // 计算误差
        const deviation = {
            growth: +(calculated_exposure.growth - target_exposure.growth).toFixed(1),
            defensive: +(calculated_exposure.defensive - target_exposure.defensive).toFixed(1),
            liquidity: +(calculated_exposure.liquidity - target_exposure.liquidity).toFixed(1)
        };

        const maxDeviation = Math.max(
            Math.abs(deviation.growth),
            Math.abs(deviation.defensive),
            Math.abs(deviation.liquidity)
        );

        console.log(`[ProductTools] optimizePortfolioWeights: ${calculated_exposure.growth}/${calculated_exposure.defensive}/${calculated_exposure.liquidity}, deviation=${maxDeviation}%`);

        return {
            success: true,
            optimized_products: result,
            calculated_exposure,
            target_exposure,
            deviation,
            total_fees_estimate: +finalFees.toFixed(2),
            fit_quality: maxDeviation <= 5 ? 'excellent' : maxDeviation <= 10 ? 'good' : 'fair',
            iterations: iter,
            recommendation: maxDeviation <= 5 
                ? 'Excellent fit! Use these weights directly.'
                : `Deviation of ${maxDeviation}% from target. Consider swapping products for better fit.`
        };
    } catch (err) {
        console.error('[ProductTools] optimizePortfolioWeights error:', err);
        return { error: err.message };
    }
}

// ==========================================
// Tool Executor (统一调用入口)
// ==========================================

/**
 * 根据工具名称执行对应的函数
 * @param {string} toolName 
 * @param {Object} args 
 * @returns {Promise<any>}
 */
export async function executeProductTool(toolName, args) {
    console.log(`[ProductTools] Executing: ${toolName}`, JSON.stringify(args));
    
    switch (toolName) {
        case 'build_optimized_portfolios':
            return await buildOptimizedPortfolios(args);
        case 'search_portfolio_candidates':
            return await searchPortfolioCandidates(args);
        case 'search_products':
            return await searchProducts(args);
        case 'get_product_details':
            return await getProductDetails(args);
        case 'calculate_portfolio_exposure':
            return await calculatePortfolioExposure(args);
        case 'optimize_portfolio_weights':
            return await optimizePortfolioWeights(args);
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

export default {
    definitions: productToolDefinitions,
    execute: executeProductTool,
    buildOptimizedPortfolios,
    searchPortfolioCandidates,
    searchProducts,
    getProductDetails,
    calculatePortfolioExposure,
    optimizePortfolioWeights
};

