import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// 查看Pipeline处理结果
// ============================================

const FILES = {
  original: path.join(__dirname, '../fintwin_vectara_payload.json'),
  smart: path.join(__dirname, '../fintwin_vectara_smart_payload.json'),
  tiny: path.join(__dirname, '../fintwin_vectara_smart_payload_tiny.json'),
  cache: path.join(__dirname, '../.smart_pipeline_cache.json')
};

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function analyzePayload(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`\n❌ ${label}: 文件不存在`);
    return null;
  }

  const stats = fs.statSync(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📄 ${label}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`文件: ${path.basename(filePath)}`);
  console.log(`大小: ${formatBytes(stats.size)}`);
  console.log(`更新时间: ${stats.mtime.toLocaleString('zh-CN')}`);
  
  console.log(`\n📊 文档信息:`);
  console.log(`  ID: ${data.id}`);
  console.log(`  标题: ${data.title}`);
  console.log(`  描述: ${data.description || 'N/A'}`);
  
  // 统计sections
  let totalSections = 0;
  let contentTypes = {};
  let topics = {};
  let qualities = {};
  
  if (data.sections && data.sections.length > 0) {
    data.sections.forEach(parent => {
      if (parent.sections) {
        totalSections += parent.sections.length;
        parent.sections.forEach(s => {
          // Content type
          const ct = s.metadata?.content_type || 'unknown';
          contentTypes[ct] = (contentTypes[ct] || 0) + 1;
          
          // Topic (smart payload only)
          if (s.metadata?.topic) {
            const topic = s.metadata.topic;
            topics[topic] = (topics[topic] || 0) + 1;
          }
          
          // Quality (smart payload only)
          if (s.metadata?.content_quality) {
            const q = s.metadata.content_quality;
            qualities[q] = (qualities[q] || 0) + 1;
          }
        });
      }
    });
  }
  
  console.log(`\n📦 内容统计:`);
  console.log(`  总sections: ${totalSections}`);
  
  console.log(`\n  内容类型分布:`);
  Object.entries(contentTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const pct = ((count / totalSections) * 100).toFixed(1);
      console.log(`    - ${type}: ${count} (${pct}%)`);
    });
  
  // Smart payload特有信息
  if (data.processing_info) {
    console.log(`\n🤖 智能处理信息:`);
    console.log(`  模型: ${data.processing_info.model}`);
    console.log(`  原始sections: ${data.processing_info.original_sections || data.processing_info.total_sections}`);
    console.log(`  保留: ${data.processing_info.kept_sections}`);
    console.log(`  过滤: ${data.processing_info.filtered_sections}`);
    const keepRate = ((data.processing_info.kept_sections / (data.processing_info.original_sections || data.processing_info.total_sections)) * 100).toFixed(1);
    console.log(`  保留率: ${keepRate}%`);
    console.log(`  API调用: ${data.processing_info.api_calls}`);
    console.log(`  处理时间: ${(data.processing_info.processing_time_ms / 1000).toFixed(1)}s`);
    if (data.processing_info.estimated_cost) {
      console.log(`  预估成本: $${data.processing_info.estimated_cost}`);
    }
    console.log(`  处理时间: ${new Date(data.processing_info.processed_at).toLocaleString('zh-CN')}`);
    
    if (Object.keys(topics).length > 0) {
      console.log(`\n  主题分布 (Top 10):`);
      Object.entries(topics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([topic, count]) => {
          const pct = ((count / totalSections) * 100).toFixed(1);
          console.log(`    - ${topic}: ${count} (${pct}%)`);
        });
    }
    
    if (Object.keys(qualities).length > 0) {
      console.log(`\n  质量分布:`);
      Object.entries(qualities)
        .sort((a, b) => b[1] - a[1])
        .forEach(([quality, count]) => {
          const pct = ((count / totalSections) * 100).toFixed(1);
          console.log(`    - ${quality}: ${count} (${pct}%)`);
        });
    }
  }
  
  // 显示示例sections
  if (data.sections && data.sections[0]?.sections) {
    console.log(`\n📋 示例Sections (前3个):`);
    data.sections[0].sections.slice(0, 3).forEach((s, i) => {
      console.log(`\n  [${i + 1}] ${s.title.substring(0, 60)}${s.title.length > 60 ? '...' : ''}`);
      if (s.metadata?.topic) {
        console.log(`      主题: ${s.metadata.topic}`);
      }
      if (s.metadata?.audience) {
        console.log(`      受众: ${s.metadata.audience}`);
      }
      if (s.metadata?.content_quality) {
        console.log(`      质量: ${s.metadata.content_quality}`);
      }
      if (s.metadata?.keywords) {
        console.log(`      关键词: ${s.metadata.keywords.slice(0, 3).join(', ')}`);
      }
      console.log(`      文本: ${s.text.substring(0, 100)}...`);
    });
  }
  
  return {
    totalSections,
    contentTypes,
    topics,
    qualities,
    processingInfo: data.processing_info
  };
}

