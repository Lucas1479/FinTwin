import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// 测试单个文档：只处理Housing文档
// ============================================

// 读取完整payload
const fullPayload = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fintwin_vectara_payload.json'), 'utf-8')
);

// 找到Housing文档
const housingDoc = fullPayload.sections.find(
  s => s.title.includes('Housing-in-aotearoa')
);

if (!housingDoc) {
  console.error('❌ Housing document not found!');
  process.exit(1);
}

// 创建测试payload（只包含Housing）
const testPayload = {
  ...fullPayload,
  id: 'fintwin-test-housing-only',
  title: 'Test: Housing Document Only',
  description: 'Testing smart pipeline with Housing document (has 18 TOC chunks)',
  sections: [housingDoc],
  metadata: {
    ...fullPayload.metadata,
    test_mode: true,
    test_document: housingDoc.title,
    original_chunks: housingDoc.sections.length,
    content_type_stats: housingDoc.metadata.content_type_stats
  }
};

// 保存测试payload
const outputFile = path.join(__dirname, '../fintwin_vectara_payload_test.json');
fs.writeFileSync(outputFile, JSON.stringify(testPayload, null, 2));

console.log('🧪 Test Payload Created!\n');
console.log('📄 Document:', housingDoc.title);
console.log('📦 Total chunks:', housingDoc.sections.length);
console.log('📊 Content types:', housingDoc.metadata.content_type_stats);
console.log('\n💾 Saved to: fintwin_vectara_payload_test.json');
console.log('\n🚀 Next: Modify smart_pdf_pipeline.js to use test payload');
