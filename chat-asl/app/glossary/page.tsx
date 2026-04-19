"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GLOSSARY, GlossaryEntry } from "./glossaryData";

export default function GlossaryPage() {
  const [selected, setSelected] = useState<GlossaryEntry | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selected) return;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            ← Home
          </Link>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ASL Glossary
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            All 26 letters of the American Sign Language alphabet. Click any letter to see signing tips.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {GLOSSARY.map((entry) => (
            <button
              key={entry.letter}
              onClick={() => setSelected(entry)}
              className="w-24 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors p-3 flex flex-col items-center gap-2 cursor-pointer"
              aria-label={`View ASL sign for letter ${entry.letter}`}
            >
              <div className="relative w-full aspect-square rounded-xl bg-white">
                <Image
                  src={entry.imageUrl}
                  alt={entry.altText}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-none">
                {entry.letter}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
          <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-sm w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2
                id="modal-title"
                className="text-4xl font-bold text-zinc-900 dark:text-zinc-50"
              >
                {selected.letter}
              </h2>
              <button
                ref={closeButtonRef}
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xl leading-none p-1"
              >
                ✕
              </button>
            </div>

            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white border border-zinc-100 dark:border-zinc-800">
              <Image
                src={selected.imageUrl}
                alt={selected.altText}
                fill
                className="object-contain p-4"
                unoptimized
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                How to sign it
              </span>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {selected.signingNotes}
              </p>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="flex h-11 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
