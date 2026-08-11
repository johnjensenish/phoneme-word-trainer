#!/usr/bin/env bun
/**
 * Classify pending word suggestions via the Gemini API.
 *
 * Reads JSON from stdin: [{number, word, sentence?}]
 * Writes JSON to stdout:  [{number, word, category, emoji, confidence, reasoning, accepted}]
 *
 * Requires GEMINI_API_KEY (create at https://aistudio.google.com/apikey).
 */

const CATEGORIES = [
  "animals", "body", "clothing", "colors", "condition",
  "evaluative", "exclamations", "feelings", "food", "furniture", "health",
  "household", "nature", "numbers", "people", "prepositions", "pronouns",
  "requests", "rooms", "sensory", "shapes", "size", "social", "time", "toys",
  "vehicles", "verbs", "weather",
] as const;

const MIN_CONFIDENCE = 0.7;
const MODEL = process.env.WORD_CLASSIFIER_MODEL || "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

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

The "results" array must be in the same order as the input.`;

// OpenAPI-subset schema for Gemini structured output — guarantees parseable
// JSON and constrains category to the valid set.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    results: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          category: { type: "STRING", enum: [...CATEGORIES] },
          emoji: { type: "STRING" },
          confidence: { type: "NUMBER" },
          reasoning: { type: "STRING" },
        },
        required: ["word", "category", "emoji", "confidence", "reasoning"],
      },
    },
  },
  required: ["results"],
};

async function classify(pending: Pending[]): Promise<Classification[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const userPrompt = JSON.stringify(
    pending.map(p => ({
      word: p.word,
      ...(p.sentence ? { sentence: p.sentence } : {}),
    })),
  );

  const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts
    ?.map(p => p.text ?? "")
    .join("");
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
