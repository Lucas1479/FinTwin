# Privacy Permission Card - MVP 使用说明

## ✨ 实现的功能

### 1. 智能检测（按需弹出）

权限卡片**只在需要访问敏感数据时**才会弹出，不会干扰用户的正常使用。

**触发规则：**
```javascript
// Gap Analysis（需要资产和现金流）
Stage: definition + Substage: gap_analysis
→ 弹出卡片，请求：💰 Financial Assets, 💸 Cash Flows

// Emergency Fund（需要支出和个人信息）
Stage: definition + Substage: assumptions + Category: emergency
→ 弹出卡片，请求：💸 Cash Flows, 👤 Personal Info, 💰 Financial Assets

// Strategy Stage（需要完整财务数据）
Stage: strategy
→ 弹出卡片，请求：💰 Assets, 💸 Cash Flows, 👤 Personal Info, 🎯 Goals, 📋 Plans

// Product Stage（仅需要目标和计划）
Stage: product
→ 不弹出卡片（非敏感数据）

// Simulation Stage
Stage: simulation
→ 弹出卡片，请求：🎯 Goals, 📋 Plans, 💰 Assets, 💸 Cash Flows
```

---

### 2. 显示具体需求

卡片会**动态显示**当前请求需要的具体数据类型，而不是全部5种数据。

**示例：Gap Analysis**
```
┌────────────────────────────────────────────────┐
│  🛡️  AI needs access to your data              │
│      For personalized financial advice         │
│                                                 │
│  ☑️ 💰 Financial Assets                        │
│        Bank accounts, investments, KiwiSaver   │
│                                                 │
│  ☑️ 💸 Cash Flows                              │
│        Income, expenses, subscriptions         │
│                                                 │
│  [Select All]              2 of 2 selected     │
│                                                 │
│  [Deny All]           [Allow (2)]              │
└────────────────────────────────────────────────┘
```

**用户可以：**
- ✅ 点击checkbox取消选择部分数据
- ✅ 点击"Select All"/"Deselect All"快速操作
- ✅ 点击"Deny All"拒绝所有数据
- ✅ 点击"Allow (N)"允许选中的N个数据类型

---

### 3. 细粒度控制

用户可以选择只允许部分数据访问。

**场景示例：**
```
用户想要Gap Analysis建议，但不想分享现金流数据

1. 卡片弹出，显示需要：
   ☑️ Financial Assets
   ☑️ Cash Flows

2. 用户取消"Cash Flows"的选择：
   ☑️ Financial Assets
   ☐  Cash Flows

3. 点击"Allow (1)"

4. 后端收到：
   allowAIDataSharing: true
   dataAllowlist: ['financial_assets']

5. AI只能访问资产数据，现金流被隐私保护阻止
```

---

## 🎯 数据类型配置

### 当前定义的数据类型

| 图标 | 名称 | 说明 | 敏感度 |
|------|------|------|--------|
| 💰 | Financial Assets | 银行账户、投资、KiwiSaver、负债 | 高 |
| 💸 | Cash Flows | 收入、支出、订阅 | 高 |
| 🎯 | Goals | 你的理财目标 | 低 |
| 📋 | Plans | 分配策略 | 低 |
| 👤 | Personal Info | 年龄、家庭、风险偏好 | 高 |

**敏感度判断：**
- **高敏感**（需要用户确认）：资产、现金流、个人信息
- **低敏感**（不强制确认）：目标、计划

---

## 📐 Stage → 数据类型映射

配置文件：`frontend/src/constants/privacyDataTypes.js`

```javascript
export const STAGE_DATA_REQUIREMENTS = {
    'definition': {
        'gap_analysis': ['financial_assets', 'cash_flows'],
        'assumptions': {
            'emergency': ['cash_flows', 'user_profile', 'financial_assets'],
            'default': []
        },
        'default': []
    },
    'strategy': ['financial_assets', 'cash_flows', 'user_profile', 'goals', 'plans'],
    'product': ['goals', 'plans'],
    'simulation': ['goals', 'plans', 'financial_assets', 'cash_flows']
};
```

**如何新增Stage的数据需求：**
```javascript
// 示例：新增"tax planning" stage
'tax_planning': ['financial_assets', 'cash_flows', 'user_profile']
```

---

## 🔧 技术细节

### 文件结构

```
frontend/
├── src/
│   ├── constants/
│   │   └── privacyDataTypes.js         # 🆕 数据类型配置
│   ├── pages/
│   │   └── GoalIntakePage.jsx          # ✏️ 更新：权限卡片逻辑
│   └── services/
│       └── goalEngineService.js        # 现有：API调用（无需修改）
```

### 关键函数

#### 1. `getRequiredDataTypes(stage, substage, category)`

**作用**：根据当前stage/substage/category，返回需要的数据类型

```javascript
getRequiredDataTypes('definition', 'gap_analysis', null)
// → ['financial_assets', 'cash_flows']

getRequiredDataTypes('definition', 'assumptions', 'emergency')
// → ['cash_flows', 'user_profile', 'financial_assets']

getRequiredDataTypes('strategy', null, null)
// → ['financial_assets', 'cash_flows', 'user_profile', 'goals', 'plans']
```

#### 2. `shouldShowPermissionCard(stage, substage, category, currentPrivacy)`

**作用**：判断是否应该弹出权限卡片

