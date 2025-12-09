import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsPath = path.join(__dirname, '..', 'data', 'processed', 'products.json');

let productsData = [];

try {
  const raw = fs.readFileSync(productsPath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    productsData = parsed;
  } else {
    // eslint-disable-next-line no-console
    console.error('[productsData] Parsed JSON is not an array, defaulting to empty list');
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[productsData] Failed to load products JSON:', err.message);
  productsData = [];
}

export default productsData;