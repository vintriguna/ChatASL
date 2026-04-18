"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");

  useEffect(() => {
    const streamUrl = "http://127.0.0.1:8000/video_feed";
    let isMounted = true;

    const connectStream = () => {
      if (!isMounted) return;

      // Use img tag with a random cache buster to force reload frames
      const img = imgRef.current;
      if (img) {
        img.onerror = () => {
          if (isMounted) {
            setConnectionStatus("error");
            setTimeout(connectStream, 2000);
          }
        };
        img.onload = () => {
          if (isMounted) {
            setConnectionStatus("connected");
          }
        };
        img.src = streamUrl + "?t=" + Date.now();
      }
    };

    connectStream();

    return () => {
      isMounted = false;
      if (imgRef.current) {
        imgRef.current.src = "";
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffe8b8_0%,#f6f9ff_38%,#eef3ff_100%)] px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
            CitrusHack 2026
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">ChatASL Live Vision</h1>
          <p className="max-w-2xl text-base text-slate-700 sm:text-lg">
            Run the Python model and this page will show the annotated camera stream in real time.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-3 shadow-[0_20px_80px_rgba(15,23,42,0.16)] backdrop-blur">
            <div className="rounded-2xl bg-slate-950 p-2 relative">
              <img
                ref={imgRef}
                alt="ASL model stream"
                className="h-auto w-full rounded-xl bg-black"
                style={{ minHeight: "480px" }}
              />
              <p
                className={`absolute bottom-6 left-6 px-3 py-1 rounded-full text-xs font-medium ${
                  connectionStatus === "connected"
                    ? "bg-green-500/90 text-white"
                    : connectionStatus === "connecting"
                      ? "bg-amber-500/90 text-white"
                      : "bg-red-500/90 text-white"
                }`}
              >
                {connectionStatus === "connected"
                  ? "✓ Connected"
                  : connectionStatus === "connecting"
                    ? "◌ Connecting..."
                    : "✕ Error"}
              </p>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_70px_rgba(30,41,59,0.12)] backdrop-blur">
            <h2 className="text-xl font-bold text-slate-900">How To Use</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>1. Start the web app with npm run dev in chat-asl.</li>
              <li>2. Run .venv/bin/python model.py in aslModel.</li>
              <li>3. Keep both running to view live detections here.</li>
            </ol>
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              If the stream is blank, make sure the Python process is active and webcam permissions are allowed.
            </p>
            <p className="mt-4 text-xs text-slate-500">Stream: http://127.0.0.1:8000/video_feed</p>
          </aside>
        </section>
      </main>
    </div>
  );
}
