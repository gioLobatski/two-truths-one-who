"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LoadingScreen } from "./LoadingScreen";

export function SplashScreen({
  onComplete,
  title,
  logo,
}: {
  onComplete?: () => void;
  /** Optional per-game splash title; defaults to the collection's game 1. */
  title?: ReactNode;
  /** Optional per-game brand mark; defaults to the Two Truths logo. */
  logo?: { src: string; alt: string };
}) {
  const [ready, setReady] = useState(false);

  // Give the intro a brief moment, then let the bar race to 100% and exit.
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LoadingScreen
      label="Loading"
      ready={ready}
      onComplete={onComplete}
      showTitle
      title={title}
      logo={logo}
    />
  );
}
