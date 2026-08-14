"use client";

import { useState } from "react";

const SOCIALS = [
  {
    name: "Email",
    icon: "/email-icon.png",
    href: "mailto:giolobaton1024@gmail.com",
    external: false,
  },
  {
    name: "GitHub",
    icon: "/github-icon.png",
    href: "https://github.com/gioLobatski",
    external: true,
  },
  {
    name: "LinkedIn",
    icon: "/linkedin-icon.png",
    href: "https://www.linkedin.com/in/paul-genre-lobaton-1a7136290/",
    external: true,
  },
];

/**
 * Floating "connect" button pinned above the "?" help button.
 * Hover shows a "Connect?" hint; clicking expands a cyan capsule with
 * email / GitHub / LinkedIn links, mirroring the share-icon mockup.
 */
export function ConnectButton() {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2">
      {hovered && !open && (
        <div className="rounded-full bg-zinc-950/95 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg shadow-black/40 ring-1 ring-inset ring-white/15 backdrop-blur">
          Connect?
        </div>
      )}

      <div className="flex items-center">
        {/* Capsule of social links — expands leftwards from the circle */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            open ? "max-w-72 opacity-100" : "max-w-0 opacity-0"
          }`}
          aria-hidden={!open}
          inert={!open}
        >
          <div className="flex items-center gap-3 rounded-l-full bg-cyan-400 py-2 pl-5 pr-9 shadow-lg shadow-cyan-900/30">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                aria-label={s.name}
                title={s.name}
                {...(s.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="transition hover:scale-110 active:scale-95"
              >
                <img
                  src={s.icon}
                  alt=""
                  className="h-7 w-7 object-contain"
                  draggable={false}
                />
              </a>
            ))}
          </div>
        </div>

        {/* The amber circle — overlaps the capsule's right end like the mockup */}
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setOpen((o) => !o)}
          aria-label="Connect with the developer"
          aria-expanded={open}
          className="z-10 -ml-5 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-amber-400 shadow-lg shadow-amber-900/40 transition hover:bg-amber-300 active:scale-95"
        >
          <img
            src="/socials-icon.png"
            alt=""
            className="h-6 w-6 object-contain"
            draggable={false}
          />
        </button>
      </div>
    </div>
  );
}
