import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AttemptPayload {
  targetLetter: string;
  detectedLetter: string | null;
  confidence: number | null;
  isCorrect: boolean;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AttemptPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { targetLetter, isCorrect } = body;
  if (!targetLetter) {
    return NextResponse.json({ error: "Missing targetLetter" }, { status: 400 });
  }

  const { error } = await supabase.rpc("increment_letter_stats", {
    p_user_id: user.id,
    p_letter: targetLetter,
    p_correct: isCorrect ? 1 : 0,
    p_incorrect: isCorrect ? 0 : 1,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
