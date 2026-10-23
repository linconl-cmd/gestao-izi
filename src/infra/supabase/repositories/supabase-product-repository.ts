import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductCost, ProductVariant } from "@/core/domain/entities/product";
import { isLowStock } from "@/core/domain/entities/product";
import type {
  NewProductInput,
  NewVariantInput,
  ProductPatch,
  ProductRepository,
  ProductSearchParams,
  VariantPatch,
} from "@/core/domain/repositories/product-repository";
import type { Barcode } from "@/core/domain/value-objects/barcode";
import type { Money } from "@/core/domain/value-objects/money";
import { toProduct, toProductCost, toVariant } from "../mappers/mappers";
import type { ProductCostRow, ProductRow, VariantRow } from "../types/rows";
import { assertNoError, requireRow } from "./errors";
import { compact, escapeLike } from "./utils";

const PRODUCT_SELECT = "*, product_variants(*)";

const variantInsert = (storeId: string, productId: string, v: NewVariantInput) => ({
  store_id: storeId,
  product_id: productId,
  size: v.size ?? null,
  color: v.color ?? null,
  sku: v.sku,
  barcode: v.barcode ?? null,
  price: v.price?.toDecimal() ?? null,
  stock_quantity: v.stockQuantity ?? 0,
  min_stock: v.minStock ?? 0,
});

export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await this.db
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .maybeSingle<ProductRow>();
    assertNoError(error);
    return data ? toProduct(data) : null;
  }

  async search(params: ProductSearchParams = {}): Promise<Product[]> {
    const limit = params.limit ?? 30;
    const offset = params.offset ?? 0;
    let q = this.db.from("products").select(PRODUCT_SELECT).order("name");
    if (params.onlyActive) q = q.eq("is_active", true);
    if (params.categoryId) q = q.eq("category_id", params.categoryId);
    if (params.query?.trim()) q = q.ilike("name", `%${escapeLike(params.query.trim())}%`);
    const { data, error } = await q.range(offset, offset + limit - 1).returns<ProductRow[]>();
    assertNoError(error);
    return (data ?? []).map((r) => toProduct(r));
  }

  async findByBarcode(barcode: Barcode): Promise<Product | null> {
    const { data, error } = await this.db
      .from("product_variants")
      .select("*, products(*)")
      .eq("barcode", barcode.value)
      .maybeSingle<VariantRow & { products: ProductRow | null }>();
    assertNoError(error);
    if (!data?.products) return null;
    const { products, ...variant } = data;
    return toProduct(products, [variant]);
  }

  async listLowStock(): Promise<Product[]> {
    // PostgREST não compara duas colunas; filtramos aqui (catálogos de loja são pequenos).
    const { data, error } = await this.db
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .returns<ProductRow[]>();
    assertNoError(error);
    return (data ?? [])
      .map((r) => toProduct(r, (r.product_variants ?? []).filter((v) => v.is_active && isLowStock(toVariant(v)))))
      .filter((p) => p.variants.length > 0);
  }

  /** Não transacional (3 chamadas); em falha remove o produto (cascade limpa variantes/custo). */
  async create(input: NewProductInput): Promise<Product> {
    const { data, error } = await this.db
      .from("products")
      .insert({
        store_id: input.storeId,
        category_id: input.categoryId ?? null,
        name: input.name,
        description: input.description ?? null,
        brand: input.brand ?? null,
        base_price: input.basePrice.toDecimal(),
        image_url: input.imageUrl ?? null,
      })
      .select("*")
      .single<ProductRow>();
    const product = requireRow(data, error, "Product");

    try {
      const { error: vErr } = await this.db
        .from("product_variants")
        .insert(input.variants.map((v) => variantInsert(input.storeId, product.id, v)));
      assertNoError(vErr);
      if (input.costPrice) await this.setCost(input.storeId, product.id, input.costPrice);
    } catch (e) {
      await this.db.from("products").delete().eq("id", product.id);
      throw e;
    }

    const created = await this.findById(product.id);
    return requireRow(created, null, "Product");
  }

  async update(id: string, patch: ProductPatch): Promise<void> {
    const { data, error } = await this.db
      .from("products")
      .update(
        compact({
          name: patch.name,
          description: patch.description,
          brand: patch.brand,
          category_id: patch.categoryId,
          base_price: patch.basePrice?.toDecimal(),
          image_url: patch.imageUrl,
          is_active: patch.isActive,
        }),
      )
      .eq("id", id)
      .select("id")
      .maybeSingle();
    requireRow(data, error, "Product");
  }

  async addVariant(storeId: string, productId: string, input: NewVariantInput): Promise<ProductVariant> {
    const { data, error } = await this.db
      .from("product_variants")
      .insert(variantInsert(storeId, productId, input))
      .select("*")
      .single<VariantRow>();
    return toVariant(requireRow(data, error, "Variant"));
  }

  async updateVariant(id: string, patch: VariantPatch): Promise<ProductVariant> {
    const { data, error } = await this.db
      .from("product_variants")
      .update(
        compact({
          size: patch.size,
          color: patch.color,
          sku: patch.sku,
          barcode: patch.barcode,
          price: patch.price === undefined ? undefined : (patch.price?.toDecimal() ?? null),
          stock_quantity: patch.stockQuantity,
          min_stock: patch.minStock,
          is_active: patch.isActive,
        }),
      )
      .eq("id", id)
      .select("*")
      .maybeSingle<VariantRow>();
    return toVariant(requireRow(data, error, "Variant"));
  }

  async getCost(productId: string): Promise<ProductCost | null> {
    const { data, error } = await this.db
      .from("product_costs")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle<ProductCostRow>();
    assertNoError(error);
    return data ? toProductCost(data) : null;
  }

  async setCost(storeId: string, productId: string, cost: Money): Promise<void> {
    const { error } = await this.db
      .from("product_costs")
      .upsert({ product_id: productId, store_id: storeId, cost_price: cost.toDecimal() });
    assertNoError(error);
  }
}
