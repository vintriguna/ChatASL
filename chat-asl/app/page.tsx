import Link from "next/link";

export default function Home() {
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
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/practice"
            className="flex h-14 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-base font-semibold hover:opacity-90 transition-opacity"
          >
            Practice Mode
          </Link>
          <Link
            href="/spell"
            className="flex h-14 items-center justify-center rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-base font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Spell Mode
          </Link>
          <Link
            href="/translate"
            className="flex h-14 items-center justify-center rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-base font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Translate Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
