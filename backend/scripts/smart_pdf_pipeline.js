import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// ============================================
// Configuration
// ============================================
const TEST_MODE = process.env.TEST_MODE === 'true' || process.argv.includes('--test');
const TINY_MODE = process.env.TEST_MODE === 'tiny';

const CONFIG = {
  INPUT_FILE: TINY_MODE
    ? path.join(__dirname, '../fintwin_vectara_payload_tiny.json')
    : TEST_MODE 
    ? path.join(__dirname, '../fintwin_vectara_payload_test.json')
    : path.join(__dirname, '../fintwin_vectara_payload.json'),
  OUTPUT_FILE: TINY_MODE
    ? path.join(__dirname, '../fintwin_vectara_smart_payload_tiny.json')
    : TEST_MODE
    ? path.join(__dirname, '../fintwin_vectara_smart_payload_test.json')
    : path.join(__dirname, '../fintwin_vectara_smart_payload.json'),
  CACHE_FILE: path.join(__dirname, '../.smart_pipeline_cache.json'),
  BATCH_SIZE: 10, // 🚀 增加到10个sections（更快）
  DELAY_MS: 500, // 🚀 减少到500ms（Gemini限流宽松）
  MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash', // 🚀 使用稳定版flash（更快更便宜）
  TEST_MODE
};

// ============================================
// Initialize Gemini
// ============================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY not found in environment variables');
  console.error('   Please add GEMINI_API_KEY to your .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: CONFIG.MODEL });

// ============================================
// Cache Management
// ============================================
const loadCache = () => {
  if (fs.existsSync(CONFIG.CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG.CACHE_FILE, 'utf-8'));
    } catch (err) {
      console.warn('⚠️ Cache file corrupted, starting fresh');
      return {};
    }
  }
  return {};
};

const saveCache = (cache) => {
  fs.writeFileSync(CONFIG.CACHE_FILE, JSON.stringify(cache, null, 2));
};

const getContentHash = (section) => {
  const content = `${section.title}:${section.text}`;
  return crypto.createHash('md5').update(content).digest('hex');
};

// ============================================
// LLM Processing
// ============================================
const processBatch = async (sections) => {
  const prompt = `
You are a financial document processor with content type awareness. Analyze and filter sections intelligently.

SECTIONS TO ANALYZE:
${sections.map((s, i) => `
[${i}]
Title: ${s.title}
Content Type: ${s.metadata?.content_type || 'unknown'}
Heading: ${s.metadata?.heading || 'none'}
Heading Level: ${s.metadata?.heading_level || 'n/a'}
Content Preview: ${s.text.slice(0, 800)}...
---`).join('\n')}

INTELLIGENT FILTERING RULES:
1. If content_type is "table_of_contents" → ALWAYS set should_keep=false (目录页)
2. If content_type is "header_footer" → ALWAYS set should_keep=false (页眉页脚)
3. If content_type is "metadata_section" (Copyright, ISBN, etc) → set should_keep=false (版权信息)
4. If content_type is "figure_caption" → Evaluate, usually keep=false unless important data
5. If content_type is "list" or "table" → Keep if substantial (>300 chars and informative)
6. If content_type is "paragraph" → KEEP and do full semantic analysis

CONTENT CLEANING (for kept sections):
- Remove: "Printed from", "Index of page links", navigation elements, URLs, repeated page numbers
- Keep: All substantive content, data, analysis, explanations

METADATA GENERATION (for sections with should_keep=true):
- topic: Use heading and content to determine precise topic
  Common: personal_income_tax, investment_tax, kiwisaver, nz_super, housing, retirement_planning,
  wealth_calculation, cash_flow, estate_planning, budgeting, etc
  
- audience: Target reader
  Options: general_public, investors, retirees, first_home_buyers, business_owners, students
  
- keywords: Extract 3-8 specific, searchable keywords (avoid generic words)
  
- document_type: guide|reference|calculation|policy|faq|tutorial|case_study
  
- priority: 
  high = Core concepts, frequently needed info, essential calculations
  medium = Supporting content, detailed explanations
  low = Edge cases, rarely needed details
  
- content_quality:
  high = Substantial content with data/analysis
  medium = Informative but brief
  low = Minimal content

- has_tables: Does content reference specific data tables/statistics?
- has_numbers: Does content include numerical data/calculations?
- has_examples: Does content include practical examples/case studies?

RETURN FORMAT - JSON array with ${sections.length} objects:
[
  {
    "cleaned_text": "cleaned content (or null to use original)",
    "should_keep": true|false,
    "reason_for_filtering": "optional: why filtered (for logging)",
    "metadata": {
      "topic": "specific_topic_name",
      "audience": "target_audience",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "document_type": "type",
      "priority": "high|medium|low",
      "content_quality": "high|medium|low",
      "has_tables": true|false,
      "has_numbers": true|false,
      "has_examples": true|false
    }
  }
]

CRITICAL RULES:
- Return ONLY the JSON array, no markdown, no explanation
- Each object MUST have all fields
- Prioritize content_type in filtering decisions
- Use heading information for accurate topic determination
- Be consistent with topic names across batches
`.trim();

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsed) || parsed.length !== sections.length) {
      throw new Error(`Expected ${sections.length} results, got ${parsed.length}`);
    }
    
    return parsed;
  } catch (err) {
    console.error('⚠️ Batch processing failed:', err.message);
    
    // Fallback: return default metadata for all sections
    return sections.map(() => ({
      cleaned_text: null, // Will use original
      should_keep: true,
      metadata: {
        topic: 'general',
        audience: 'general_public',
        keywords: [],
        document_type: 'reference',
        priority: 'medium',
        content_quality: 'medium'
      }
    }));
  }
};

