import fs from "fs";
import path from "path";

const STORE_PATH = "./data/vectors.json";

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function loadStore() {
  if (!fs.existsSync(STORE_PATH)) return [];
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function saveStore(chunks) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(chunks));
}

export async function addChunks(newChunks) {
  const existing = await loadStore();
  saveStore([...existing, ...newChunks]);
}

export async function search(queryEmbedding, topK = 5) {
  const chunks = await loadStore();
  return chunks
    .map((c) => ({ ...c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function clearStore() {
  if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
}
