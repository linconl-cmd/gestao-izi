import type { ReactNode } from "react";
import { AppShell } from "@/presentation/components/layout/app-shell";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="Gestão Izi"
      nav={[
        { href: "/owner/products", label: "Produtos", icon: "products" },
        { href: "/owner/categories", label: "Categorias", icon: "categories" },
        { href: "/owner/sellers", label: "Vendedores", icon: "sellers" },
        { href: "/owner/sales", label: "Vendas", icon: "sales" },
        { href: "/pos", label: "PDV", icon: "pos" },
      ]}
    >
      {children}
    </AppShell>
  );
}
