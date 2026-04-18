import type { NextRequest } from "next/server";

const ROBOFLOW_API_KEY = "krW0HycM52SgCW595Otk";
const ROBOFLOW_WORKSPACE = "marias-workspace-w3vq3";
const ROBOFLOW_WORKFLOW = "custom-workflow";
const ROBOFLOW_URL = `https://serverless.roboflow.com/${ROBOFLOW_WORKSPACE}/workflows/${ROBOFLOW_WORKFLOW}`;

export async function POST(request: NextRequest) {
  let body: { image?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { image } = body;
  if (!image) {
    return Response.json({ error: "Missing image field" }, { status: 400 });
  }

  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
  const base64 = image.includes(",") ? image.split(",")[1] : image;

  const roboflowRes = await fetch(ROBOFLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: ROBOFLOW_API_KEY,
      inputs: {
        image: { type: "base64", value: base64 },
      },
    }),
  });

  if (!roboflowRes.ok) {
    const text = await roboflowRes.text();
    return Response.json(
      { error: "Roboflow request failed", detail: text },
      { status: roboflowRes.status }
    );
  }

  const data = await roboflowRes.json();
  console.log("Roboflow response:", JSON.stringify(data, null, 2));
  return Response.json(data);
}
