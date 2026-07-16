"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

type SiteHeaderProps = {
  overlay?: boolean;
};

type NavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/work",
    label: "Photography",
    isActive: (pathname) => pathname === "/work" || pathname.startsWith("/work/"),
  },
  {
    href: "/digital",
    label: "Digital",
    isActive: (pathname) => pathname === "/digital" || pathname.startsWith("/digital/"),
  },
  {
    href: "/about",
    label: "About",
    isActive: (pathname) => pathname === "/about",
  },
  {
    href: "/contact",
    label: "Contact",
    isActive: (pathname) => pathname === "/contact",
  },
];

export default function SiteHeader({ overlay = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-40" : "border-b border-studio-border"}>
      <div className="mx-auto w-full max-w-6xl px-6 py-6 md:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-[0.28em] text-studio-muted transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
          >
            Blackburn Studio
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-10 text-[0.95rem] md:flex">
            {navItems.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "font-medium text-studio-text underline decoration-1 underline-offset-8"
                      : "text-studio-dim transition-colors hover:text-studio-text"
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-studio-border px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-studio-muted transition hover:border-white/35 hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            Menu
          </button>
        </div>

        <nav
          id={menuId}
          aria-label="Primary mobile"
          className={
            menuOpen
              ? "mt-4 rounded-xl border border-studio-border bg-studio-surface/95 p-2 md:hidden"
              : "hidden"
          }
        >
          <ul className="flex flex-col">
            {navItems.map((item) => {
              const active = item.isActive(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "block min-h-10 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base " +
                      (active
                        ? "bg-white/10 font-medium text-studio-text underline decoration-1 underline-offset-4"
                        : "text-studio-muted transition-colors hover:bg-white/5 hover:text-studio-text")
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
