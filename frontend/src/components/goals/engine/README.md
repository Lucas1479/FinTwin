# Goal Engine 组件拆分

本目录包含从 `GoalIntakePage.jsx` 中提取的独立组件，用于更好的测试和复用。

## 📁 已完成的组件

### Phase 1: 简单组件 ✅
- **TypewriterMessage.jsx** (30 行) - 打字机效果组件
- **SubstageStepIndicator.jsx** (50 行) - 步骤指示器
- **ConfirmedCard.jsx** (50 行) - 已确认数据卡片

### Phase 2: 表单组件 ✅  
- **GapAnalysisForm.jsx** (95 行) - 差距分析表单
- **AssumptionForm.jsx** (85 行) - 财务假设表单

### Phase 4: 工具和常量 ✅
- **constants.js** (35 行) - 子阶段配置和工具函数

---

## ⏳ 待完成的组件

### Phase 3: Copilot 组件 (复杂，900+ 行)

**Copilot.jsx** - AI 助手组件
- **复杂度**: ⭐⭐⭐⭐⭐
- **行数**: ~900 行
- **功能**:
  - ✅ 聊天消息显示
  - ✅ 流式 AI 响应
  - ✅ 权限管理（隐私卡片）
  - ✅ RAG 开关
  - ✅ 消息复制
  - ✅ 自动滚动
  - ✅ 快速开始提示
  - ✅ Markdown 渲染
  - ✅ 引用和来源显示
  - ✅ 思维过程显示（CoT）
  - ✅ 多模式切换 (auto/ask/agent)

**Props** (18 个):
- `stage`, `currentStageLabel`, `goalContext`, `onUpdateContext`
- `messages`, `setMessages`
- `useRag`, `setUseRag`
- `mode`, `setMode`
- `allowAIDataSharing`, `setAllowAIDataSharing`
- `pendingQuery`, `setPendingQuery`
- `showPermissionCard`, `setShowPermissionCard`
- `requestedDataTypes`, `setRequestedDataTypes`
- `selectedAllowlist`, `setSelectedAllowlist`
- `onExecuteSubstageWithPermission`
- `quickStartPrompt`
- `isLoadingAI`, `setIsLoadingAI`

**依赖**:
```javascript
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractField } from '../../../utils/streamHelpers';
import { getRequiredDataTypes, getDataTypeLabels, shouldShowPermissionCard } from '../../../constants/privacyDataTypes';
import goalEngineService from '../../../services/goalEngineService';
import { Send, Copy, Check, Brain, Activity, Shield, ShieldCheck, ShieldOff, Search, ExternalLink } from 'lucide-react';
import TypewriterMessage from './TypewriterMessage';
```

---

## 🧪 测试文件

需要创建的测试文件：
```
frontend/src/tests/components/goals/engine/
├── TypewriterMessage.test.jsx        ⏳ 待创建
├── SubstageStepIndicator.test.jsx    ⏳ 待创建
├── ConfirmedCard.test.jsx            ⏳ 待创建
├── GapAnalysisForm.test.jsx          ⏳ 待创建
├── AssumptionForm.test.jsx           ⏳ 待创建
└── Copilot.test.jsx                  ⏳ 待创建
```

---

## 📊 进度统计

| 阶段 | 组件数 | 已完成 | 进度 |
|------|--------|--------|------|
| Phase 1 | 3 | 3 | ✅ 100% |
| Phase 2 | 2 | 2 | ✅ 100% |
| Phase 3 | 1 | 0 | ⏳ 0% |
| Phase 4 | 1 | 1 | ✅ 100% |
| **总计** | **7** | **6** | **86%** |

测试覆盖率: 0% (测试文件未创建)

---

## 🚀 下一步操作

### 选项 A: 完成 Copilot 组件拆分 (推荐)
1. 从 `GoalIntakePage.jsx` (第 354-1257 行) 提取完整 Copilot 代码
2. 创建 `Copilot.jsx` (900+ 行)
3. 创建完整的 Props 文档
4. **预计时间**: 2-3 小时

### 选项 B: 先创建测试文件 (快速见效)
1. 为已拆分的 6 个组件创建测试文件
2. 运行测试确保基本功能正常
3. 后续再拆分 Copilot
4. **预计时间**: 2-3 小时
5. **预期覆盖率**: 30-40%

### 选项 C: 创建简化的 Copilot (折中)
1. 只提取 Copilot 的核心功能
2. 保留: 消息显示、发送、权限管理
3. 移除: 高级功能（CoT显示、引用展开等）
4. **预计时间**: 1 小时
5. **代码量**: ~300 行

---

## 💡 使用建议

### 在新项目中使用这些组件：

```javascript
// 导入独立组件
import { TypewriterMessage } from '../components/goals/engine/TypewriterMessage';
import { SubstageStepIndicator } from '../components/goals/engine/SubstageStepIndicator';
import { ConfirmedCard } from '../components/goals/engine/ConfirmedCard';
import { GapAnalysisForm } from '../components/goals/engine/GapAnalysisForm';
import { AssumptionForm } from '../components/goals/engine/AssumptionForm';
import { GENERIC_SUBSTAGES, getSubstagesForCategory, buildInitialSubstageState } from '../components/goals/engine/constants';

// 使用示例
function MyGoalPage() {
    const [formData, setFormData] = useState({});
    
    return (
        <div>
            <SubstageStepIndicator 
                config={GENERIC_SUBSTAGES} 
                state={substageState} 
            />
            
            <GapAnalysisForm
                initialValues={formData}
                onSubmit={(data) => setFormData(data)}
            />
            
            <TypewriterMessage 
                text="Welcome to Goal Engine!"
                onComplete={() => console.log('Done')}
            />
        </div>
    );
}
```

---

## 🔧 维护指南

### 同步更新
如果 `GoalIntakePage.jsx` 中的组件被修改：
1. 在 `engine/` 目录中更新对应的独立组件
2. 更新相关测试
3. 确保 Props 接口保持兼容

### 添加新组件
1. 从 `GoalIntakePage.jsx` 中识别可提取的组件
2. 在 `engine/` 目录中创建新文件
3. 添加 JSDoc 注释和 Props 文档
4. 创建对应的测试文件

---

## 📚 相关文档

- [源文件 GoalIntakePage.jsx](../../pages/GoalIntakePage.jsx) - 3264 行
- [测试策略文档](#) - 待创建
- [组件 API 文档](#) - 待创建

---

**最后更新**: 2026-02-06  
**维护者**: Lucas1479
