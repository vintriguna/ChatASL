import type { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

interface PromptRequest {
  model?: string;
  temperature?: number;
  wordCount?: number;
  prompt?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface LetterStat {
  letter: string;
  correctCount: number;
  incorrectCount: number;
  attempts: number;
  accuracy: number;
}

interface LetterStatsResponse {
  stats?: LetterStat[];
  error?: string;
}

function isValidWord(word: string) {
  return /^[a-z]{4}$/.test(word) && !/[jz]/.test(word);
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return Response.json(
      { error: "Missing GEMINI_API_KEY environment variable" },
      { status: 500 }
    );
  }

  let body: PromptRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    prompt,
    model = DEFAULT_GEMINI_MODEL,
    temperature = 0.7,
    wordCount = 10,
  } = body;

  const clampedWordCount = Math.min(Math.max(Math.floor(wordCount), 4), 20);
  const baseUrl = new URL(request.url).origin;
  const cookie = request.headers.get("cookie") ?? "";

  const statsRes = await fetch(`${baseUrl}/api/letter-stats`, {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  });

  if (!statsRes.ok) {
    const detail = await statsRes.text();
    return Response.json(
      { error: "Failed to fetch letter stats", detail },
      { status: statsRes.status }
    );
  }

  const statsJson = (await statsRes.json()) as LetterStatsResponse;
  const stats = (statsJson.stats ?? []).filter(
    (row) => row.letter && !/[jz]/i.test(row.letter)
  );

  if (stats.length === 0) {
    return Response.json(
      { error: "No letter stats found for user" },
      { status: 404 }
    );
  }

  const weakLetters = [...stats]
    .sort((a, b) => {
      if (b.incorrectCount !== a.incorrectCount) {
        return b.incorrectCount - a.incorrectCount;
      }
      return a.accuracy - b.accuracy;
    })
    .slice(0, 8)
    .map((row) => row.letter.trim().toLowerCase())
    .filter((letter) => /^[a-y]$/.test(letter) && letter !== "j");

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const promptText = [
    "You are helping generate ASL practice words.",
    `Generate exactly ${clampedWordCount} unique English words.`,
    "Each word must be exactly 4 letters and lowercase.",
    "Do not use any word containing the letters j or z.",
    `Prioritize words that include these weaker letters: ${weakLetters.join(", ")}.`,
    "Prefer simple, common words suitable for learners.",
    "Return only valid JSON matching the provided schema.",
    prompt?.trim() ? `Additional instruction: ${prompt.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const geminiRes = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            words: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "List of unique 4-letter lowercase English words.",
            },
            reasoning: {
              type: "STRING",
              description: "Short explanation of how weak letters were used.",
            },
          },
          required: ["words", "reasoning"],
          propertyOrdering: ["words", "reasoning"],
        },
      },
    }),
  });

  if (!geminiRes.ok) {
    const detail = await geminiRes.text();
    return Response.json(
      { error: "Gemini request failed", detail },
      { status: geminiRes.status }
    );
  }

  const data = (await geminiRes.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return Response.json(
      { error: "Gemini returned no text response" },
      { status: 502 }
    );
  }

  let parsed: { words?: string[]; reasoning?: string };
  try {
    parsed = JSON.parse(text) as { words?: string[]; reasoning?: string };
  } catch {
    return Response.json(
      { error: "Gemini returned invalid JSON", detail: text },
      { status: 502 }
    );
  }

  const uniqueWords = Array.from(new Set((parsed.words ?? []).map((w) => w.toLowerCase())));
  const filteredWords = uniqueWords.filter(isValidWord).slice(0, clampedWordCount);

  if (filteredWords.length === 0) {
    return Response.json(
      { error: "Gemini returned no valid 4-letter words", detail: parsed },
      { status: 502 }
    );
  }

  return Response.json({
    words: filteredWords,
    reasoning: parsed.reasoning ?? "",
    focusLetters: weakLetters,
    model,
  });
}