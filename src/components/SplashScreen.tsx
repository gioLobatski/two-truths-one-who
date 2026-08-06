"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "./LoadingScreen";

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [ready, setReady] = useState(false);

  // Give the intro a brief moment, then let the bar race to 100% and exit.
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LoadingScreen label="Loading" ready={ready} onComplete={onComplete} showTitle />
  );
}
