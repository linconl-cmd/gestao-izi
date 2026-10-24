import { assertRole, requireStoreId } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { ValidationError } from "@/core/domain/errors/domain-error";
import type { Product } from "@/core/domain/entities/product";
import type {
  NewProductInput,
  ProductRepository,
} from "@/core/domain/repositories/product-repository";

export class CreateProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(actor: AuthUser, input: Omit<NewProductInput, "storeId">): Promise<Product> {
    assertRole(actor, "owner", "manager");
    if (input.basePrice.isNegative()) throw new ValidationError("Price cannot be negative");
    if (input.variants.length === 0) throw new ValidationError("Product needs at least one variant");

    const skus = new Set<string>();
    for (const v of input.variants) {
      if (skus.has(v.sku)) throw new ValidationError(`Duplicate SKU: ${v.sku}`);
      skus.add(v.sku);
      if ((v.stockQuantity ?? 0) < 0) throw new ValidationError("Stock cannot be negative");
    }
    // Custo é restrito ao dono (RLS em product_costs): gerente cadastra o produto sem ele.
    const costPrice = actor.role === "owner" ? input.costPrice : null;
    return this.products.create({ ...input, costPrice, storeId: requireStoreId(actor) });
  }
}
