"use client";

import Image from "next/image";

export function Logo({
  size = 160,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/2-truths-1-who-logo.png"
        alt="Two Truths, One Who logo"
        width={size}
        height={size}
        priority
        className="object-contain"
      />
    </div>
  );
}
