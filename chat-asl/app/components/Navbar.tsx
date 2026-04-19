"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";

const NAV_ITEMS = [
  {
    label: "Learn",
    href: "/",
    isActive: (path: string) =>
      path === "/" ||
      path.startsWith("/learn") ||
      path.startsWith("/practice") ||
      path.startsWith("/quiz") ||
      path.startsWith("/spell"),
  },
  {
    label: "Translate",
    href: "/translate",
    isActive: (path: string) => path.startsWith("/translate"),
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    isActive: (path: string) => path.startsWith("/dashboard"),
  },
  {
    label: "Glossary",
    href: "/glossary",
    isActive: (path: string) => path.startsWith("/glossary"),
  },
];

const HIDDEN_PATHS = ["/login", "/auth"];

export function Navbar() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="sticky top-0 z-50 w-full glass ghost-border-bottom ambient-shadow">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="font-display font-bold text-lg text-on-surface shrink-0"
        >
          ChatASL
        </Link>

        {/* Nav items */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ label, href, isActive }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  active
                    ? "bg-surface-container-high text-on-surface font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Sign out */}
        <form action={signOut} className="shrink-0">
          <button
            type="submit"
            className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
