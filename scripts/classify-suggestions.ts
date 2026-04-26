#!/usr/bin/env bun
/**
 * Classify pending word suggestions via GitHub Models.
 *
 * Reads JSON from stdin: [{number, word, sentence?}]
 * Writes JSON to stdout:  [{number, word, category, emoji, confidence, reasoning, accepted}]
 *
 * Requires GITHUB_TOKEN with models:read (provided by Actions when
 * `permissions: models: read` is set).
 */

const CATEGORIES = [
  "animals", "body", "clothing", "colors", "condition",
  "evaluative", "exclamations", "feelings", "food", "furniture", "health",
  "household", "nature", "numbers", "people", "prepositions", "pronouns",
  "requests", "rooms", "sensory", "shapes", "size", "social", "time", "toys",
  "vehicles", "verbs", "weather",
] as const;

const MIN_CONFIDENCE = 0.7;
const MODEL = process.env.WORD_CLASSIFIER_MODEL || "openai/gpt-4o-mini";
const ENDPOINT = "https://models.github.ai/inference/chat/completions";

interface Pending {
  number: number;
  word: string;
  sentence?: string;
}

interface Classification {
  number: number;
  word: string;
  category: string;
  emoji: string;
  confidence: number;
  reasoning: string;
  accepted: boolean;
}

const SYSTEM_PROMPT = `You classify English words for a toddler speech-therapy flashcard app.

For each word, return:
- category: one of [${CATEGORIES.join(", ")}]
- emoji: a single emoji that depicts the word concretely (no skin tones, no flags)
- confidence: 0.0–1.0, how confident you are in the category
- reasoning: <= 12 words explaining the choice

Rules:
- Pick the category a parent would expect when filtering. "dog" → animals, "shirt" → clothing, "happy" → feelings.
- For ambiguous words, use the example sentence if provided.
- If no category fits well, set confidence below 0.7.
- Emoji must depict the word itself, not the category. "butter" → 🧈, not 🍽️.
- If you can't find a depictive emoji, use ❓ and lower confidence.

Return ONLY a JSON object: { "results": [ { "word": "...", "category": "...", "emoji": "...", "confidence": 0.95, "reasoning": "..." } ] }
The "results" array must be in the same order as the input.`;

async function classify(pending: Pending[]): Promise<Classification[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const userPrompt = JSON.stringify(
    pending.map(p => ({
      word: p.word,
      ...(p.sentence ? { sentence: p.sentence } : {}),
    })),
  );

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub Models ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in model response");

  const parsed = JSON.parse(content) as {
    results?: Array<{
      word?: string;
      category?: string;
      emoji?: string;
      confidence?: number;
      reasoning?: string;
    }>;
  };

  const results = parsed.results ?? [];
  if (results.length !== pending.length) {
    throw new Error(`Model returned ${results.length} results, expected ${pending.length}`);
  }

  return pending.map((p, i): Classification => {
    const r = results[i];
    const category = String(r.category ?? "").toLowerCase();
    const emoji = String(r.emoji ?? "❓");
    const confidence = Number(r.confidence ?? 0);
    const reasoning = String(r.reasoning ?? "");
    const validCategory = (CATEGORIES as readonly string[]).includes(category);
    return {
      number: p.number,
      word: p.word,
      category: validCategory ? category : "household",
      emoji,
      confidence,
      reasoning,
      accepted: validCategory && confidence >= MIN_CONFIDENCE && emoji !== "❓",
    };
  });
}

async function main() {
  const stdin = await Bun.stdin.text();
  const pending = JSON.parse(stdin) as Pending[];

  if (!Array.isArray(pending) || pending.length === 0) {
    process.stdout.write("[]");
    return;
  }

  const classifications = await classify(pending);
  process.stdout.write(JSON.stringify(classifications));
}

await main();