// ============================================
// Section Processing
// ============================================
const processSection = async (section, cache, stats) => {
  const hash = getContentHash(section);
  
  // Check cache
  if (cache[hash]) {
    stats.fromCache++;
    return { ...section, ...cache[hash], cached: true };
  }
  
  // Process with LLM (will be batched later)
  return { section, hash, needsProcessing: true };
};

const processSections = async (sections, cache) => {
  const stats = {
    total: sections.length,
    processed: 0,
    fromCache: 0,
    filtered: 0,
    kept: 0,
    apiCalls: 0,
    tokensUsed: { input: 0, output: 0 }
  };
  
  console.log(`\n📦 Processing ${sections.length} sections...`);
  console.log(`💾 Cache loaded: ${Object.keys(cache).length} entries\n`);
  
  const processedSections = [];
  const toProcess = [];
  
  // Step 1: Check cache for all sections
  for (const section of sections) {
    const result = await processSection(section, cache, stats);
    
    if (result.cached) {
      // 🆕 对缓存结果也应用强制过滤规则
      const originalContentType = section.metadata?.content_type;
      let shouldKeep = result.should_keep;
      
      if (originalContentType === 'table_of_contents' ||
          originalContentType === 'header_footer' ||
          originalContentType === 'metadata_section') {
        shouldKeep = false;
      }
      
      if (shouldKeep) {
        processedSections.push(result);
        stats.kept++;
      } else {
        stats.filtered++;
      }
      console.log(`💾 [${stats.processed + stats.fromCache}/${stats.total}] Cached: ${section.title}`);
    } else {
      toProcess.push(result);
    }
  }
  
  // Step 2: Batch process remaining sections
  if (toProcess.length > 0) {
    console.log(`\n🤖 Processing ${toProcess.length} new sections with LLM...\n`);
    
    for (let i = 0; i < toProcess.length; i += CONFIG.BATCH_SIZE) {
      const batch = toProcess.slice(i, i + CONFIG.BATCH_SIZE);
      const sections = batch.map(item => item.section);
      
      console.log(`🔄 Batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(toProcess.length / CONFIG.BATCH_SIZE)} (${sections.length} sections)...`);
      
      const results = await processBatch(sections);
      stats.apiCalls++;
      
      // Estimate tokens (rough)
      const inputTokens = sections.reduce((sum, s) => sum + s.text.length / 4, 0) + 500;
      const outputTokens = results.length * 100;
      stats.tokensUsed.input += inputTokens;
      stats.tokensUsed.output += outputTokens;
      
      // Apply results
      for (let j = 0; j < batch.length; j++) {
        const { section, hash } = batch[j];
        const result = results[j];
        
        // 🆕 强制执行过滤规则（不依赖LLM判断）
        const originalContentType = section.metadata?.content_type;
        let shouldKeep = result.should_keep;
        let filterReason = 'low quality';
        
        // 强制过滤规则
        if (originalContentType === 'table_of_contents') {
          shouldKeep = false;
          filterReason = 'Enforced: table_of_contents';
        } else if (originalContentType === 'header_footer') {
          shouldKeep = false;
          filterReason = 'Enforced: header_footer';
        } else if (originalContentType === 'metadata_section') {
          shouldKeep = false;
          filterReason = 'Enforced: metadata_section';
        } else if (originalContentType === 'figure_caption') {
          // 图表标题通常过滤，除非LLM认为重要
          if (!result.should_keep) {
            shouldKeep = false;
            filterReason = 'Enforced: figure_caption';
          }
        }
        
        const processedSection = {
          ...section,
          text: result.cleaned_text || section.text,
          metadata: {
            ...section.metadata,
            ...result.metadata,
            auto_processed: true,
            processed_at: new Date().toISOString()
          },
          should_keep: shouldKeep
        };
        
        // Update cache
        cache[hash] = {
          text: processedSection.text,
          metadata: processedSection.metadata,
          should_keep: shouldKeep
        };
        
        if (shouldKeep) {
          processedSections.push(processedSection);
          stats.kept++;
          console.log(`  ✅ ${section.title} → ${result.metadata.topic}`);
        } else {
          stats.filtered++;
          console.log(`  ❌ ${section.title} (filtered: ${filterReason})`);
        }
        
        stats.processed++;
      }
      
      // Save cache after each batch
      saveCache(cache);
      
      // Delay between batches
      if (i + CONFIG.BATCH_SIZE < toProcess.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_MS));
      }
    }
  }
  
  return { processedSections, stats };
};

