import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AttemptPayload {
  targetLetter: string;
  detectedLetter: string | null;
  confidence: number | null;
  isCorrect: boolean;
}

interface SessionPayload {
  attempts: AttemptPayload[];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SessionPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { attempts } = body;
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return NextResponse.json({ error: "Missing attempts" }, { status: 400 });
  }

  const correctCount = attempts.filter((a) => a.isCorrect).length;

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      letter_count: attempts.length,
      correct_count: correctCount,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message }, { status: 500 });
  }

  const attemptRows = attempts.map((a) => ({
    session_id: session.id,
    user_id: user.id,
    target_letter: a.targetLetter,
    detected_letter: a.detectedLetter,
    confidence: a.confidence,
    is_correct: a.isCorrect,
  }));

  const { error: attemptsError } = await supabase.from("attempts").insert(attemptRows);

  if (attemptsError) {
    return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  }

  await Promise.all(
    attempts.map((a) =>
      supabase.rpc("increment_letter_stats", {
        p_user_id: user.id,
        p_letter: a.targetLetter,
        p_correct: a.isCorrect ? 1 : 0,
        p_incorrect: a.isCorrect ? 0 : 1,
      })
    )
  );

  return NextResponse.json({ sessionId: session.id, correctCount });
}
