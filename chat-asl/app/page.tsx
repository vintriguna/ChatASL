import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const MODES = [
  {
    href: "/learn",
    icon: "school",
    title: "Learn",
    description: "Study each letter with ASL reference images side by side",
  },
  {
    href: "/practice",
    icon: "fitness_center",
    title: "Practice",
    description: "Freeform reps with instant AI feedback on your signs",
  },
  {
    href: "/spell",
    icon: "spellcheck",
    title: "Spell",
    description: "Spell full words letter by letter with Gemini word lists",
  },
  {
    href: "/quiz",
    icon: "quiz",
    title: "Quiz",
    description: "5-letter timed sessions that save your results",
  },
] as const;

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  const { data: streakData } = supabase && user
    ? await supabase
        .from("user_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const streak = streakData?.current_streak ?? 0;

  return (
    <div className="flex flex-col flex-1 bg-surface px-6 py-6">
      <div className="flex flex-col flex-1 gap-5 max-w-3xl mx-auto w-full">

        {/* Greeting row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-on-surface">
              Ready to sign?
            </h1>
            <p className="text-on-surface-variant text-sm mt-0.5">
              Pick a mode and start practicing.
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-2 card-sm py-3 px-5">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="font-display text-2xl font-bold text-tertiary leading-none">
                  {streak}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {streak === 1 ? "day streak" : "day streak"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mode cards 2×2 grid */}
        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          {MODES.map(({ href, icon, title, description }) => (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col justify-end overflow-hidden rounded-[3rem] p-8 min-h-48 bg-surface-container-lowest ambient-shadow hover:scale-[1.01] transition-transform"
            >
              {/* Background icon */}
              <span
                className="material-symbols-outlined absolute top-6 right-6 select-none pointer-events-none"
                style={{ fontSize: "9rem", color: "#b0a7d6", opacity: 0.25 }}
              >
                {icon}
              </span>
              {/* Text */}
              <div className="relative">
                <p className="font-display text-2xl font-bold text-on-surface">
                  {title}
                </p>
                <p className="text-base text-on-surface-variant mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
