import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('PDFParse type:', typeof PDFParse);

const testFile = path.join(__dirname, '../docs/Who can get NZ Super - Work and Income.pdf');
const dataBuffer = fs.readFileSync(testFile);
const uint8Array = new Uint8Array(dataBuffer);

const parser = new PDFParse(uint8Array);

// Use getText() method
parser.getText().then(data => {
  console.log('✅ Success with getText()!');
  console.log('Data type:', typeof data);
  console.log('Data keys:', Object.keys(data));
  console.log('Text length:', data.text.length);
  console.log('Pages:', data.pages);
  console.log('\nFirst 300 chars:');
  console.log(data.text.slice(0, 300));
}).catch(err => {
  console.error('Error:', err.message);
});
