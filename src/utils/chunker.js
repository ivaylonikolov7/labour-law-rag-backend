/**
 * Splits Bulgarian law text into chunks by article (Чл. N.)
 * Each article becomes one chunk with its metadata.
 */
export function chunkByArticle(text, source) {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const parts = text.split(/(?=Чл\.\s*\d+\.)/).filter(p => p.trim().length > 50);

  if (parts.length < 5) {
    console.warn(`  Warning: only ${parts.length} article chunks found in ${source}, falling back to paragraph chunking`);
    return chunkByParagraph(text, source);
  }

  const MAX_CHARS = 24000; // ~6000 tokens (4 chars/token avg), well under 8192 limit

  const results = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const match = part.match(/^Чл\.\s*(\d+)\./);
    const articleNum = match ? match[1] : null;
    const article = articleNum ? `Чл. ${articleNum}` : `Section ${index + 1}`;

    if (part.trim().length <= MAX_CHARS) {
      results.push({ text: part.trim(), metadata: { source, article } });
    } else {
      // Split oversized article into word-based sub-chunks
      const words = part.trim().split(/\s+/);
      const size = 500;
      const overlap = 50;
      let sub = 0;
      for (let i = 0; i < words.length; i += size - overlap) {
        const chunk = words.slice(i, i + size).join(' ');
        if (chunk.trim().length > 100) {
          results.push({
            text: chunk.trim(),
            metadata: { source, article: `${article} (part ${++sub})` },
          });
        }
      }
    }
  }
  return results;
}

/**
 * Fallback: split into ~500 word windows with 50 word overlap.
 */
function chunkByParagraph(text, source) {
  const words = text.split(/\s+/);
  const chunks = [];
  const size = 500;
  const overlap = 50;

  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(' ');
    if (chunk.trim().length > 100) {
      chunks.push({
        text: chunk.trim(),
        metadata: { source, article: `Block ${chunks.length + 1}` },
      });
    }
  }

  return chunks;
}
