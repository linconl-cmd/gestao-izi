import type { ReactNode } from "react";
import { AppShell } from "@/presentation/components/layout/app-shell";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="Gestão Izi"
      nav={[
        { href: "/owner/products", label: "Produtos" },
        { href: "/owner/categories", label: "Categorias" },
        { href: "/owner/sellers", label: "Vendedores" },
        { href: "/owner/sales", label: "Vendas" },
        { href: "/pos", label: "Abrir PDV" },
      ]}
    >
      {children}
    </AppShell>
  );
}
