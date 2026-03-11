import { createRequire } from 'module';
import fs from 'fs';

// pdf-parse is CJS-only, use createRequire to load it in ESM
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export async function extractText(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  return data.text;
}
