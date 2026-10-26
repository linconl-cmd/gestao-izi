import type { UserRole } from "@/core/domain/value-objects/user-role";
import type { NavItem } from "@/presentation/components/layout/app-shell";

export const ROLE_LABELS: Record<UserRole, string> = {
  master: "Master",
  owner: "Proprietário",
  manager: "Gerente",
  seller: "Vendedor",
};

export interface NavContext {
  /** Comandas aguardando o caixa (aparece como contador em "Comandas"). */
  pendingOrders?: number;
}

/**
 * O menu depende do PAPEL, não da rota: dono e gerente mantêm o mesmo menu ao abrir o PDV,
 * em vez de cair no menu do vendedor (que parecia outro login).
 */
export function navFor(role: UserRole, ctx: NavContext = {}): NavItem[] {
  switch (role) {
    case "master":
      return [{ href: "/master/stores", label: "Lojas", icon: "store" }];
    case "owner":
    case "manager":
      return [
        { href: "/owner", label: "Painel", icon: "dashboard" },
        { href: "/pos", label: "PDV", icon: "pos" },
        { href: "/owner/orders", label: "Comandas", icon: "orders", badge: ctx.pendingOrders },
        { href: "/owner/products", label: "Produtos", icon: "products" },
        { href: "/owner/sales", label: "Vendas", icon: "sales" },
        { href: "/pos/cash-register", label: "Caixa", icon: "cash" },
        { href: "/owner/labels", label: "Etiquetas", icon: "labels" },
        { href: "/owner/sellers", label: "Equipe", icon: "sellers" },
        { href: "/owner/categories", label: "Categorias", icon: "categories" },
      ];
    case "seller":
      return [
        { href: "/pos", label: "Comanda", icon: "pos" },
        { href: "/pos/orders", label: "Minhas comandas", icon: "orders" },
        { href: "/pos/products", label: "Consulta", icon: "lookup" },
        { href: "/pos/history", label: "Vendas", icon: "sales" },
      ];
  }
}
