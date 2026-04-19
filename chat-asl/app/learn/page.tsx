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
    <div className="flex flex-col flex-1 items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            {"← Back"}
          </Link>
          <h1 className="font-display text-xl font-bold text-on-surface">Letter Sets</h1>
          <div className="w-12" />
        </div>

        <div className="card-sm">
          <p className="text-sm text-on-surface-variant">
            Choose which letters you want to learn.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {GROUP_OPTIONS.map((option) => (
            <Link
              key={option.key}
              href={`/learn/play?group=${option.key}`}
              className="card-sm block hover:scale-[1.01] transition-transform"
            >
              <p className="font-display text-base font-bold text-on-surface">{option.label}</p>
              <p className="text-sm text-on-surface-variant">{option.subtitle}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
