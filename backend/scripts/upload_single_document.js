import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ============================================
// 上传单个JSON文档到Vectara
// ============================================

const API_KEY = process.env.VECTARA_API_KEY;
// 支持多种corpus key配置方式
const CORPUS_KEY = process.env.VECTARA_CORPUS_KEY 
                || process.env.VECTARA_CORPUS_KEYS?.split(',')[0]
                || process.env.CORPORA_IDS?.split(',')[0];

// 从命令行参数获取文件路径
const fileName = process.argv[2];

if (!fileName) {
  console.error('❌ 错误: 请提供JSON文件路径');
  console.error('\n用法: node scripts/upload_single_document.js <file.json>');
  console.error('\n示例:');
  console.error('  node scripts/upload_single_document.js monetary-policy-statement-november-2025_smart.json');
  process.exit(1);
}

// 检查API配置
if (!API_KEY || !CORPUS_KEY) {
  console.error('❌ 错误: 缺少Vectara配置');
  console.error('   请在.env文件中设置:');
  console.error('   - VECTARA_API_KEY');
  console.error('   - VECTARA_CORPUS_KEY');
  process.exit(1);
}

// 构建文件路径
const filePath = path.isAbsolute(fileName) 
  ? fileName 
  : path.join(__dirname, '..', fileName);

// 检查文件是否存在
if (!fs.existsSync(filePath)) {
  console.error(`❌ 错误: 文件不存在: ${filePath}`);
  process.exit(1);
}

console.log('\n🚀 准备上传文档到Vectara');
console.log('='.repeat(60));

// 读取JSON文件
let payloadData;
try {
  const payload = fs.readFileSync(filePath, 'utf-8');
  payloadData = JSON.parse(payload);
  
  // 清理内部字段（Vectara不认识的字段）
  if (payloadData.sections) {
    payloadData.sections.forEach(section => {
      if (section.sections) {
        section.sections.forEach(subsection => {
          // 删除pipeline内部字段
          delete subsection.should_keep;
        });
      }
    });
  }
  
  // 清理processing_info（这是我们的统计信息，不需要上传）
  delete payloadData.processing_info;
  
} catch (e) {
  console.error(`❌ 错误: 无法解析JSON文件: ${e.message}`);
  process.exit(1);
}

const docId = payloadData.id;
const docTitle = payloadData.title;

if (!docId) {
  console.error('❌ 错误: JSON中缺少document ID');
  process.exit(1);
}

console.log(`📄 文档ID: ${docId}`);
console.log(`📑 标题: ${docTitle}`);
console.log(`📊 内容: ${payloadData.sections?.[0]?.sections?.length || 0} chunks`);
console.log(`📦 文件大小: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
console.log('\n⏳ 正在上传...\n');

// 使用Vectara Indexing API v2
const options = {
  hostname: 'api.vectara.io',
  port: 443,
  path: `/v2/corpora/${CORPUS_KEY}/documents`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': API_KEY
  }
};

const req = https.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('='.repeat(60));
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ 上传成功！');
      console.log(`\n📊 状态码: ${res.statusCode}`);
      
      try {
        const jsonResp = JSON.parse(responseBody);
        if (jsonResp.id || jsonResp.document_id) {
          console.log(`📄 文档ID: ${jsonResp.id || jsonResp.document_id}`);
        }
        console.log('\n服务器响应:');
        console.log(JSON.stringify(jsonResp, null, 2));
      } catch (e) {
        console.log('\n服务器响应:', responseBody);
      }
      
      console.log('\n💡 下一步:');
      console.log('   在前端测试RAG查询，验证文档效果！');
      console.log('\n🗑️  如需删除:');
      console.log(`   curl -X DELETE "https://api.vectara.io/v2/corpora/${CORPUS_KEY}/documents/${docId}" \\`);
      console.log(`        -H "x-api-key: ${API_KEY}"`);
      
    } else {
      console.log(`❌ 上传失败 (状态码: ${res.statusCode})`);
      console.log('\n错误响应:', responseBody);
      
      if (res.statusCode === 409) {
        console.log('\n⚠️  提示: 文档ID已存在');
        console.log('   - Vectara会自动覆盖（upsert）');
        console.log('   - 如果失败，可能需要先删除旧文档');
        console.log(`\n删除命令:`);
        console.log(`   curl -X DELETE "https://api.vectara.io/v2/corpora/${CORPUS_KEY}/documents/${docId}" \\`);
        console.log(`        -H "x-api-key: ${API_KEY}"`);
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        console.log('\n⚠️  提示: 认证失败');
        console.log('   - 检查VECTARA_API_KEY是否正确');
        console.log('   - 检查API Key权限');
      } else if (res.statusCode === 404) {
        console.log('\n⚠️  提示: Corpus不存在');
        console.log('   - 检查VECTARA_CORPUS_KEY是否正确');
      }
    }
    console.log('='.repeat(60) + '\n');
  });
});

req.on('error', (e) => {
  console.error(`\n❌ 请求错误: ${e.message}`);
  console.error('\n可能的原因:');
  console.error('  - 网络连接问题');
  console.error('  - Vectara API不可用');
  console.error('  - 防火墙阻止HTTPS请求');
});

// 发送请求
const payload = JSON.stringify(payloadData);
req.write(payload);
req.end();
