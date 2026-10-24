"use client";

import {
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ScanLine,
  Shapes,
  Shirt,
  Store,
  Tags,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOutAction } from "@/presentation/actions/auth";
import { ThemeToggle } from "@/presentation/components/layout/theme-toggle";
import { Button } from "@/presentation/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/presentation/components/ui/sheet";
import { cn } from "@/presentation/lib/utils";

/** Ícones por nome: componentes não atravessam a fronteira server -> client. */
const ICONS = {
  store: Store,
  products: Shirt,
  categories: Shapes,
  sellers: Users,
  sales: Receipt,
  pos: ScanLine,
  lookup: PackageSearch,
  cash: Wallet,
  grid: LayoutGrid,
  dashboard: LayoutDashboard,
  labels: Tags,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

const COLLAPSE_KEY = "izi:sidebar-collapsed";

function isActive(pathname: string, href: string, all: NavItem[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  // Evita marcar "/pos" quando outro item mais específico (/pos/history) casa.
  return !all.some((o) => o.href !== href && o.href.startsWith(`${href}/`) && pathname.startsWith(o.href));
}

export function AppShell({
  title,
  nav,
  wide = false,
  children,
}: {
  title: string;
  nav: NavItem[];
  /** Largura total (PDV); false = coluna centralizada. */
  wide?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = nav.length > 5 ? nav.slice(0, 4) : nav;
  const overflow = nav.length > 5 ? nav.slice(4) : [];
  const moreActive = overflow.some((i) => isActive(pathname, i.href, nav));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* storage indisponível */
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  return (
    <div className="min-h-dvh md:flex print:block">
      {/* Sidebar (md+) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex print:hidden",
          collapsed ? "w-[4.5rem]" : "w-60",
        )}
      >
        <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Shirt className="size-5" />
          </span>
          {!collapsed && <strong className="truncate text-sm font-semibold tracking-tight">{title}</strong>}
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {nav.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href, nav);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft hover:text-accent-soft-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("flex items-center gap-1 border-t p-3", collapsed ? "flex-col" : "justify-between")}>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
          <ThemeToggle />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Sair">
              <LogOut className="size-5" />
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (mobile) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:hidden print:hidden">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Shirt className="size-4" />
            </span>
            {title}
          </span>
          <span className="flex items-center">
            <ThemeToggle />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Sair">
                <LogOut className="size-5" />
              </Button>
            </form>
          </span>
        </header>

        <main
          className={cn(
            "w-full flex-1 p-4 pb-28 md:p-8 md:pb-8 print:max-w-none print:p-0",
            wide ? "max-w-none" : "mx-auto max-w-6xl",
          )}
        >
          {children}
        </main>
      </div>

      {/* Navegação inferior (mobile): alcance do polegar */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around">
          {primary.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href, nav);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground transition-colors",
                    active && "text-primary",
                  )}
                >
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent-soft")}>
                    <Icon className="size-5" />
                  </span>
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          {overflow.length > 0 && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  moreActive && "text-primary",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", moreActive && "bg-accent-soft")}>
                  <Menu className="size-5" />
                </span>
                Mais
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="gap-0 rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
          <SheetTitle className="px-2 pb-2 text-base">Mais opções</SheetTitle>
          <SheetDescription className="sr-only">Outras áreas do sistema</SheetDescription>
          <ul className="grid gap-1">
            {overflow.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(pathname, item.href, nav);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={cn("flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-muted", active && "bg-accent-soft text-accent-soft-foreground")}>
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "mb-4 rounded-xl border px-4 py-3 text-sm",
        error
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success-soft text-success",
      )}
    >
      {error ?? ok}
    </p>
  );
}

/** Cabeçalho padrão de página (título + ação opcional). */
export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