function analyzeCache() {
  if (!fs.existsSync(FILES.cache)) {
    console.log(`\n❌ 缓存文件不存在`);
    return;
  }
  
  const stats = fs.statSync(FILES.cache);
  const cache = JSON.parse(fs.readFileSync(FILES.cache, 'utf8'));
  const entries = Object.keys(cache).length;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`💾 缓存信息`);
  console.log(`${'='.repeat(70)}`);
  console.log(`文件: ${path.basename(FILES.cache)}`);
  console.log(`大小: ${formatBytes(stats.size)}`);
  console.log(`缓存条目: ${entries}`);
  console.log(`更新时间: ${stats.mtime.toLocaleString('zh-CN')}`);
  
  // 统计缓存中的keep/filter比例
  let kept = 0, filtered = 0;
  Object.values(cache).forEach(entry => {
    if (entry.should_keep) kept++;
    else filtered++;
  });
  
  console.log(`\n缓存统计:`);
  console.log(`  保留: ${kept}`);
  console.log(`  过滤: ${filtered}`);
  console.log(`  保留率: ${((kept / entries) * 100).toFixed(1)}%`);
}

// ============================================
// Main
// ============================================

console.log('\n🔍 FinTwin 数据清洗Pipeline - 结果查看器\n');

const mode = process.argv[2] || 'all';

switch (mode) {
  case 'original':
    analyzePayload(FILES.original, '原始Payload');
    break;
  case 'smart':
    analyzePayload(FILES.smart, '智能处理后Payload (完整版)');
    break;
  case 'tiny':
    analyzePayload(FILES.tiny, '智能处理后Payload (测试版)');
    break;
  case 'cache':
    analyzeCache();
    break;
  case 'compare':
    console.log('📊 对比分析\n');
    const orig = analyzePayload(FILES.original, '原始Payload');
    const smart = analyzePayload(FILES.smart, '智能处理后Payload');
    
    if (orig && smart) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📈 改进效果`);
      console.log(`${'='.repeat(70)}`);
      console.log(`原始sections: ${orig.totalSections}`);
      console.log(`处理后sections: ${smart.totalSections}`);
      console.log(`过滤掉: ${orig.totalSections - smart.totalSections} (${(((orig.totalSections - smart.totalSections) / orig.totalSections) * 100).toFixed(1)}%)`);
      console.log(`\n质量提升:`);
      console.log(`  ✅ 添加了主题标签: ${Object.keys(smart.topics).length}个主题`);
      console.log(`  ✅ 添加了质量评级: ${Object.keys(smart.qualities).length}个等级`);
      console.log(`  ✅ 过滤了低质量内容`);
    }
    break;
  case 'all':
  default:
    analyzePayload(FILES.original, '原始Payload');
    analyzePayload(FILES.smart, '智能处理后Payload (完整版)');
    analyzePayload(FILES.tiny, '智能处理后Payload (测试版)');
    analyzeCache();
    break;
}

console.log(`\n${'='.repeat(70)}`);
console.log(`\n💡 使用方法:`);
console.log(`  node scripts/view_pipeline_results.js [mode]`);
console.log(`\n  mode选项:`);
console.log(`    all      - 查看所有文件 (默认)`);
console.log(`    original - 只查看原始payload`);
console.log(`    smart    - 只查看智能处理后payload (完整版)`);
console.log(`    tiny     - 只查看智能处理后payload (测试版)`);
console.log(`    cache    - 只查看缓存信息`);
console.log(`    compare  - 对比原始和处理后的差异`);
console.log('');
