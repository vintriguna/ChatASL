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
    <div className="flex flex-col flex-1 bg-surface px-4 py-8">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-bold tracking-tight text-on-surface">
            ASL Glossary
          </h1>
          <p className="text-on-surface-variant text-sm">
            All 26 letters of the American Sign Language alphabet. Click any letter to see signing tips.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {GLOSSARY.map((entry) => (
            <button
              key={entry.letter}
              onClick={() => setSelected(entry)}
              className="w-36 card-sm hover:scale-105 transition-transform cursor-pointer flex flex-col items-center gap-2 p-4"
              aria-label={`View ASL sign for letter ${entry.letter}`}
            >
              <div className="relative w-full aspect-square rounded-[1rem] bg-surface-container-lowest overflow-hidden">
                <Image
                  src={entry.imageUrl}
                  alt={entry.altText}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="font-display text-xl font-bold text-on-surface leading-none">
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
          <div className="absolute inset-0 bg-[rgba(48,41,80,0.4)] backdrop-blur-sm" aria-hidden="true" />
          <div className="relative z-10 card max-w-sm w-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2
                id="modal-title"
                className="font-display text-5xl font-bold text-on-surface"
              >
                {selected.letter}
              </h2>
              <button
                ref={closeButtonRef}
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="text-on-surface-variant hover:text-on-surface transition-colors text-xl leading-none p-2 rounded-full hover:bg-surface-container-high"
              >
                ✕
              </button>
            </div>

            <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden bg-surface-container-lowest ghost-border">
              <Image
                src={selected.imageUrl}
                alt={selected.altText}
                fill
                className="object-contain p-4"
                unoptimized
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                How to sign it
              </span>
              <p className="text-sm text-on-surface leading-relaxed">
                {selected.signingNotes}
              </p>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="btn-primary flex h-12 items-center justify-center text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
