import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📊 Tiny Test Results - Quality Analysis\n');
console.log('='.repeat(70));

// 读取原始和处理后的payload
const originalPath = path.join(__dirname, '../fintwin_vectara_payload_tiny.json');
const smartPath = path.join(__dirname, '../fintwin_vectara_smart_payload_tiny.json');

if (!fs.existsSync(originalPath) || !fs.existsSync(smartPath)) {
  console.error('❌ Test files not found. Run tiny test first.');
  process.exit(1);
}

const original = JSON.parse(fs.readFileSync(originalPath, 'utf-8'));
const smart = JSON.parse(fs.readFileSync(smartPath, 'utf-8'));

const originalSections = original.sections[0].sections;
const smartSections = smart.sections[0].sections;

console.log('\n🔵 ORIGINAL (Before Processing)');
console.log('─'.repeat(70));
console.log('Total chunks:', originalSections.length);
console.log('Content types:', original.metadata.content_type_stats);

console.log('\n🟢 PROCESSED (After Smart Filtering)');
console.log('─'.repeat(70));
console.log('Total chunks:', smartSections.length);
console.log('Filtered out:', originalSections.length - smartSections.length);

// 统计处理后的类型
const smartStats = {};
smartSections.forEach(s => {
  const type = s.metadata.content_type || 'unknown';
  smartStats[type] = (smartStats[type] || 0) + 1;
});
console.log('Content types (after):', smartStats);

// 找出被过滤的chunks
const filtered = originalSections.filter(orig => 
  !smartSections.find(smart => smart.title === orig.title)
);

console.log('\n❌ FILTERED CHUNKS (19 total)');
console.log('─'.repeat(70));

const filteredByType = {};
filtered.forEach(chunk => {
  const type = chunk.metadata.content_type;
  filteredByType[type] = (filteredByType[type] || 0) + 1;
});

console.log('Filtered by type:', filteredByType);
console.log('\nSample filtered chunks:');
filtered.slice(0, 8).forEach((chunk, i) => {
  console.log(`\n${i + 1}. ${chunk.title}`);
  console.log(`   Type: ${chunk.metadata.content_type}`);
  console.log(`   Preview: ${chunk.text.slice(0, 100)}...`);
});

console.log('\n✅ KEPT CHUNKS (11 total) - Metadata Quality');
console.log('─'.repeat(70));

// 分析metadata质量
const topicStats = {};
const hasKeywords = smartSections.filter(s => s.metadata.keywords?.length > 0).length;
const hasAccurateTopic = smartSections.filter(s => s.metadata.topic !== 'general').length;

smartSections.forEach(s => {
  const topic = s.metadata.topic || 'unknown';
  topicStats[topic] = (topicStats[topic] || 0) + 1;
});

console.log(`\nMetadata Quality:`);
console.log(`  - With accurate topics: ${hasAccurateTopic}/${smartSections.length} (${(hasAccurateTopic/smartSections.length*100).toFixed(1)}%)`);
console.log(`  - With keywords: ${hasKeywords}/${smartSections.length} (${(hasKeywords/smartSections.length*100).toFixed(1)}%)`);
console.log(`\nTopic distribution:`, topicStats);

console.log('\n📋 Sample Kept Chunks:');
smartSections.slice(0, 5).forEach((chunk, i) => {
  const meta = chunk.metadata;
  console.log(`\n${i + 1}. ${chunk.title}`);
  console.log(`   Content Type: ${meta.content_type}`);
  console.log(`   Topic: ${meta.topic || 'N/A'}`);
  console.log(`   Audience: ${meta.audience || 'N/A'}`);
  console.log(`   Priority: ${meta.priority || 'N/A'}`);
  console.log(`   Keywords: ${meta.keywords?.join(', ') || 'None'}`);
  console.log(`   Quality: ${meta.content_quality || 'N/A'}`);
  console.log(`   Text: ${chunk.text.slice(0, 100)}...`);
});

// 检查TOC过滤效果
const originalTOC = original.metadata.content_type_stats.table_of_contents || 0;
const smartTOC = smartStats.table_of_contents || 0;

console.log('\n🎯 TOC Filtering Analysis');
console.log('─'.repeat(70));
console.log(`Original TOC chunks: ${originalTOC}`);
console.log(`Remaining TOC chunks: ${smartTOC}`);
console.log(`TOC chunks filtered: ${originalTOC - smartTOC}`);
console.log(`Filtering success rate: ${((originalTOC - smartTOC) / originalTOC * 100).toFixed(1)}%`);

if (smartTOC === 0) {
  console.log('✅ Perfect! All TOC chunks filtered!');
} else {
  console.log(`⚠️ ${smartTOC} TOC chunks still remain`);
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ Quality Analysis Complete!');
console.log('💡 If results look good, run full processing:');
console.log('   npm run clear-cache && npm run test-smart-process\n');
