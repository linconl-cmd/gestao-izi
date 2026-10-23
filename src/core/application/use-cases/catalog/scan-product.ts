import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { NotFoundError } from "@/core/domain/errors/domain-error";
import type { Product } from "@/core/domain/entities/product";
import type { ProductRepository } from "@/core/domain/repositories/product-repository";
import { Barcode } from "@/core/domain/value-objects/barcode";

/** Resolve o código lido pela câmera para o produto/variante. */
export class ScanProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(actor: AuthUser, rawCode: string): Promise<Product> {
    assertRole(actor, "owner", "seller");
    const product = await this.products.findByBarcode(Barcode.create(rawCode));
    if (!product) throw new NotFoundError("Product");
    return product;
  }
}
