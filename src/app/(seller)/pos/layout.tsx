import type { ReactNode } from "react";
import { AppShell } from "@/presentation/components/layout/app-shell";

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="Izi · PDV"
      wide
      nav={[
        { href: "/pos", label: "PDV", icon: "pos" },
        { href: "/pos/products", label: "Consulta", icon: "lookup" },
        { href: "/pos/history", label: "Vendas", icon: "sales" },
        { href: "/pos/cash-register", label: "Caixa", icon: "cash" },
      ]}
    >
      {children}
    </AppShell>
  );
}
