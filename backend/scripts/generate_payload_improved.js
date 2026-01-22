import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// Configuration
// ============================================
const CONFIG = {
  DOCS_DIR: path.join(__dirname, '../docs'),
  OUTPUT_FILE: path.join(__dirname, '../fintwin_vectara_payload_v2.json'),
  CHUNK_SIZE: 1000,
};

// ============================================
// 🆕 智能标题检测
// ============================================
const detectHeading = (text) => {
  // 1. 数字编号标题: "1.2.3 Title" or "1 – Title"
  const numbered = text.match(/^(\d+(?:\.\d+)*)\s+[–—-]\s*(.+)$/);
  if (numbered) {
    return {
      text: numbered[2].trim(),
      level: numbered[1].split('.').length,
      number: numbered[1]
    };
  }
  
  // 2. 纯数字开头: "1 Title" (单行)
  const simpleNumber = text.match(/^(\d+)\s+([A-Z].{5,80})$/);
  if (simpleNumber && !text.includes('\n')) {
    return {
      text: simpleNumber[2].trim(),
      level: 1,
      number: simpleNumber[1]
    };
  }
  
  // 3. 全大写标题 (短文本)
  if (text.length < 100 && !text.includes('\n') && text === text.toUpperCase() && text.split(' ').length <= 10) {
    return {
      text: text,
      level: 1,
      number: null
    };
  }
  
  // 4. 标题大小写模式 (首字母大写的连续单词)
  if (text.length < 100 && !text.includes('\n')) {
    const words = text.split(/\s+/);
    const capitalizedWords = words.filter(w => /^[A-Z][a-z]/.test(w)).length;
    if (capitalizedWords >= words.length * 0.7 && words.length >= 2 && words.length <= 15) {
      return {
        text: text,
        level: 2,
        number: null
      };
    }
  }
  
  return null;
};

// ============================================
// 🆕 内容类型检测
// ============================================
const detectContentType = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return 'empty';
  
  // 1. 目录检测 (最关键！)
  const tocPatterns = [
    /^(Contents|Table of Contents|Index)/i,
    /\t\d+$/,  // "Chapter 1    15"
    /\.{3,}\s*\d+$/,  // "Chapter 1 ... 15"
    /^\d+\s+[–—-]\s+.+\t\d+$/  // "1 – Overview    10"
  ];
  
  const tocLines = lines.filter(line => 
    tocPatterns.some(pattern => pattern.test(line.trim()))
  ).length;
  
  // 如果有多行目录格式，或目录特征占比高
  if (tocLines > 3 || (tocLines > 0 && tocLines / lines.length > 0.3)) {
    return 'table_of_contents';
  }
  
  // 特殊：如果开头是"Contents"
  if (/^Contents/i.test(text.slice(0, 50))) {
    return 'table_of_contents';
  }
  
  // 2. 页眉页脚检测
  if (text.length < 100) {
    if (/^Page\s+\d+/i.test(text) ||
        /^\d+\s*$/.test(text) ||
        /^\d+\s+of\s+\d+$/i.test(text)) {
      return 'header_footer';
    }
  }
  
  // 3. 表格检测
  const tableLines = lines.filter(line => 
    line.includes('|') || line.split('\t').length > 3
  ).length;
  if (tableLines / lines.length > 0.5) {
    return 'table';
  }
  
  // 4. 列表检测
  const listLines = lines.filter(line => 
    /^[\s]*[-*•\d]+[\s.)]/.test(line)
  ).length;
  if (listLines / lines.length > 0.4) {
    return 'list';
  }
  
  // 5. 图表标题
  if (text.match(/^(Figure|Table|Chart|Graph|Image|Diagram)\s+\d+/i)) {
    return 'figure_caption';
  }
  
  // 6. 致谢/版权声明
  if (text.match(/^(Acknowledgements|Copyright|Citation|ISBN|Published)/i)) {
    return 'metadata_section';
  }
  
  return 'paragraph';
};

