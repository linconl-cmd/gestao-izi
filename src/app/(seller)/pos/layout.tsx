import type { ReactNode } from "react";
import { AppShell } from "@/presentation/components/layout/app-shell";

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="PDV"
      nav={[
        { href: "/pos", label: "Venda" },
        { href: "/pos/cash-register", label: "Caixa" },
        { href: "/pos/history", label: "Minhas vendas" },
      ]}
    >
      {children}
    </AppShell>
  );
}
