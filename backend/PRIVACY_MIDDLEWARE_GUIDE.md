# Privacy Middleware 使用指南

## 🎯 概述

隐私中间件提供了细粒度的数据访问控制，解决了以下架构问题：

### 修复前的问题
- ❌ 8个零散的数据查询点
- ❌ 3处代码重复（`FinancialAsset.find`）
- ❌ 5/8数据点无隐私控制
- ❌ 维护困难（每次新增功能需在多处添加隐私检查）

### 修复后的优势
- ✅ **单一真相源**：所有隐私逻辑集中在中间件
- ✅ **自动应用**：注册后所有路由自动受保护
- ✅ **细粒度控制**：支持allowlist白名单
- ✅ **易于测试**：隔离的隐私逻辑

---

## 📐 架构

```
Request with Body:
{
  "allowAIDataSharing": true,
  "dataAllowlist": ["financial_assets", "goals"]
}
         ↓
authMiddleware (验证JWT) → req.user populated
         ↓
privacyMiddleware → req.privacyContext = {
  userId,
  globalSharingEnabled,     // 从User.privacy.shareWithAI
  requestOverride,          // 从req.body.allowAIDataSharing
  finalAISharing,          // Effective setting
  allowlist,               // 从User.privacy.dataAllowlist或req.body.dataAllowlist
  canAccess(dataType),     // Helper函数
  getAccessReason(dataType)
}
         ↓
Controller → PrivacyAwareDataService → Database查询（自动过滤）
         ↓
Response
```

---

## 🔧 使用方法

### 1. 在Controller中访问隐私上下文

```javascript
export const generateGoalDecision = asyncHandler(async (req, res) => {
  // ✅ 直接访问隐私上下文（由中间件自动注入）
  const { privacyContext } = req;
  
  console.log('Privacy Status:', {
    userId: privacyContext.userId,
    sharing: privacyContext.finalAISharing,
    allowlist: privacyContext.allowlist
  });
  
  // ✅ 检查特定数据类型是否可访问
  if (privacyContext.canAccess('financial_assets')) {
    // 允许访问资产数据
  } else {
    // 隐私保护：不访问资产数据
    const reason = privacyContext.getAccessReason('financial_assets');
    console.log('Access blocked:', reason);
  }
});
```

### 2. 使用Privacy-Aware数据服务（推荐）

```javascript
import PrivacyAwareDataService from '../services/privacyAwareDataService.js';

export const generateGoalDecision = asyncHandler(async (req, res) => {
  // ✅ 创建数据服务实例
  const dataService = new PrivacyAwareDataService(req.privacyContext);
  
  // === 示例1：获取财务快照（Gap Analysis使用） ===
  const snapshot = await dataService.getFinancialSnapshot(goalContext._id);
  
  if (snapshot.has_data) {
    enrichedContext.real_financial_snapshot = snapshot.data;
  } else {
    // 自动处理隐私阻止
    enrichedContext.real_financial_snapshot = {
      has_data: false,
      data_source: snapshot.data_source,
      note: snapshot.note
    };
  }
  
  // === 示例2：单独获取资产 ===
  const assets = await dataService.getFinancialAssets();
  // 返回格式：{ data: [...], has_data: true/false, data_source: 'database'/'privacy_disabled' }
  
  // === 示例3：批量获取多种数据 ===
  const batchData = await dataService.batchFetch([
    'financial_assets',
    'cash_flows',
    'goals'
  ]);
  
  if (batchData.financial_assets.has_data) {
    // Process assets
  }
  
  if (batchData.goals.has_data) {
    // Process goals
  }
});
```

### 3. 旧代码迁移示例

#### ❌ 迁移前（旧代码）

```javascript
// Line 538-540: Gap Analysis
if (!finalAISharing) {
  enrichedContext.real_financial_snapshot = {
    has_data: false,
    data_source: 'user_privacy_disabled'
  };
} else {
  try {
    const [assets, cashFlows] = await Promise.all([
      FinancialAsset.find({ user_id: userId }).lean(),
      CashFlow.find({ user_id: userId }).lean()
    ]);
    
    // ... 100 lines of calculation logic ...
  } catch (err) {
    console.error('Error:', err);
  }
}
```

#### ✅ 迁移后（新代码）