```javascript
shouldShowPermissionCard('definition', 'gap_analysis', null, true)
// → true（需要敏感数据）

shouldShowPermissionCard('product', null, null, true)
// → false（不需要敏感数据）

shouldShowPermissionCard('strategy', null, null, false)
// → false（隐私已关闭，无需再次确认）
```

#### 3. `getDataTypeLabels(dataTypeValues)`

**作用**：将数据类型值转换为用户友好的显示对象

```javascript
getDataTypeLabels(['financial_assets', 'cash_flows'])
// → [
//     { value: 'financial_assets', label: 'Financial Assets', icon: '💰', ... },
//     { value: 'cash_flows', label: 'Cash Flows', icon: '💸', ... }
//   ]
```

---

## 🎨 UI交互流程

### 完整流程

```
1. 用户输入消息："帮我分析一下我的财务状况"
   
2. handleSend() 执行
   ↓
   检测当前stage: 'definition'
   检测substage: 'gap_analysis'
   ↓
   getRequiredDataTypes() → ['financial_assets', 'cash_flows']
   shouldShowPermissionCard() → true（需要敏感数据）
   ↓
   设置状态：
   - setPendingQuery("帮我分析...")
   - setRequestedDataTypes(['financial_assets', 'cash_flows'])
   - setSelectedAllowlist(['financial_assets', 'cash_flows']) // 默认全选
   - setShowPermissionCard(true)
   ↓
   权限卡片弹出（显示具体需要的2种数据）

3. 用户与卡片交互
   - 可以取消某些checkbox
   - 可以点击"Select All"/"Deselect All"
   - 选择数存储在 selectedAllowlist 状态

4. 用户点击"Allow (N)"
   ↓
   handlePermissionResponse(true) 执行
   ↓
   调用 goalEngineService.generateDecisionStream({
       allowAIDataSharing: true,
       dataAllowlist: selectedAllowlist  // 🆕 传递用户选择
   })
   ↓
   后端中间件接收：req.body.dataAllowlist
   ↓
   数据服务层根据allowlist过滤数据

5. AI返回结果（基于用户允许的数据）
```

---

## 🧪 测试场景

### 场景1：Gap Analysis（正常流程）

**操作：**
1. 进入Goal Engine
2. Stage: Definition, Substage: Gap Analysis
3. 输入："我想存$30,000买房"

**预期结果：**
- ✅ 权限卡片弹出
- ✅ 显示2个数据类型：Financial Assets, Cash Flows
- ✅ 默认全部选中
- ✅ 用户点击Allow后，后端收到 `dataAllowlist: ['financial_assets', 'cash_flows']`

---

### 场景2：部分允许

**操作：**
1. Gap Analysis权限卡片弹出
2. 用户取消"Cash Flows"的checkbox
3. 点击"Allow (1)"

**预期结果：**
- ✅ 后端收到 `dataAllowlist: ['financial_assets']`
- ✅ AI只能访问资产数据
- ✅ 现金流查询被隐私保护阻止

---

### 场景3：不需要敏感数据的stage

**操作：**
1. Stage: Product
2. 输入："推荐适合我的产品"

**预期结果：**
- ✅ 权限卡片**不弹出**（Product stage只需要goals和plans，非敏感）
- ✅ 直接发送请求

---

### 场景4：隐私已关闭

**操作：**
1. 用户在Profile设置中关闭了shareWithAI
2. 或者在chatbox中关闭了Goal Privacy开关
3. 尝试Gap Analysis

**预期结果：**
- ✅ 权限卡片**不弹出**（隐私已全局关闭）
- ✅ 直接发送请求，但后端会阻止数据访问

---

## 🚀 未来增强（非MVP）

### Phase 2: 记住用户选择

```jsx
<button>
    Remember my choice for this session
</button>
```

### Phase 3: Privacy Settings页面

在Profile → Privacy中添加默认allowlist管理。

### Phase 4: 实时数据需求预览

在用户输入时，实时显示"这个问题可能需要访问：..."

---

## 📝 维护指南

### 如何添加新的数据类型？

**Step 1**: 在 `privacyDataTypes.js` 中添加
```javascript
export const DATA_TYPES = [
    // ... existing types
    { 
        value: 'tax_records',  // 🆕
        label: 'Tax Records', 
        description: 'IRD returns, deductions',
        icon: '📄',
        sensitive: true
    }
];
```

**Step 2**: 在后端中间件添加枚举
```javascript
// backend/middleware/privacyMiddleware.js
export const DATA_TYPES = {
    // ... existing
    TAX_RECORDS: 'tax_records'  // 🆕
};
```

**Step 3**: 在User模型更新enum
```javascript
// backend/models/userModel.js
dataAllowlist: {
    enum: ['all', 'financial_assets', ... , 'tax_records']  // 🆕
}
```

**Step 4**: 配置哪些stage需要这个数据
```javascript
'tax_planning': ['financial_assets', 'cash_flows', 'tax_records']  // 🆕
```

---

## ✅ MVP完成清单

- [x] 创建数据类型配置文件
- [x] 智能检测逻辑（按需弹出）
- [x] 动态显示具体需求
- [x] 用户可选择部分数据
- [x] Select All / Deselect All
- [x] 传递allowlist到后端
- [x] 无linter错误
- [ ] 前端测试（需要手动验证）
- [ ] 后端验证日志（需要观察）

---

**下一步**: 启动应用，测试Gap Analysis场景！🎉
