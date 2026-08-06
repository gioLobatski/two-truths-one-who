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
    "rounded-xl px-5 py-3 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
  const variants: Record<string, string> = {
    primary:
      "bg-violet-500 text-white shadow-lg shadow-violet-900/40 hover:bg-violet-400",
    ghost:
      "bg-white/5 text-violet-100 ring-1 ring-inset ring-white/15 hover:bg-white/10",
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
      className={`w-full max-w-xl rounded-3xl bg-white/[0.06] p-8 shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/10 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {children}
    </main>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-center text-3xl font-black tracking-tight text-white sm:text-4xl">
      {children}
    </h1>
  );
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm text-violet-200/70">{children}</p>;
}
