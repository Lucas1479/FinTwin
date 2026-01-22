const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
// You can hardcode these for testing, or use process.env
const API_KEY = process.env.VECTARA_API_KEY || 'YOUR_API_KEY_HERE';
const CORPUS_KEY = process.env.VECTARA_CORPUS_KEY || 'YOUR_CORPUS_KEY_HERE';
const CUSTOMER_ID = process.env.VECTARA_CUSTOMER_ID || 'YOUR_CUSTOMER_ID_HERE'; // Only needed for some legacy API calls, usually Corpus Key is enough for v2

// Use smart payload if available, otherwise use regular payload
const SMART_PAYLOAD_FILE = path.join(__dirname, '../fintwin_vectara_smart_payload.json');
const REGULAR_PAYLOAD_FILE = path.join(__dirname, '../fintwin_vectara_payload.json');
const PAYLOAD_FILE = fs.existsSync(SMART_PAYLOAD_FILE) ? SMART_PAYLOAD_FILE : REGULAR_PAYLOAD_FILE;

const uploadToVectara = () => {
  if (!fs.existsSync(PAYLOAD_FILE)) {
    console.error(`❌ Error: Payload file not found at ${PAYLOAD_FILE}`);
    console.error(`   Run 'node scripts/generate_vectara_payload.js' first.`);
    process.exit(1);
  }

  const payload = fs.readFileSync(PAYLOAD_FILE, 'utf-8');
  const payloadData = JSON.parse(payload);
  
  // Prepare Document ID for replacement (Upsert logic)
  // We explicitly set the document ID in the generator script as 'fintwin-spec-v1.3'
  // But let's verify.
  const docId = payloadData.id; 
  if (!docId) {
      console.error("❌ Error: Document ID missing in payload.");
      process.exit(1);
  }

  console.log(`🚀 Preparing to ingest document: ${docId} (${payloadData.title})...`);

  // Using Vectara Indexing API v2
  // POST /v2/corpora/:corpus_key/documents
  
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
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ Success! Document ingested.');
        try {
            const jsonResp = JSON.parse(responseBody);
            console.log('Server Response:', JSON.stringify(jsonResp, null, 2));
        } catch (e) {
            console.log('Server Response:', responseBody);
        }
      } else {
        console.error(`❌ Upload Failed (Status: ${res.statusCode})`);
        console.error('Response:', responseBody);
        
        if (res.statusCode === 409) {
             console.log("⚠️ Hint: Document ID might already exist. Vectara usually overwrites, but check if you need to delete it first.");
        }
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request Error: ${e.message}`);
  });

  // Write data to request body
  req.write(payload);
  req.end();
};

// Check for missing keys
if (API_KEY === 'YOUR_API_KEY_HERE' || CORPUS_KEY === 'YOUR_CORPUS_KEY_HERE') {
    console.warn("⚠️  WARNING: API Key or Corpus Key not set.");
    console.warn("   Please set VECTARA_API_KEY and VECTARA_CORPUS_KEY environment variables,");
    console.warn("   OR edit scripts/upload_to_vectara.js directly.");
    process.exit(1);
}

uploadToVectara();
