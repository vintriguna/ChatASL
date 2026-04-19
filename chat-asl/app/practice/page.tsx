import Link from "next/link";

const GROUP_OPTIONS = [
  { key: "af", label: "A-F", subtitle: "Practice letters A through F" },
  { key: "gm", label: "G-M", subtitle: "Practice letters G through M" },
  { key: "nt", label: "N-T", subtitle: "Practice letters N through T" },
  { key: "uz", label: "U-Z", subtitle: "Practice letters U through Z" },
  { key: "all", label: "All", subtitle: "Practice all letters A through Z" },
] as const;

export default function PracticeSelectionPage() {
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
            Choose which letters you want to practice.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {GROUP_OPTIONS.map((option) => (
            <Link
              key={option.key}
              href={`/practice/play?group=${option.key}`}
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
