import OpenAI from "openai";

let openai;

function getClient() {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

export async function embedTexts(texts) {
  const truncatedTexts = texts.map((text) => text.slice(0, 30000)); // Truncate to ~8000 tokens
  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small",
    input: truncatedTexts,
  });
  return response.data.map((d) => d.embedding);
}

export async function embedQuery(text) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
