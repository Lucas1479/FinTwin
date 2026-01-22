import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheFile = path.join(__dirname, '../.smart_pipeline_cache.json');

if (fs.existsSync(cacheFile)) {
  fs.unlinkSync(cacheFile);
  console.log('✅ Cache cleared:', cacheFile);
} else {
  console.log('ℹ️ No cache file found');
}