```javascript
// 创建数据服务
const dataService = new PrivacyAwareDataService(req.privacyContext);

// 一行代码搞定！
const snapshot = await dataService.getFinancialSnapshot(goalContext._id);
enrichedContext.real_financial_snapshot = snapshot;

// 数据服务自动处理：
// - 隐私检查
// - 数据库查询
// - 计算逻辑
// - 错误处理
```

---

## 📊 数据类型（Allowlist）

用户可以细粒度控制允许AI访问哪些数据：

| 数据类型 | 常量 | 说明 | 包含内容 |
|---------|------|------|---------|
| 资产数据 | `financial_assets` | 财务资产 | FinancialAsset（银行账户、投资、KiwiSaver、负债） |
| 现金流 | `cash_flows` | 收入支出 | CashFlow（工资、订阅、固定支出） |
| 目标 | `goals` | 理财目标 | Goal（买房、留学、退休等目标） |
| 计划 | `plans` | 执行计划 | Plan（allocation策略、时间线） |
| 个人信息 | `user_profile` | 用户档案 | User（年龄、家庭状况、风险偏好） |
| 全部 | `all` | 通配符 | 所有数据类型 |

---

## 🔒 隐私控制优先级

```
1. 请求级覆盖 (req.body.allowAIDataSharing)
   ↓ (如果未指定)
2. 全局设置 (User.privacy.shareWithAI)
   ↓
3. Allowlist过滤
   - 请求级 allowlist (req.body.dataAllowlist) 优先
   - 或用户全局 allowlist (User.privacy.dataAllowlist)
```

### 示例场景

#### 场景1：全局开启，请求临时关闭

```javascript
// 用户设置：User.privacy.shareWithAI = true
// 请求Body：{ allowAIDataSharing: false }

// 结果：finalAISharing = false（请求覆盖生效）
```

#### 场景2：全局开启，但限制allowlist

```javascript
// 用户设置：
// User.privacy.shareWithAI = true
// User.privacy.dataAllowlist = ['financial_assets']

// 请求Body：{ allowAIDataSharing: true }

// 结果：
// - canAccess('financial_assets') → true
// - canAccess('goals') → false
```

#### 场景3：请求级allowlist覆盖

```javascript
// 用户设置：
// User.privacy.dataAllowlist = ['all']

// 请求Body：{ 
//   allowAIDataSharing: true,
//   dataAllowlist: ['financial_assets', 'user_profile']
// }

// 结果：只允许访问这两种数据（请求级allowlist覆盖全局）
```

---

## 🚀 重构checklist

### Step 1: 删除旧的隐私检查代码

在 `goalEngineController.js` 中找到并删除：

- ❌ Line 424: `const userPrivacy = await User.findById(userId).select('privacy')` （已被中间件替代）
- ❌ Line 425-430: 隐私检查逻辑（已被中间件替代）

### Step 2: 重构8个数据查询点

| 旧代码位置 | 功能 | 迁移方法 |
|----------|------|---------|
| Line 538-654 | Gap Analysis | `dataService.getFinancialSnapshot()` |
| Line 671-736 | Emergency Fund | `dataService.batchFetch(['user_profile', 'cash_flows', 'financial_assets'])` |
| Line 789 | Strategy (liquid capital) | `dataService.getFinancialAssets({ is_liquid: true })` |
| Line 836-838 | Strategy (fallback) | `dataService.batchFetch(['financial_assets', 'cash_flows'])` |
| Line 867-870 | Strategy (增强) | `dataService.batchFetch(['user_profile', 'plans', 'goals'])` |
| Line 886 | Strategy (net worth) | `dataService.getFinancialAssets()` |
| Line 1430-1435 | Goal Optimization | `dataService.batchFetch(['goals', 'cash_flows', 'plans', 'financial_assets'])` |

### Step 3: 更新测试

```javascript
describe('Privacy Middleware', () => {
  it('should block financial data when sharing disabled', async () => {
    const req = {
      user: { _id: userId },
      body: { allowAIDataSharing: false }
    };
    
    await attachPrivacyContext(req, {}, () => {});
    
    expect(req.privacyContext.finalAISharing).toBe(false);
    expect(req.privacyContext.canAccess('financial_assets')).toBe(false);
  });
  
  it('should respect allowlist', async () => {
    const req = {
      user: { _id: userId },
      body: { 
        allowAIDataSharing: true,
        dataAllowlist: ['financial_assets']
      }
    };
    
    await attachPrivacyContext(req, {}, () => {});
    
    expect(req.privacyContext.canAccess('financial_assets')).toBe(true);
    expect(req.privacyContext.canAccess('goals')).toBe(false);
  });
});
```

