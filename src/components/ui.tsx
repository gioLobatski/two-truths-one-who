"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "rounded-xl px-5 py-3 font-semibold transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
  const variants: Record<string, string> = {
    primary:
      "bg-amber-400 text-black shadow-lg shadow-amber-900/30 hover:bg-amber-300",
    ghost:
      "bg-cyan-500/10 text-cyan-100 ring-1 ring-inset ring-cyan-400/30 hover:bg-cyan-500/20",
    danger: "bg-rose-500/90 text-white hover:bg-rose-400",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full max-w-xl rounded-2xl bg-white/[0.06] p-5 shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/10 backdrop-blur sm:rounded-3xl sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 p-4 sm:gap-6 sm:p-6">
      {children}
    </main>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-heading text-center text-2xl font-black tracking-tight text-balance text-white sm:text-4xl">
      {children}
    </h1>
  );
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm text-slate-300/70">{children}</p>;
}
