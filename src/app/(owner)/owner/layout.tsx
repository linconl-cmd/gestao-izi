import type { ReactNode } from "react";
import { AppShell } from "@/presentation/components/layout/app-shell";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="Gestão Izi"
      nav={[
        { href: "/owner", label: "Painel", icon: "dashboard" },
        { href: "/pos", label: "PDV", icon: "pos" },
        { href: "/owner/products", label: "Produtos", icon: "products" },
        { href: "/owner/sales", label: "Vendas", icon: "sales" },
        { href: "/owner/labels", label: "Etiquetas", icon: "labels" },
        { href: "/owner/sellers", label: "Equipe", icon: "sellers" },
        { href: "/owner/categories", label: "Categorias", icon: "categories" },
      ]}
    >
      {children}
    </AppShell>
  );
}