// ============================================
// 🆕 智能分块（保留上下文）
// ============================================
const chunkTextWithContext = (text, maxSize = 1000) => {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  
  let currentChunk = '';
  let currentHeading = null;
  let chunkHeadings = [];
  
  for (const para of paragraphs) {
    const cleaned = para.trim();
    if (!cleaned) continue;
    
    // 检测是否为标题
    const heading = detectHeading(cleaned);
    if (heading) {
      currentHeading = heading;
      chunkHeadings.push(heading);
    }
    
    // 决定是否需要分块
    const wouldExceed = (currentChunk + '\n\n' + cleaned).length > maxSize;
    
    if (wouldExceed && currentChunk) {
      // 保存当前chunk
      chunks.push({
        text: currentChunk.trim(),
        heading: currentHeading ? currentHeading.text : null,
        headingLevel: currentHeading ? currentHeading.level : null,
        headingNumber: currentHeading ? currentHeading.number : null,
        contentType: detectContentType(currentChunk),
        hasHeading: chunkHeadings.length > 0
      });
      
      // 开始新chunk，保留当前标题作为上下文
      currentChunk = cleaned;
      chunkHeadings = currentHeading ? [currentHeading] : [];
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + cleaned;
    }
  }
  
  // 保存最后一个chunk
  if (currentChunk) {
    chunks.push({
      text: currentChunk.trim(),
      heading: currentHeading ? currentHeading.text : null,
      headingLevel: currentHeading ? currentHeading.level : null,
      headingNumber: currentHeading ? currentHeading.number : null,
      contentType: detectContentType(currentChunk),
      hasHeading: chunkHeadings.length > 0
    });
  }
  
  return chunks;
};

// ============================================
// 🆕 PDF文本提取 (需要pdf-parse)
// ============================================
const extractTextFromPDF = async (filePath) => {
  // 注意：这里需要安装 pdf-parse
  // npm install pdf-parse
  try {
    const PDFParser = (await import('pdf-parse')).default;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await PDFParser(dataBuffer);
    
    return {
      text: data.text,
      pages: data.numpages,
      metadata: data.info || {}
    };
  } catch (err) {
    console.error(`  ❌ PDF extraction failed: ${err.message}`);
    return { text: '', pages: 0, metadata: {} };
  }
};

// ============================================
// DOCX文本提取
// ============================================
const extractTextFromDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return {
      text: result.value,
      pages: Math.ceil(result.value.length / 3000),
      metadata: {}
    };
  } catch (err) {
    console.error(`  ❌ DOCX extraction failed: ${err.message}`);
    return { text: '', pages: 0, metadata: {} };
  }
};

// ============================================
// 文档处理
// ============================================
const processDocument = async (fileName) => {
  const filePath = path.join(CONFIG.DOCS_DIR, fileName);
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, ext);
  
  console.log(`\n📄 Processing: ${fileName}`);
  console.log(`   Type: ${ext}`);
  
  let extracted;
  
  if (ext === '.pdf') {
    extracted = await extractTextFromPDF(filePath);
  } else if (ext === '.docx' || ext === '.doc') {
    extracted = await extractTextFromDOCX(filePath);
  } else {
    console.log(`   ⚠️ Unsupported file type: ${ext}`);
    return null;
  }
  
  if (!extracted.text || extracted.text.length < 100) {
    console.log(`   ⚠️ No meaningful content extracted`);
    return null;
  }
  
  console.log(`   ✅ Extracted ${extracted.text.length} characters from ${extracted.pages} pages`);
  
  // 🆕 使用智能分块
  const chunks = chunkTextWithContext(extracted.text, CONFIG.CHUNK_SIZE);
  console.log(`   📦 Created ${chunks.length} chunks`);
  
  // 🆕 统计内容类型
  const typeStats = {};
  chunks.forEach(chunk => {
    typeStats[chunk.contentType] = (typeStats[chunk.contentType] || 0) + 1;
  });
  console.log(`   📊 Content types:`, typeStats);
  
  // 创建sections
  const sections = chunks.map((chunk, idx) => ({
    title: chunk.heading || `${baseName} - Part ${idx + 1}`,
    text: chunk.text,
    metadata: {
      // 基础信息
      type: 'document_chunk',
      source_file: fileName,
      chunk_index: idx,
      total_chunks: chunks.length,
      file_type: ext.slice(1),
      
      // 🆕 结构信息
      heading: chunk.heading,
      heading_level: chunk.headingLevel,
      heading_number: chunk.headingNumber,
      content_type: chunk.contentType,
      has_heading: chunk.hasHeading,
      
      // 时间戳
      extracted_at: new Date().toISOString()
    }
  }));
  
  return {
    title: baseName,
    text: `Document: ${baseName} (${extracted.pages} pages, ${chunks.length} sections)`,
    sections,
    metadata: {
      type: 'document',
      source_file: fileName,
      file_type: ext.slice(1),
      pages: extracted.pages,
      chunks: chunks.length,
      content_type_stats: typeStats,
      ...extracted.metadata
    }
  };
};

