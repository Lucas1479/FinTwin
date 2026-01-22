# 快速开始 - Smart PDF Pipeline

## 🚀 三步设置

### 步骤 1: 配置API Key

在 `backend/.env` 文件中添加：

```env
GEMINI_API_KEY=你的Gemini_API_Key
```

### 步骤 2: 运行智能处理

```bash
cd backend
npm run smart-process
```

### 步骤 3: 上传到Vectara

```bash
npm run upload-vectara
```

**完成！** 🎉

---

## 📋 可用命令

```bash
# 生成原始payload（从specification.md）
npm run generate-payload

# 智能处理（清洗+打标）
npm run smart-process

# 上传到Vectara
npm run upload-vectara

# 一键完成所有步骤
npm run update-kb
```

---

## 💡 常见场景

### 场景1: 第一次使用

```bash
# 1. 确保有API key
echo $GEMINI_API_KEY  # 或在Windows: echo %GEMINI_API_KEY%

# 2. 运行完整流程
npm run update-kb
```

**预期结果：**
- 3-4分钟完成
- 花费约$0.01
- 生成智能处理后的payload

---

### 场景2: 更新文档内容

```bash
# 1. 修改specification.md
vim backend/specification.md

# 2. 重新运行（会使用缓存，很快）
npm run update-kb
```

**预期结果：**
- 如果80%内容未变：30秒-1分钟
- 花费约$0.002
- 只处理变更的部分

---

### 场景3: 强制重新处理（不用缓存）

```bash
# 删除缓存
rm backend/.smart_pipeline_cache.json

# 重新处理
npm run smart-process
```

---

## 🔍 检查结果

### 查看处理统计

运行后会显示：

```
✅ Pipeline Complete!

📊 Stats:
   - Total sections: 50
   - Kept: 47 (94.0%)
   - Filtered: 3 (6.0%)
   - From cache: 35
   - New processed: 15
   - Estimated cost: $0.0102
   - Time: 47.3s
```

### 查看生成的文件

```bash
# 查看智能处理后的payload
cat backend/fintwin_vectara_smart_payload.json | jq '.processing_info'

# 查看缓存
cat backend/.smart_pipeline_cache.json | jq 'keys | length'
```

---

## ⚠️ 故障排查

### 问题: API Key错误

```
❌ Error: GEMINI_API_KEY not found
```

**解决：**
1. 检查 `.env` 文件
2. 确认API key有效
3. 重启终端加载新环境变量

---

### 问题: 处理超时

```
⚠️ Batch processing failed: timeout
```

**解决：**
编辑 `scripts/smart_pdf_pipeline.js`:

```javascript
const CONFIG = {
  BATCH_SIZE: 2, // 减小批次大小（默认3）
  DELAY_MS: 2000, // 增加延迟（默认1000）
};
```

---

### 问题: 成本太高

**解决：**
使用更便宜的模型：

```javascript
const CONFIG = {
  MODEL: 'gemini-1.5-flash-8b', // 便宜50%
};
```

---

## 📊 效果对比

### 处理前（原始Vectara检索）

```
用户问: "新西兰的税率是怎么设置的？"

返回结果:
[1] Milford Balanced Fund - PIR信息
[2] Housing statistics - 住房率 ❌ (不相关)
[3] Index of page links ❌ (导航页)
```

### 处理后（智能pipeline）

```
用户问: "新西兰的税率是怎么设置的？"

返回结果:
[1] Personal Income Tax - 10.5%-39%阶梯税率 ✅
[2] Tax brackets guide - 详细说明 ✅
[3] PAYE system - 税务系统 ✅

(housing statistics被过滤)
(navigation pages被过滤)
```

---

## 🎯 下一步

详细文档: `backend/scripts/README_SMART_PIPELINE.md`

有问题？查看完整文档或联系开发团队。
