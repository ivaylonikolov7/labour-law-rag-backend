import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { extractText } from "./utils/pdf.js";
import { chunkByArticle } from "./utils/chunker.js";
import { embedTexts } from "./utils/embeddings.js";
import { addChunks, clearStore, loadStore } from "./utils/vectorStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDFS_DIR = path.join(__dirname, "../pdfs");
const BATCH_SIZE = 50;

async function ingest() {
  const files = fs.readdirSync(PDFS_DIR).filter((f) => f.endsWith(".pdf"));

  if (files.length === 0) {
    console.log("No PDFs found in ./pdfs — drop your files there and re-run.");
    return;
  }

  console.log(`Found ${files.length} PDF(s): ${files.join(", ")}`);
  console.log("Clearing existing store...\n");
  await clearStore();

  for (const file of files) {
    const filePath = path.join(PDFS_DIR, file);
    console.log(`Processing: ${file}`);

    const text = await extractText(filePath);
    console.log(`  Extracted ${text.length} characters`);

    const chunks = chunkByArticle(text, file);
    console.log(`  Split into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedTexts(batch.map((c) => c.text));

      const withEmbeddings = batch.map((chunk, j) => ({
        ...chunk,
        embedding: embeddings[j],
        id: `${file}-${i + j}`,
      }));

      await addChunks(withEmbeddings);
      console.log(
        `  Embedded ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`,
      );
    }

    console.log(`  Done: ${file}\n`);
  }

  const store = await loadStore();
  console.log(`Ingestion complete. Total chunks stored: ${store.length}`);
}

ingest().catch((err) => {
  console.error("Ingestion failed:", err.stack || err.message);
  process.exit(1);
});
