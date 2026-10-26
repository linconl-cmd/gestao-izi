import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { ValidationError } from "@/core/domain/errors/domain-error";
import type { Sale } from "@/core/domain/entities/sale";
import type {
  CreateSaleInput,
  CreateSaleItemInput,
  SaleRepository,
} from "@/core/domain/repositories/sale-repository";

export class RegisterSale {
  constructor(private readonly sales: SaleRepository) {}

  async execute(actor: AuthUser, input: CreateSaleInput): Promise<Sale> {
    assertRole(actor, "owner", "manager");
    if (input.items.length === 0) throw new ValidationError("Sale must have at least one item");

    const merged = new Map<string, CreateSaleItemInput>();
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new ValidationError("Quantity must be a positive integer");
      }
      if (item.discount?.isNegative()) throw new ValidationError("Discount cannot be negative");
      const prev = merged.get(item.variantId);
      merged.set(item.variantId, {
        variantId: item.variantId,
        quantity: (prev?.quantity ?? 0) + item.quantity,
        discount: prev?.discount && item.discount ? prev.discount.add(item.discount) : (item.discount ?? prev?.discount),
      });
    }
    if (input.discount?.isNegative()) throw new ValidationError("Discount cannot be negative");

    return this.sales.create({ ...input, items: [...merged.values()] });
  }
}
