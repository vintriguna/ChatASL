import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface LetterStatRow {
  letter: string | null;
  correct_count: number | null;
  incorrect_count: number | null;
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("letter_stats")
    .select("letter, correct_count, incorrect_count")
    .eq("user_id", user.id)
    .order("letter", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stats = ((data as LetterStatRow[] | null) ?? []).map((row) => {
    const correctCount = row.correct_count ?? 0;
    const incorrectCount = row.incorrect_count ?? 0;
    const attempts = correctCount + incorrectCount;

    return {
      letter: (row.letter ?? "").trim(),
      correctCount,
      incorrectCount,
      attempts,
      accuracy: attempts > 0 ? correctCount / attempts : 0,
    };
  });

  return NextResponse.json({ stats });
}