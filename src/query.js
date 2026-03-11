import "dotenv/config";
import readline from "readline";
import OpenAI from "openai";
import { embedQuery } from "./utils/embeddings.js";
import { search, loadStore } from "./utils/vectorStore.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function ask(question) {
  const queryEmbedding = await embedQuery(question);
  const results = await search(queryEmbedding, 5);

  if (results.length === 0) {
    console.log(
      "\nНяма намерена информация. Уверете се, че сте пуснали `npm run ingest` преди това.\n",
    );
    return;
  }

  const context = results
    .map((r) => `[${r.metadata.article} — ${r.metadata.source}]\n${r.text}`)
    .join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Ти си полезен асистент по трудово право. Отговаряй точно и ясно на въпроси, като се основаваш на предоставения контекст. Цитирай съответните членове накрая. Отговаряй САМО на български.

Контекст:
${context}

Въпрос: ${question}

Отговор:`,
      },
    ],
  });

  const answer = response.choices[0].message.content;
  const sources = [
    ...new Set(results.map((r) => r.metadata.article).filter(Boolean)),
  ];

  console.log("\nОтговор:");
  console.log(answer);
  console.log("\nИзточници:", sources.join(", "), "\n");
}

async function main() {
  const store = await loadStore();
  if (store.length === 0) {
    console.error("Векторната база е празна. Пуснете `npm run ingest` първо.");
    process.exit(1);
  }

  console.log(`Трудово-правен асистент (${store.length} чл. заредени)`);
  console.log('Напишете "exit" за изход.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("Въпрос: ", async (question) => {
      if (question.toLowerCase() === "exit") {
        rl.close();
        return;
      }
      try {
        await ask(question);
      } catch (err) {
        console.error("Грешка:", err.message);
      }
      prompt();
    });
  };

  prompt();
}

main();
