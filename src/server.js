import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { embedQuery } from './utils/embeddings.js';
import { search, loadStore } from './utils/vectorStore.js';

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

(async () => {
  const store = await loadStore();
  if (store.length === 0) {
    console.error('Векторната база е празна. Пуснете `npm run ingest` първо.');
  } else {
    console.log(`Сървърът е готов. Заредени ${store.length} члена.`);
  }
})();

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/ask', async (req, res) => {
  const { question, persona } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Полето "question" е задължително.' });
  }

  try {
    const queryEmbedding = await embedQuery(question);
    const results = await search(queryEmbedding, 5);

    if (results.length === 0) {
      return res.json({
        answer: 'Няма намерена информация в базата. Уверете се, че сте пуснали `npm run ingest`.',
        sources: [],
      });
    }

    const context = results
      .map(r => `[${r.metadata.article} — ${r.metadata.source}]\n${r.text}`)
      .join('\n\n---\n\n');

    const personaContext = persona === 'employer'
      ? 'Питащият е РАБОТОДАТЕЛ или HR мениджър. Акцентирай върху задълженията, правата и рисковете от гледна точка на работодателя.'
      : 'Питащият е СЛУЖИТЕЛ или работник. Акцентирай върху правата, защитата и възможностите на работника.';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Ти си полезен асистент по трудово право. Отговаряй точно и ясно на въпроси, като се основаваш на предоставения контекст. Цитирай съответните членове накрая. Отговаряй САМО на български.

${personaContext}

Контекст:
${context}

Въпрос: ${question}

Отговор:`,
        },
      ],
    });

    const answer = response.choices[0].message.content;
    const sources = results.map(r => ({
      article: r.metadata.article,
      source: r.metadata.source,
      text: r.text,
    }));

    res.json({ answer, sources });
  } catch (err) {
    console.error('Грешка:', err.message);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Express сървър слуша на http://localhost:${PORT}`);
});
