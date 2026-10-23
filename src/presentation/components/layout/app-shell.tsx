import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/presentation/actions/auth";

export interface NavItem {
  href: string;
  label: string;
}

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-200 px-4 py-3">
        <strong>{title}</strong>
        <nav className="flex flex-1 flex-wrap gap-4 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-zinc-600 hover:text-zinc-900">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction}>
          <button type="submit" className="text-sm text-zinc-600 hover:text-zinc-900">
            Sair
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`mb-4 rounded px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
    >
      {error ?? ok}
    </p>
  );
}
