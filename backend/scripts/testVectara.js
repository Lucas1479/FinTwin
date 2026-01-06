import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Force-load backend/.env regardless of where this script is run
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Dynamic import after env is loaded
const { default: vectaraClient } = await import('../services/vectaraClient.js');

const query = process.argv.slice(2).join(' ') || 'nz super eligibility';

async function main() {
  try {
    console.log('[TestVectara] Loaded env:', {
      hasKey: !!process.env.VECTARA_API_KEY,
      customerId: process.env.CUSTOMER_ID,
      corpora: process.env.CORPORA_IDS,
    });

    const result = await vectaraClient.searchAndSummarize(query);
    console.log('[TestVectara] Summary:', result.summary?.slice(0, 300));
    console.log('[TestVectara] Passages:', result.passages.length);
    result.passages.slice(0, 3).forEach((p, i) => {
      console.log(`  [${i + 1}] score=${p.score?.toFixed?.(3)} source=${p.source} url=${p.url}`);
      console.log(`      ${p.text?.slice(0, 200)}`);
    });
  } catch (err) {
    console.error('[TestVectara] Error:', err.message);
  }
}

main();

