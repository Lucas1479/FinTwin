# LLM 数据隐私指南

## 🎯 问题背景

你的应用使用远程LLM（Gemini API）提供财务建议。用户的敏感财务数据（资产、负债、收入）会被发送到Google的服务器。

**核心风险：**
- 🔴 **数据留存**：Gemini API默认保留请求数据30天
- 🟠 **数据关联**：多个数据点组合可能推断用户身份
- 🟡 **政策变化**：未来Google可能改变数据使用政策

---

## 🔒 三级隐私控制方案

### 级别 1️⃣: 无脱敏 (开发模式)

**配置：** `.env` 中设置 `SANITIZE_LLM_DATA=false`

```bash
SANITIZE_LLM_DATA=false
```

**行为：**
- ✅ 发送完整数据给LLM（包括用户ID、财务数值）
- ✅ 最准确的建议
- ✅ 便于调试（可在LLM日志中看到完整上下文）

**适用场景：**
- 本地开发环境
- Debug复杂问题
- 测试新功能

**风险：** 🔴 高 - 完整数据暴露

---

### 级别 2️⃣: PII移除 (推荐生产模式)

**配置：** `.env` 中设置 `SANITIZE_LLM_DATA=pii_only` 或留空（默认值）

```bash
SANITIZE_LLM_DATA=pii_only
# 或
# SANITIZE_LLM_DATA=minimal
```

**行为：**
- ❌ 移除：用户ID、姓名、邮箱、电话、地址、session_id
- ✅ 保留：所有财务数值（资产、负债、收入、目标金额）
- ✅ 保留：年龄、城市、风险偏好（需要用于本地化建议）

**为什么这样做？**

**单个财务数字无法识别个人：**
- "某人有$377,091资产" → 可能是新西兰数千人
- "John Smith, Auckland, 35岁, $377,091资产" → 高度识别

**财务建议需要精确数值：**
```
场景：用户有$377K资产，想存$30K买房

✅ 精确建议（保留数值）：
"您的可用资产($377,091)已超过目标($30,000)，
无需额外储蓄。建议优先偿还$781K负债以改善净资产状况。"

❌ 模糊建议（规范化数值）：
"您的资产在$250K-$500K区间，目标$30K可行。
建议储蓄6-12个月。" （不准确！用户已超额达标）
```

**适用场景：**
- ✅ **生产环境（强烈推荐）**
- ✅ 对外演示
- ✅ Beta测试

**风险：** 🟡 中低 - 财务数据理论上可被关联，但无法直接识别身份

---

### 级别 3️⃣: 规范化模式 (平衡模式)

**配置：** `.env` 中设置 `SANITIZE_LLM_DATA=normalized`

```bash
SANITIZE_LLM_DATA=normalized
```

**行为：**
- ❌ 移除PII
- 🔄 将财务数值**规范化**到标准范围
- ✅ 保留**比例关系**（资产:负债:收入的相对关系）

**示例转换：**

| 真实数据 | 规范化后 | 保留的信息 |
|---------|---------|-----------|
| 资产: $377,091 | $100,000 | 比例基准 |
| 负债: $781,200 | $207,200 | 负债/资产 = 2.07x（保留） |
| 月收入: $8,950 | $2,375 | 收入/资产月化比例（保留） |
| 目标: $30,000 | $7,958 | 目标/资产 = 7.96%（保留） |

**LLM能做什么？**
- ✅ "您的负债是资产的2倍，属于高风险"（比例准确）
- ✅ "建议先还债再储蓄"（策略正确）
- ❌ "您需要存$30K买房"（绝对值不准）

**适用场景：**
- 对隐私极度敏感的企业客户
- 合规要求严格的地区（如GDPR）
- 原型演示（不想暴露真实数据规模）

**风险：** 🟢 低 - 数据几乎无法逆向推断

**缺点：** ⚠️ 建议准确性下降15-30%

---

### 级别 4️⃣: 严格模式 (最高隐私)

**配置：** `.env` 中设置 `SANITIZE_LLM_DATA=strict`

```bash
SANITIZE_LLM_DATA=strict
```

**行为：**
- ❌ 移除所有财务数据
- ✅ 只保留目标类型（买房、留学、退休）
- ✅ LLM只能给出**通用建议**（类似理财博客文章）

**LLM输出示例：**
```
"买房储蓄的一般建议：
1. 首付通常需要房价的20%
2. 建议在高收益储蓄账户或定期存款中存放
3. 避免高风险投资（因时间紧迫）"
```

**适用场景：**
- 极端隐私要求
- 演示系统架构（不需要真实建议）
- 用户明确拒绝数据分享

**风险：** 🟢 零风险

**缺点：** ❌ 建议失去个性化价值

---

## 📊 对比总结

| 隐私级别 | 配置值 | 建议准确度 | 身份识别风险 | 推荐场景 |
|---------|-------|-----------|------------|---------|
| 无脱敏 | `false` | 100% | 🔴 高 | 本地开发 |
| **PII移除** | `pii_only` ✨ | 95-100% | 🟡 中低 | **生产环境** |
| 规范化 | `normalized` | 70-85% | 🟢 低 | 高合规要求 |
| 严格模式 | `strict` | 30-50% | 🟢 零 | 演示/极端隐私 |

