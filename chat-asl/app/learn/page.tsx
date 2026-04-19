import Link from "next/link";

const GROUP_OPTIONS = [
  { key: "af", label: "A-F", subtitle: "Learn letters A through F" },
  { key: "gm", label: "G-M", subtitle: "Learn letters G through M" },
  { key: "nt", label: "N-T", subtitle: "Learn letters N through T" },
  { key: "uz", label: "U-Z", subtitle: "Learn letters U through Z" },
  { key: "all", label: "All", subtitle: "Learn all letters A through Z" },
] as const;

export default function LearnSelectionPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            {"<- Back"}
          </Link>
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Letter Sets
          </h1>
          <div className="w-12" />
        </div>

        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Choose which letters you want to learn.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {GROUP_OPTIONS.map((option) => (
            <Link
              key={option.key}
              href={`/learn/play?group=${option.key}`}
              className="rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {option.label}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {option.subtitle}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
