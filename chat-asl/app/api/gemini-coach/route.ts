import type { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface CoachRequest {
  image?: string;
  targetLetter?: string;
  predictedLetter?: string | null;
  confidence?: number | null;
  mode?: "learn" | "practice";
  classifierStatus?: "idle" | "loading" | "correct" | "incorrect" | "error" | "nodetection";
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

interface GeminiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      "@type"?: string;
      retryDelay?: string;
    }>;
  };
}

function parseDataUrl(image: string) {
  const match = image.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    return { mimeType: "image/jpeg", data: image };
  }

  return { mimeType: match[1], data: match[2] };
}

function buildPrompt({
  targetLetter,
  predictedLetter,
  confidence,
  mode,
  classifierStatus,
}: Required<Omit<CoachRequest, "image">>) {
  const detected =
    classifierStatus === "nodetection"
      ? "the classifier did not detect a valid sign"
      : classifierStatus === "error"
        ? "the classifier could not evaluate this attempt"
        : predictedLetter
          ? `${predictedLetter} at ${confidence ?? 0}% confidence`
          : "the classifier has not checked this attempt yet";

  return [
    "You are Gemini Coach inside ChatASL, an American Sign Language alphabet tutor.",
    "Look at the user's webcam frame and give concise coaching for the target letter.",
    "The app uses a classifier too, but you should use the image, target, and classifier context together.",
    "If the classifier did not detect a valid sign, still coach from the image. Focus on hand visibility, framing, lighting, and the target handshape.",
    "If no hand is visible, do not stop at saying the hand is missing. Explain how to form the target ASL letter, then add a short note to bring the hand into frame.",
    "Every response must include at least one concrete instruction for forming the target letter.",
    `Mode: ${mode}.`,
    `Target letter: ${targetLetter}.`,
    `Classifier result: ${detected}.`,
    "Keep feedback practical, kind, and specific to handshape or positioning.",
    "Do not mention uncertainty disclaimers unless the hand is not visible.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return Response.json(
      { error: "Missing GEMINI_API_KEY environment variable" },
      { status: 500 }
    );
  }

  let body: CoachRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    image,
    targetLetter,
    predictedLetter = null,
    confidence = null,
    mode = "learn",
    classifierStatus = "idle",
  } = body;
  if (!image || !targetLetter) {
    return Response.json(
      { error: "Missing image or targetLetter field" },
      { status: 400 }
    );
  }

  const { mimeType, data } = parseDataUrl(image);
  const prompt = buildPrompt({
    targetLetter,
    predictedLetter,
    confidence,
    mode,
    classifierStatus,
  });

  const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: {
              type: "STRING",
              description: "One short sentence describing what the attempt looks like.",
            },
            correction: {
              type: "STRING",
              description: "One short actionable correction for the learner.",
            },
            nextStep: {
              type: "STRING",
              description: "One short recommendation for what to do next.",
            },
          },
          required: ["summary", "correction", "nextStep"],
          propertyOrdering: ["summary", "correction", "nextStep"],
        },
      },
    }),
  });

  if (!geminiRes.ok) {
    const text = await geminiRes.text();
    let message = "Gemini request failed";
    let retryDelay: string | undefined;

    try {
      const errorData = JSON.parse(text) as GeminiErrorResponse;
      message = errorData.error?.message ?? message;
      retryDelay = errorData.error?.details?.find((detail) => detail.retryDelay)?.retryDelay;
    } catch {
      message = text || message;
    }

    return Response.json(
      {
        error:
          geminiRes.status === 429
            ? "Gemini quota exceeded. Try again later or use a key/project with available quota."
            : message,
        detail: message,
        retryDelay,
      },
      { status: geminiRes.status }
    );
  }

  const dataJson = (await geminiRes.json()) as GeminiResponse;
  const text = dataJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return Response.json({ error: "Gemini returned no coaching text" }, { status: 502 });
  }

  try {
    return Response.json(JSON.parse(text));
  } catch {
    return Response.json({ error: "Gemini returned invalid JSON", detail: text }, { status: 502 });
  }
}
