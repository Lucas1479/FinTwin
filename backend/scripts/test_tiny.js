import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// 微型测试：只处理前30个chunks
// ============================================

// 读取测试payload
const testPayloadPath = path.join(__dirname, '../fintwin_vectara_payload_test.json');

if (!fs.existsSync(testPayloadPath)) {
  console.error('❌ Test payload not found. Run: npm run test-single first');
  process.exit(1);
}

const testPayload = JSON.parse(fs.readFileSync(testPayloadPath, 'utf-8'));

// 只取前30个chunks（包含一些TOC）
const housingDoc = testPayload.sections[0];
const first30Chunks = housingDoc.sections.slice(0, 30);

// 统计content types
const typeStats = {};
first30Chunks.forEach(chunk => {
  const type = chunk.metadata.content_type;
  typeStats[type] = (typeStats[type] || 0) + 1;
});

// 创建微型测试payload
const tinyPayload = {
  ...testPayload,
  id: 'fintwin-test-tiny',
  title: 'Tiny Test: First 30 Chunks',
  description: 'Quick test with 30 chunks (~30 seconds)',
  sections: [{
    ...housingDoc,
    sections: first30Chunks
  }],
  metadata: {
    ...testPayload.metadata,
    test_mode: 'tiny',
    original_chunks: 30,
    content_type_stats: typeStats
  }
};

// 保存
const outputFile = path.join(__dirname, '../fintwin_vectara_payload_tiny.json');
fs.writeFileSync(outputFile, JSON.stringify(tinyPayload, null, 2));

console.log('🧪 Tiny Test Payload Created!\n');
console.log('📦 Chunks: 30 (from Housing document)');
console.log('📊 Content types:', typeStats);
console.log('⏱️ Estimated time: ~30 seconds\n');
console.log('💾 Saved to: fintwin_vectara_payload_tiny.json');
console.log('\n🚀 Run: TEST_MODE=tiny npm run smart-process');
