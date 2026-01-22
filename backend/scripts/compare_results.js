import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// 对比测试结果
// ============================================

console.log('📊 Smart Pipeline Test Results Comparison\n');
console.log('='.repeat(60));

// 读取原始测试payload
const testPayloadPath = path.join(__dirname, '../fintwin_vectara_payload_test.json');
const smartPayloadPath = path.join(__dirname, '../fintwin_vectara_smart_payload_test.json');

if (!fs.existsSync(testPayloadPath)) {
  console.error('❌ Test payload not found. Run: npm run test-single');
  process.exit(1);
}

if (!fs.existsSync(smartPayloadPath)) {
  console.error('❌ Smart payload not found. Run: npm run test-smart-process');
  process.exit(1);
}

const originalPayload = JSON.parse(fs.readFileSync(testPayloadPath, 'utf-8'));
const smartPayload = JSON.parse(fs.readFileSync(smartPayloadPath, 'utf-8'));

// 统计原始数据
const originalDoc = originalPayload.sections[0];
const originalSections = originalDoc.sections;
const originalStats = originalPayload.metadata.content_type_stats;

console.log('\n📄 Document:', originalDoc.title);
console.log('   Pages:', originalPayload.metadata.total_chunks, 'chunks\n');

console.log('🔵 BEFORE Smart Processing (Original)');
console.log('─'.repeat(60));
console.log('Total sections:', originalSections.length);
console.log('\nContent Type Breakdown:');
for (const [type, count] of Object.entries(originalStats).sort((a, b) => b[1] - a[1])) {
  const percentage = ((count / originalSections.length) * 100).toFixed(1);
  console.log(`  - ${type.padEnd(25)} ${count.toString().padStart(3)} (${percentage}%)`);
}

// 统计处理后数据
const smartDoc = smartPayload.sections[0];
const smartSections = smartDoc.sections;
const processingInfo = smartPayload.processing_info || {};

console.log('\n🟢 AFTER Smart Processing (Filtered)');
console.log('─'.repeat(60));
console.log('Total sections:', smartSections.length);
console.log('Filtered out:', processingInfo.filtered_sections_count || 0);

// 统计处理后的content_type
const smartStats = {};
smartSections.forEach(s => {
  const type = s.metadata.content_type || 'unknown';
  smartStats[type] = (smartStats[type] || 0) + 1;
});

console.log('\nContent Type Breakdown (after filtering):');
for (const [type, count] of Object.entries(smartStats).sort((a, b) => b[1] - a[1])) {
  const percentage = ((count / smartSections.length) * 100).toFixed(1);
  console.log(`  - ${type.padEnd(25)} ${count.toString().padStart(3)} (${percentage}%)`);
}

// 计算改进
const filterRate = ((processingInfo.filtered_sections_count / originalSections.length) * 100).toFixed(1);
const keepRate = ((smartSections.length / originalSections.length) * 100).toFixed(1);

console.log('\n📈 Improvement Metrics');
console.log('─'.repeat(60));
console.log(`Original chunks:           ${originalSections.length}`);
console.log(`Kept chunks:               ${smartSections.length} (${keepRate}%)`);
console.log(`Filtered chunks:           ${processingInfo.filtered_sections_count} (${filterRate}%)`);

// 检查TOC过滤
const originalTOC = originalStats.table_of_contents || 0;
const smartTOC = smartStats.table_of_contents || 0;
const tocFiltered = originalTOC - smartTOC;

console.log(`\nTable of Contents (TOC):`);
console.log(`  Original TOC chunks:     ${originalTOC}`);
console.log(`  Remaining TOC chunks:    ${smartTOC}`);
console.log(`  TOC chunks filtered:     ${tocFiltered} ${tocFiltered > 0 ? '✅' : '⚠️'}`);

// 显示一些被过滤的例子
console.log('\n📋 Sample of Filtered Chunks');
console.log('─'.repeat(60));

const filteredChunks = originalSections.filter(orig => {
  return !smartSections.find(smart => smart.title === orig.title);
});

console.log(`Total filtered: ${filteredChunks.length}\n`);
filteredChunks.slice(0, 5).forEach((chunk, i) => {
  console.log(`${i + 1}. ${chunk.title}`);
  console.log(`   Type: ${chunk.metadata.content_type}`);
  console.log(`   Preview: ${chunk.text.slice(0, 80)}...`);
  console.log('');
});

if (filteredChunks.length > 5) {
  console.log(`   ... and ${filteredChunks.length - 5} more\n`);
}

// 显示一些保留的例子
console.log('📋 Sample of Kept Chunks (with metadata)');
console.log('─'.repeat(60));
smartSections.slice(0, 3).forEach((chunk, i) => {
  const meta = chunk.metadata;
  console.log(`${i + 1}. ${chunk.title}`);
  console.log(`   Type: ${meta.content_type}`);
  console.log(`   Topic: ${meta.topic || 'N/A'}`);
  console.log(`   Audience: ${meta.audience || 'N/A'}`);
  console.log(`   Priority: ${meta.priority || 'N/A'}`);
  console.log(`   Keywords: ${meta.keywords?.join(', ') || 'N/A'}`);
  console.log('');
});

console.log('='.repeat(60));
console.log('\n✅ Comparison complete!');
console.log('💡 If results look good, run full processing:');
console.log('   npm run generate-from-docs && npm run smart-process\n');
