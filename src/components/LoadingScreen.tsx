"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { Title } from "./ui";

/**
 * Full-screen loading overlay with an animated progress bar.
 *
 * Mechanic (adapted from a preloader pattern):
 *  - While `ready` is false the bar creeps up but caps at 90%, so it never
 *    "completes" before the underlying work is actually done.
 *  - Once `ready` becomes true it accelerates to 100%, holds briefly, then
 *    plays a fade-out and calls `onComplete`.
 *
 * When used purely as an async loader (no `onComplete`), it simply creeps to
 * 90% and unmounts once the parent stops rendering it.
 */
export function LoadingScreen({
  label = "Loading",
  ready = false,
  onComplete,
  showTitle = false,
}: {
  label?: string;
  ready?: boolean;
  onComplete?: () => void;
  showTitle?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);

  // Drive the bar.
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (ready) {
          if (prev >= 100) return 100;
          return Math.min(100, prev + Math.max(6, (100 - prev) * 0.3));
        }
        if (prev >= 90) return 90;
        return Math.min(90, prev + Math.random() * 9);
      });
    }, 90);

    return () => clearInterval(interval);
  }, [ready]);

  // Once the bar fills, hold briefly, fade out, then notify the parent.
  useEffect(() => {
    if (progress < 100 || completedRef.current) return;
    completedRef.current = true;

    const holdTimer = setTimeout(() => {
      setIsExiting(true);
      const doneTimer = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(doneTimer);
    }, 250);

    return () => clearTimeout(holdTimer);
  }, [progress, onComplete]);

  const pct = Math.round(Math.min(progress, 100));

  return (
    <div
      className={`fixed inset-0 z-50 bg-black transition-opacity duration-500 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
        <Logo size={168} className={ready ? "" : "animate-pulse"} />

        {showTitle && (
          <Title>
            <span className="text-cyan-400">Two Truths,</span>{" "}
            <span className="text-amber-400">One Who</span>
          </Title>
        )}

        <div className="w-64 max-w-[80vw]">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-center text-sm text-slate-300/70">
            {label} {pct}%
          </p>
        </div>
      </div>
    </div>
  );
}