// ============================================
// Main Pipeline
// ============================================
const generatePayload = async () => {
  console.log('🚀 Improved Generate Payload from Docs');
  console.log('========================================\n');
  console.log(`📁 Docs directory: ${CONFIG.DOCS_DIR}\n`);
  
  // List all files
  const files = fs.readdirSync(CONFIG.DOCS_DIR);
  const supportedFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.pdf', '.docx', '.doc'].includes(ext);
  });
  
  console.log(`📋 Found ${supportedFiles.length} supported documents:\n`);
  supportedFiles.forEach((f, i) => {
    console.log(`   ${i + 1}. ${f}`);
  });
  
  if (supportedFiles.length === 0) {
    console.error('\n❌ No supported documents found');
    process.exit(1);
  }
  
  // Process all documents
  const processedDocs = [];
  let totalChunks = 0;
  const globalTypeStats = {};
  
  for (const file of supportedFiles) {
    const doc = await processDocument(file);
    if (doc) {
      processedDocs.push(doc);
      totalChunks += doc.sections.length;
      
      // Aggregate content type stats
      for (const [type, count] of Object.entries(doc.metadata.content_type_stats || {})) {
        globalTypeStats[type] = (globalTypeStats[type] || 0) + count;
      }
    }
  }
  
  // Create payload
  const payload = {
    id: 'fintwin-docs-v2.0-improved',
    type: 'structured',
    title: 'FinTwin Knowledge Base - Documents (Improved)',
    description: `Extracted from ${processedDocs.length} documents with smart chunking and content type detection`,
    metadata: {
      version: '2.0',
      scope: 'Financial Knowledge',
      audience: 'AI Agents',
      generated_at: new Date().toISOString(),
      source_directory: 'docs',
      total_documents: processedDocs.length,
      total_chunks: totalChunks,
      improvements: [
        'Smart heading detection',
        'Content type classification',
        'Context-aware chunking',
        'TOC and header/footer detection'
      ],
      global_content_type_stats: globalTypeStats
    },
    sections: processedDocs
  };
  
  // Save payload
  fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(payload, null, 2));
  
  // Summary
  console.log('\n========================================');
  console.log('✅ Improved Payload Generated!\n');
  console.log('📊 Summary:');
  console.log(`   - Documents processed: ${processedDocs.length}/${supportedFiles.length}`);
  console.log(`   - Total chunks: ${totalChunks}`);
  console.log(`   - Average chunks/doc: ${(totalChunks / processedDocs.length).toFixed(1)}`);
  console.log(`\n📊 Global Content Types:`);
  for (const [type, count] of Object.entries(globalTypeStats).sort((a, b) => b[1] - a[1])) {
    const percentage = ((count / totalChunks) * 100).toFixed(1);
    console.log(`   - ${type}: ${count} (${percentage}%)`);
  }
  console.log(`\n📄 Output: ${path.basename(CONFIG.OUTPUT_FILE)}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Review content_type distribution');
  console.log('   2. Run smart_pdf_pipeline.js with updated prompt');
  console.log('   3. Filter out table_of_contents and header_footer chunks');
};

// ============================================
// Error Handling
// ============================================
process.on('unhandledRejection', (err) => {
  console.error('\n❌ Fatal Error:', err.message);
  process.exit(1);
});

// ============================================
// Run
// ============================================
generatePayload().catch(console.error);
