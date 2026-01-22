# Smart PDF Processing Pipeline

这个pipeline使用Gemini AI自动清洗和标注PDF内容，提升Vectara检索质量。

## 功能特性

✅ **自动内容清洗**
- 移除页脚/页眉（"Printed from"等）
- 移除导航链接和索引页
- 过滤低质量内容

✅ **智能元数据生成**
- 自动分类主题（topic）
- 识别目标受众（audience）
- 提取关键词（keywords）
- 评估内容质量和优先级

✅ **性能优化**
- 批量处理（3个sections/批次）
- 智能缓存（避免重复处理）
- 进度实时显示

## 使用方法

### 1. 配置环境变量

在 `backend/.env` 中添加你的Gemini API Key：

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. 生成原始payload

如果还没有生成过，先运行：

```bash
cd backend
node scripts/generate_vectara_payload.js
```

这会生成 `fintwin_vectara_payload.json`

### 3. 运行智能处理pipeline

```bash
node scripts/smart_pdf_pipeline.js
```

**第一次运行：**
- 处理时间：约2-3分钟
- 成本：约$0.01-0.02
- 会生成缓存文件

**后续运行（内容未变）：**
- 处理时间：<5秒
- 成本：$0（使用缓存）

### 4. 上传到Vectara

```bash
node scripts/upload_to_vectara.js
```

脚本会自动使用智能处理后的payload（`fintwin_vectara_smart_payload.json`）

## 输出文件

### `fintwin_vectara_smart_payload.json`
处理后的payload，包含：
- 清洗后的文本内容
- 自动生成的元数据
- 处理统计信息

示例结构：
```json
{
  "id": "fintwin-spec-smart-v1.3",
  "sections": [
    {
      "title": "1.1 Core Definitions",
      "text": "净值 = 资产 - 负债...", 
      "metadata": {
        "type": "subsection",
        "topic": "wealth_calculation",
        "audience": "general_public",
        "keywords": ["net worth", "assets", "liabilities"],
        "priority": "high",
        "content_quality": "high",
        "auto_processed": true
      }
    }
  ],
  "processing_info": {
    "processed_at": "2026-01-22T...",
    "model": "gemini-1.5-flash",
    "kept_sections": 47,
    "filtered_sections": 3,
    "processing_time_ms": 156000
  }
}
```

### `.smart_pipeline_cache.json`
缓存文件，包含已处理内容的hash和结果。

**不要删除这个文件**，它能大幅加速后续处理。

## 成本估算

| 场景 | 处理时间 | API调用 | 估算成本 |
|------|---------|---------|---------|
| 首次运行（50 sections） | 2-3分钟 | ~17次 | $0.01-0.02 |
| 更新10%内容 | 20-30秒 | ~2次 | $0.001-0.002 |
| 100%缓存命中 | <5秒 | 0次 | $0 |

**月成本估算**（每周更新1次）：
- 约$0.05-0.10/月

## 配置选项

编辑 `smart_pdf_pipeline.js` 顶部的 `CONFIG` 对象：

```javascript
const CONFIG = {
  BATCH_SIZE: 3,           // 每批处理的sections数量
  DELAY_MS: 1000,          // API调用间隔（ms）
  MODEL: 'gemini-1.5-flash', // 或 'gemini-1.5-flash-8b' 更便宜
};
```

**调优建议：**
- `BATCH_SIZE`增大 → 更快但可能超时
- `DELAY_MS`减小 → 更快但可能触发限流
- 使用`gemini-1.5-flash-8b` → 成本减半，质量略降

## 故障排查

### 错误：`GEMINI_API_KEY not found`
- 检查 `.env` 文件是否包含API key
- 确认文件名是 `.env` 不是 `env.txt`

### 错误：`No JSON array found in response`
- LLM响应格式异常，会自动fallback到默认元数据
- 查看终端输出的错误详情
- 可能需要调整prompt或减小BATCH_SIZE

### 处理速度很慢
- 第一次运行是正常的（需要处理所有sections）
- 检查网络连接
- 查看API是否触发限流

### 缓存失效
- 如果修改了section内容，hash会改变，需要重新处理
- 这是正常行为，确保内容更新后会重新处理

## 工作流程集成

### 推荐的更新流程

1. **修改文档**
   ```bash
   # 编辑 specification.md 或其他source文档
   vim backend/specification.md
   ```

2. **生成payload**
   ```bash
   node scripts/generate_vectara_payload.js
   ```

3. **智能处理**
   ```bash
   node scripts/smart_pdf_pipeline.js
   ```

4. **上传到Vectara**
   ```bash
   node scripts/upload_to_vectara.js
   ```

5. **测试检索**
   - 在前端测试新的检索质量
   - 检查是否过滤了低质量内容

### CI/CD集成示例

```yaml
# .github/workflows/update-knowledge-base.yml
name: Update Knowledge Base

on:
  push:
    paths:
      - 'backend/specification.md'
      - 'backend/docs/**'

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Generate payload
        run: node backend/scripts/generate_vectara_payload.js
      
      - name: Smart processing
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: node backend/scripts/smart_pdf_pipeline.js
      
      - name: Upload to Vectara
        env:
          VECTARA_API_KEY: ${{ secrets.VECTARA_API_KEY }}
        run: node backend/scripts/upload_to_vectara.js
```

## 监控和调试

### 查看处理统计

Pipeline结束后会输出详细统计：

```
📊 Stats:
   - Total sections: 50
   - Kept: 47 (94.0%)
   - Filtered: 3 (6.0%)
   - From cache: 35
   - New processed: 15
   - API calls: 5
   - Tokens: 87,234 input, 12,456 output
   - Estimated cost: $0.0102
   - Time: 47.3s
```

### 查看缓存效率

```bash
# 查看缓存文件大小
ls -lh backend/.smart_pipeline_cache.json

# 查看缓存内容
cat backend/.smart_pipeline_cache.json | jq 'keys | length'
```

### 清除缓存（强制重新处理）

```bash
rm backend/.smart_pipeline_cache.json
node scripts/smart_pdf_pipeline.js
```

## 元数据字段说明

| 字段 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `topic` | string | 主题分类 | `personal_income_tax`, `kiwisaver`, `wealth_calculation` |
| `audience` | string | 目标受众 | `general_public`, `investors`, `retirees` |
| `keywords` | array | 关键词列表 | `["tax", "PAYE", "income"]` |
| `document_type` | string | 文档类型 | `guide`, `reference`, `policy` |
| `priority` | string | 重要性 | `high`, `medium`, `low` |
| `content_quality` | string | 内容质量 | `high`, `medium`, `low` |

**如何使用这些元数据：**

在查询时可以用metadata filter：

```javascript
// 只检索个人税相关内容
metadataFilter: "part.metadata.topic = 'personal_income_tax'"

// 只检索高质量内容
metadataFilter: "part.metadata.content_quality = 'high'"

// 组合条件
metadataFilter: "part.metadata.topic = 'retirement_planning' AND part.metadata.priority = 'high'"
```

## 问题反馈

如果遇到问题或有改进建议，请：
1. 查看终端完整输出
2. 检查生成的文件内容
3. 提供错误信息和配置

## 更新日志

### v1.0 (2026-01-22)
- 初始版本
- 支持批量处理和缓存
- 自动元数据生成
