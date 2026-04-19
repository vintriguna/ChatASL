import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ChatASL
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base">
            Learn American Sign Language, one letter at a time.
          </p>
          {user && (
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">{user.email}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/practice"
            className="flex h-14 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-base font-semibold hover:opacity-90 transition-opacity"
          >
            Practice Mode
          </Link>
          <Link
            href="/quiz"
            className="flex h-14 items-center justify-center rounded-2xl border border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50 text-base font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Quiz Mode
          </Link>
          <Link
            href="/translate"
            className="flex h-14 items-center justify-center rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-base font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Translate Mode
          </Link>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
