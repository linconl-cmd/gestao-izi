import { assertRole, requireStoreId } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import type { Product } from "@/core/domain/entities/product";
import type { Profile } from "@/core/domain/entities/profile";
import type { Sale } from "@/core/domain/entities/sale";
import { dayRange, monthRange } from "@/core/domain/services/period";
import type { ProductRepository } from "@/core/domain/repositories/product-repository";
import type { ProfileRepository } from "@/core/domain/repositories/profile-repository";
import type { SaleRepository, SaleSummary } from "@/core/domain/repositories/sale-repository";

export interface OwnerDashboard {
  today: SaleSummary;
  month: SaleSummary;
  /** Produtos com ao menos uma variante ativa em/abaixo do mínimo (só essas variantes). */
  lowStock: Product[];
  recentSales: Sale[];
  sellers: Profile[];
}

export class GetOwnerDashboard {
  constructor(
    private readonly sales: SaleRepository,
    private readonly products: ProductRepository,
    private readonly profiles: ProfileRepository,
  ) {}

  async execute(
    actor: AuthUser,
    input: { sellerId?: string; now?: Date; recentLimit?: number } = {},
  ): Promise<OwnerDashboard> {
    assertRole(actor, "owner");
    const now = input.now ?? new Date();

    const [today, month, lowStock, recentSales, team] = await Promise.all([
      this.sales.summarize(dayRange(now)),
      this.sales.summarize(monthRange(now)),
      this.products.listLowStock(),
      this.sales.list({ sellerId: input.sellerId, limit: input.recentLimit ?? 15 }),
      this.profiles.listByStore(requireStoreId(actor)),
    ]);

    return {
      today,
      month,
      lowStock,
      recentSales,
      sellers: team.filter((p) => p.role === "seller" || p.role === "owner"),
    };
  }
}
