const https = require('https');

// Configuration
const API_KEY = process.env.VECTARA_API_KEY;
const CORPUS_KEY = process.env.VECTARA_CORPUS_KEY;
const DOCUMENT_ID = 'fintwin-spec-v1.3';

if (!API_KEY || !CORPUS_KEY) {
    console.error("❌ Error: VECTARA_API_KEY or VECTARA_CORPUS_KEY not set.");
    process.exit(1);
}

console.log(`🗑️  Attempting to delete document: ${DOCUMENT_ID}...`);

const options = {
  hostname: 'api.vectara.io',
  port: 443,
  path: `/v2/corpora/${CORPUS_KEY}/documents/${DOCUMENT_ID}`,
  method: 'DELETE',
  headers: {
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
      console.log('✅ Success! Document deleted.');
    } else if (res.statusCode === 404) {
      console.log('ℹ️  Document not found (already deleted or never existed).');
    } else {
      console.error(`❌ Delete Failed (Status: ${res.statusCode})`);
      console.error('Response:', responseBody);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request Error: ${e.message}`);
});

req.end();