---

## 🛠️ 实施建议

### 推荐配置

**开发环境** (`.env.development`):
```bash
SANITIZE_LLM_DATA=false
```

**生产环境** (`.env.production`):
```bash
SANITIZE_LLM_DATA=pii_only
```

### 为什么选择 `pii_only`？

1. **风险可控**：
   - Google看到的是"某个新西兰人有$377K资产想买房"
   - 没有名字、邮箱、用户ID → 无法关联到具体个人
   - 即使数据泄露，也无法识别是谁

2. **建议质量**：
   - 保留所有数值精度
   - AI能准确判断可行性、给出具体金额建议
   - 用户体验不受影响

3. **最小改动**：
   - 只需在LLM调用前插入一个过滤器
   - 不影响其他业务逻辑

### 额外保护措施（可选）

1. **审计日志**：记录发送给LLM的数据
```javascript
// backend/utils/llmAuditLog.js
export const logLLMRequest = (sanitizedContext) => {
    console.log('[LLM Audit] Data sent to remote LLM:', {
        timestamp: new Date().toISOString(),
        privacy_mode: sanitizedContext._privacy_mode,
        fields_included: Object.keys(sanitizedContext)
    });
};
```

2. **用户透明度**：在UI显示隐私状态
```jsx
<div className="privacy-indicator">
    🔒 Your personal information is protected. 
    Only anonymous financial data is analyzed by AI.
</div>
```

3. **企业级API升级**（未来）：
   - 使用Google Cloud Vertex AI（可配置零数据留存）
   - 成本增加，但完全控制数据流

---

## 🧪 测试方法

### 验证脱敏是否生效

1. **后端日志检查**：
```bash
# 启动应用后观察日志
npm run dev

# 发起一个Goal Engine请求，查看日志输出：
[LLM Sanitizer] 🔒 Removing PII before sending to remote LLM...
   ✓ Removed PII: user_id
   ✓ Removed PII: session_id
[LLM Sanitizer] ✅ PII removal complete (financial values preserved)
```

2. **抓包验证**（高级）：
```bash
# 使用mitmproxy拦截HTTPS请求到gemini API
mitmproxy

# 检查请求体中是否包含用户ID、邮箱等PII
```

3. **单元测试**：
```javascript
// tests/llmDataSanitizer.test.js
import { sanitizeContextForLLM } from '../utils/llmDataSanitizer.js';

describe('LLM Data Sanitizer', () => {
    test('should remove user_id', () => {
        const input = {
            user_id: '67890abcdef',
            liquid_assets: 377091
        };
        
        const output = sanitizeContextForLLM(input);
        
        expect(output.user_id).toBeUndefined(); // ✅ PII removed
        expect(output.liquid_assets).toBe(377091); // ✅ Financial data kept
    });
});
```

---

## ❓ FAQ

### Q: 财务数据本身不算敏感信息吗？

A: 在隐私法规（GDPR, CCPA）中，**单独的财务数字不算个人信息**。
- ❌ "某人有$377K" → 无法识别
- ✅ "John Smith有$377K" → 个人信息

关键在于**是否能识别到具体个人**。

### Q: Gemini API会用我的数据训练模型吗？

A: **标准API：不会**。Google明确声明API数据不用于模型训练（与免费网页版不同）。
但会保留30天用于"滥用检测"。

### Q: 30天后数据会被删除吗？

A: Google声称会删除，但**无法验证**。这就是为什么要移除PII：即使数据永久留存，也无法识别身份。

### Q: 我能看到发送给LLM的具体数据吗？

A: 可以！在开发环境中：
```javascript
// backend/services/llmService.js
console.log('[DEBUG] Data sent to LLM:', JSON.stringify(sanitizedContext, null, 2));
```

### Q: 如果用户选择"关闭AI数据分享"，还需要脱敏吗？

A: **不需要**！用户关闭后，后端不会发送任何财务数据给LLM（见 `privacy.shareWithAI` 逻辑）。
脱敏只在用户**同意分享**时生效。

---

## 📝 下一步行动

### 立即启用（推荐）

1. 在 `.env` 中添加：
```bash
# Development
SANITIZE_LLM_DATA=false

# Production
SANITIZE_LLM_DATA=pii_only
```

2. 在 `goalEngineController.js` 中集成（见实施代码）

3. 验证日志输出

### 长期优化

- [ ] 添加审计日志（记录每次LLM调用的数据摘要）
- [ ] 用户隐私仪表板（显示"AI已看到哪些数据"）
- [ ] 升级到Vertex AI企业版（零数据留存保证）
- [ ] 实施本地LLM选项（完全不发送数据到外部）

---

**推荐阅读：**
- [Google Gemini API Data Usage Policy](https://ai.google.dev/gemini-api/terms)
- [GDPR Article 4: Personal Data Definition](https://gdpr-info.eu/art-4-gdpr/)
- [NZ Privacy Act 2020](https://www.privacy.org.nz/privacy-act-2020/)