// ============================================
// Main Pipeline
// ============================================
const runPipeline = async () => {
  console.log('🚀 FinTwin Smart PDF Pipeline');
  console.log('================================\n');
  
  if (CONFIG.TEST_MODE) {
    console.log('🧪 TEST MODE - Processing single document only');
    console.log('   Input: fintwin_vectara_payload_test.json');
    console.log('   Output: fintwin_vectara_smart_payload_test.json\n');
  }
  
  // Load input
  if (!fs.existsSync(CONFIG.INPUT_FILE)) {
    console.error(`❌ Error: Input file not found: ${CONFIG.INPUT_FILE}`);
    if (CONFIG.TEST_MODE) {
      console.error('   Please run: node scripts/test_single_doc.js first');
    } else {
      console.error('   Please run generate_vectara_payload.js first');
    }
    process.exit(1);
  }
  
  const startTime = Date.now();
  const payload = JSON.parse(fs.readFileSync(CONFIG.INPUT_FILE, 'utf-8'));
  const cache = loadCache();
  
  console.log(`📄 Input: ${path.basename(CONFIG.INPUT_FILE)}`);
  console.log(`🎯 Model: ${CONFIG.MODEL}`);
  console.log(`📦 Batch size: ${CONFIG.BATCH_SIZE}\n`);
  
  // Process all sections (flatten structure)
  const allSections = [];
  for (const section of payload.sections) {
    if (section.sections && section.sections.length > 0) {
      allSections.push(...section.sections);
    } else {
      allSections.push(section);
    }
  }
  
  const { processedSections, stats } = await processSections(allSections, cache);
  
  // Rebuild structure
  const outputSections = [];
  let sectionIndex = 0;
  
  for (const section of payload.sections) {
    if (section.sections && section.sections.length > 0) {
      const childSections = [];
      for (let i = 0; i < section.sections.length; i++) {
        const originalChild = section.sections[i];
        // 🔧 使用index匹配，避免重复title问题
        const childIndex = originalChild.metadata?.chunk_index;
        const processed = processedSections.find(ps => {
          const psIndex = ps.metadata?.chunk_index;
          // 优先匹配index（更准确）
          if (childIndex !== undefined && psIndex !== undefined) {
            return psIndex === childIndex;
          }
          // Fallback: 匹配title
          return ps.title === originalChild.title && ps.metadata?.chunk_index === childIndex;
        });
        
        if (processed) {
          childSections.push(processed);
        }
      }
      
      if (childSections.length > 0) {
        outputSections.push({
          ...section,
          sections: childSections
        });
      }
    } else {
      const processed = processedSections.find(ps => ps.title === section.title);
      if (processed) {
        outputSections.push(processed);
      }
    }
  }
  
  // Save output
  const smartPayload = {
    ...payload,
    id: 'fintwin-spec-smart-v1.3',
    sections: outputSections,
    processing_info: {
      processed_at: new Date().toISOString(),
      model: CONFIG.MODEL,
      original_sections: stats.total,
      kept_sections: stats.kept,
      filtered_sections: stats.filtered,
      api_calls: stats.apiCalls,
      processing_time_ms: Date.now() - startTime
    }
  };
  
  fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(smartPayload, null, 2));
  
  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const estimatedCost = (
    stats.tokensUsed.input / 1_000_000 * 0.075 +
    stats.tokensUsed.output / 1_000_000 * 0.30
  ).toFixed(4);
  
  console.log('\n================================');
  console.log('✅ Pipeline Complete!\n');
  console.log('📊 Stats:');
  console.log(`   - Total sections: ${stats.total}`);
  console.log(`   - Kept: ${stats.kept} (${((stats.kept / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   - Filtered: ${stats.filtered} (${((stats.filtered / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   - From cache: ${stats.fromCache}`);
  console.log(`   - New processed: ${stats.processed}`);
  console.log(`   - API calls: ${stats.apiCalls}`);
  console.log(`   - Tokens: ${Math.round(stats.tokensUsed.input).toLocaleString()} input, ${Math.round(stats.tokensUsed.output).toLocaleString()} output`);
  console.log(`   - Estimated cost: $${estimatedCost}`);
  console.log(`   - Time: ${duration}s\n`);
  console.log(`📄 Output: ${path.basename(CONFIG.OUTPUT_FILE)}`);
  console.log(`💾 Cache: ${path.basename(CONFIG.CACHE_FILE)}`);
  console.log('\n💡 Next step: Run upload_to_vectara.js to upload the smart payload');
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
runPipeline().catch(console.error);
