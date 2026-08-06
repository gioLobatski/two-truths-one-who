"use client";

import { Logo } from "./Logo";
import { Screen, Title } from "./ui";

export function SplashScreen() {
  return (
    <Screen>
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <Logo size={200} />
        <Title>Two Truths, One Who</Title>
        <p className="text-sm text-violet-200/60">Loading…</p>
      </div>
    </Screen>
  );
}