---

## 🎨 前端集成

### 更新请求Body格式

```javascript
// 旧格式（仍然兼容）
{
  "allowAIDataSharing": true
}

// 新格式（细粒度控制）
{
  "allowAIDataSharing": true,
  "dataAllowlist": ["financial_assets", "user_profile"]
}
```

### UI设计建议

#### Privacy Settings页面
```jsx
<div className="privacy-allowlist">
  <h3>Data Sharing Permissions</h3>
  <p>Choose which data AI can access for personalized advice:</p>
  
  <label>
    <input type="checkbox" value="financial_assets" />
    Financial Assets (bank accounts, investments)
  </label>
  
  <label>
    <input type="checkbox" value="cash_flows" />
    Cash Flows (income, expenses)
  </label>
  
  <label>
    <input type="checkbox" value="goals" />
    Goals (your financial objectives)
  </label>
  
  <label>
    <input type="checkbox" value="plans" />
    Plans (allocation strategies)
  </label>
  
  <label>
    <input type="checkbox" value="user_profile" />
    Personal Info (age, risk tolerance)
  </label>
</div>
```

#### Chatbox权限卡片（增强版）
```jsx
<div className="permission-card">
  <h4>AI would like to access:</h4>
  <ul>
    <li>✅ Financial Assets</li>
    <li>✅ Goals</li>
    <li>❌ Personal Info (blocked by your settings)</li>
  </ul>
  
  <button onClick={() => grantWithAllowlist(['financial_assets', 'goals'])}>
    Allow Selected
  </button>
  <button onClick={() => deny()}>
    Deny All
  </button>
</div>
```

---

## 📈 性能优化

### 缓存隐私设置

中间件已内置缓存（1分钟）：

```javascript
const userPrivacy = await User.findById(userId)
  .select('privacy')
  .lean()
  .cache(60000, `user_privacy_${userId}`); // ✅ 自动缓存
```

### 批量查询优化

使用 `batchFetch` 代替多次单独查询：

```javascript
// ❌ 4次数据库查询
const assets = await dataService.getFinancialAssets();
const cashFlows = await dataService.getCashFlows();
const goals = await dataService.getGoals();
const plans = await dataService.getPlans();

// ✅ 1次并行查询（Promise.all内部）
const data = await dataService.batchFetch([
  'financial_assets',
  'cash_flows',
  'goals',
  'plans'
]);
```

---

## 🐛 常见问题

### Q: 忘记应用中间件会怎样？

A: `PrivacyAwareDataService` 构造函数会抛出错误：
```
Error: PrivacyContext is required. Did you forget to apply privacyMiddleware?
```

### Q: 如何调试隐私阻止问题？

A: 开启debug日志：
```javascript
console.log(req.privacyContext.getAccessReason('financial_assets'));
// 输出："Data type 'financial_assets' not in allowlist: [goals, plans]"
```

### Q: 旧代码是否需要立即迁移？

A: 不需要！新旧代码可以共存。中间件已自动注入 `req.privacyContext`，但旧代码仍会工作（使用旧的`finalAISharing`逻辑）。

建议：
- 🟢 新功能：直接使用新API
- 🟡 旧功能：逐步迁移（按优先级）

---

## ✅ 部署前checklist

- [ ] 所有LLM路由已注册中间件
- [ ] User模型已添加 `dataAllowlist` 字段
- [ ] 数据库迁移已执行（为现有用户添加默认allowlist）
- [ ] 前端已更新请求格式
- [ ] Privacy Settings UI已实现
- [ ] 单元测试已通过
- [ ] E2E隐私测试已通过
- [ ] 日志中无 `FinancialAsset.find` 直接调用（应全部通过dataService）

---

## 📝 数据库迁移脚本

```javascript
// scripts/migratePrivacyAllowlist.js
import mongoose from 'mongoose';
import User from './models/userModel.js';

async function migratePrivacyAllowlist() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const result = await User.updateMany(
    { 'privacy.dataAllowlist': { $exists: false } },
    { $set: { 'privacy.dataAllowlist': ['all'] } }
  );
  
  console.log(`Migrated ${result.modifiedCount} users with default allowlist`);
  
  await mongoose.disconnect();
}

migratePrivacyAllowlist();
```

---

**下一步**: 查看 `PRIVACY_REFACTOR_EXAMPLE.md` 了解完整的重构示例。
