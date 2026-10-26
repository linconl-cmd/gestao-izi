"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStoreId } from "@/core/application/authorization";
import { internalEan13 } from "@/core/domain/services/ean13";
import { buildGrid, parseList } from "@/core/domain/services/product-grid";
import { nextFreeSku, skuBase, skuPrefix } from "@/core/domain/services/sku";
import { NotFoundError } from "@/core/domain/errors/domain-error";
import { Money } from "@/core/domain/value-objects/money";
import { money, nonNegativeInt, optionalMoney, optionalText, parseForm } from "@/presentation/lib/form";
import { withFlash } from "@/presentation/lib/action-result";
import { requireUser } from "@/presentation/lib/require-user";
import { runAction } from "@/presentation/lib/run-action";

const CATEGORIES = "/owner/categories";
const PRODUCTS = "/owner/products";
const productPath = (id: string) => `${PRODUCTS}/${id}`;

// ---- categorias -------------------------------------------------------------

export async function createCategoryAction(formData: FormData): Promise<void> {
  const d = parseForm(z.object({ name: z.string().trim().min(1, "Informe o nome.") }), formData, CATEGORIES);
  await runAction(CATEGORIES, "Categoria criada.", async () => {
    const { container, user } = await requireUser("owner", "manager");
    await container.repositories.categories.create({ storeId: requireStoreId(user), name: d.name });
  });
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const d = parseForm(z.object({ id: z.uuid() }), formData, CATEGORIES);
  await runAction(CATEGORIES, "Categoria removida.", async () => {
    const { container } = await requireUser("owner", "manager");
    await container.repositories.categories.delete(d.id);
  });
}

// ---- produtos ---------------------------------------------------------------

const variantFields = {
  size: optionalText,
  color: optionalText,
  sku: optionalText,
  barcode: optionalText,
  variantPrice: optionalMoney,
  stockQuantity: nonNegativeInt,
  minStock: nonNegativeInt,
};

/** SKU digitado, ou gerado (CAM-M-AZU) quando o campo fica em branco. */
async function resolveSku(
  products: { listSkusWithPrefix(prefix: string): Promise<string[]> },
  typed: string | null,
  name: string,
  size: string | null,
  color: string | null,
): Promise<string> {
  if (typed) return typed;
  const base = skuBase(name, size, color);
  return nextFreeSku(base, await products.listSkusWithPrefix(skuPrefix(name)));
}

const gridProductSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto."),
  brand: optionalText,
  description: optionalText,
  categoryId: z.string().trim().optional().transform((v) => v || null),
  basePrice: money,
  costPrice: optionalMoney,
  sizes: z.string().optional(),
  colors: z.string().optional(),
  stockQuantity: nonNegativeInt,
  minStock: nonNegativeInt,
  autoBarcode: z.string().optional(),
});

/** Reserva `count` códigos EAN-13 internos consecutivos (a unicidade final é garantida pelo banco). */
async function reserveBarcodes(products: { maxInternalBarcodeSeq(): Promise<number> }, count: number): Promise<string[]> {
  const start = await products.maxInternalBarcodeSeq();
  return Array.from({ length: count }, (_, i) => internalEan13(start + i + 1));
}

export async function createProductGridAction(formData: FormData): Promise<void> {
  const d = parseForm(gridProductSchema, formData, PRODUCTS);
  await runAction(PRODUCTS, null, async () => {
    const { container, user } = await requireUser("owner", "manager");
    const combos = buildGrid(parseList(d.sizes), parseList(d.colors));
    const products = container.repositories.products;

    const taken = new Set(await products.listSkusWithPrefix(skuPrefix(d.name)));
    const codes = d.autoBarcode ? await reserveBarcodes(products, combos.length) : [];
    const variants = combos.map((c, i) => {
      const sku = nextFreeSku(skuBase(d.name, c.size, c.color), taken);
      taken.add(sku);
      return {
        size: c.size,
        color: c.color,
        sku,
        barcode: codes[i] ?? null,
        stockQuantity: d.stockQuantity,
        minStock: d.minStock,
      };
    });

    const product = await container.useCases.createProduct.execute(user, {
      name: d.name,
      brand: d.brand,
      description: d.description,
      categoryId: d.categoryId,
      basePrice: d.basePrice,
      costPrice: d.costPrice,
      variants,
    });
    revalidatePath("/", "layout");
    redirect(withFlash(productPath(product.id), "ok", `Produto criado com ${variants.length} variação(ões), SKU e código de barras prontos.`));
  });
}

const updateProductSchema = z.object({
  productId: z.uuid(),
  name: z.string().trim().min(1, "Informe o nome do produto."),
  brand: optionalText,
  basePrice: money,
  costPrice: optionalMoney,
});

export async function updateProductAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const path = productPath(String(raw.productId ?? ""));
  const d = parseForm(updateProductSchema, formData, path);
  await runAction(path, "Produto atualizado.", async () => {
    const { container, user } = await requireUser("owner", "manager");
    await container.repositories.products.update(d.productId, {
      name: d.name,
      brand: d.brand,
      basePrice: d.basePrice,
    });
    if (d.costPrice && user.role === "owner") {
      await container.repositories.products.setCost(requireStoreId(user), d.productId, d.costPrice);
    }
  });
}

export async function setProductActiveAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const path = productPath(String(raw.productId ?? ""));
  const d = parseForm(z.object({ productId: z.uuid(), isActive: z.enum(["true", "false"]) }), formData, path);
  await runAction(path, null, async () => {
    const { container } = await requireUser("owner", "manager");
    await container.repositories.products.update(d.productId, { isActive: d.isActive === "true" });
  });
}

export async function addVariantAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const path = productPath(String(raw.productId ?? ""));
  const d = parseForm(z.object({ productId: z.uuid(), ...variantFields }), formData, path);
  await runAction(path, "Variante adicionada.", async () => {
    const { container, user } = await requireUser("owner", "manager");
    const product = await container.repositories.products.findById(d.productId);
    if (!product) throw new NotFoundError("Produto não encontrado.");
    const sku = await resolveSku(container.repositories.products, d.sku, product.name, d.size, d.color);
    const [autoCode] = d.barcode ? [] : await reserveBarcodes(container.repositories.products, 1);
    await container.repositories.products.addVariant(requireStoreId(user), d.productId, {
      size: d.size,
      color: d.color,
      sku,
      barcode: d.barcode ?? autoCode ?? null,
      price: d.variantPrice,
      stockQuantity: d.stockQuantity,
      minStock: d.minStock,
    });
  });
}

const updateVariantSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid(),
  variantPrice: optionalMoney,
  stockQuantity: nonNegativeInt,
  minStock: nonNegativeInt,
  isActive: z.enum(["true", "false"]),
});

export async function updateVariantAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const path = productPath(String(raw.productId ?? ""));
  const d = parseForm(updateVariantSchema, formData, path);
  await runAction(path, "Variante atualizada.", async () => {
    const { container } = await requireUser("owner", "manager");
    await container.repositories.products.updateVariant(d.variantId, {
      price: d.variantPrice as Money | null,
      stockQuantity: d.stockQuantity,
      minStock: d.minStock,
      isActive: d.isActive === "true",
    });
  });
}

/** Gera códigos EAN-13 internos para as variantes sem código (de um produto ou da loja toda). */
export async function generateBarcodesAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const productId = typeof raw.productId === "string" && raw.productId ? raw.productId : undefined;
  const path = productId ? productPath(productId) : PRODUCTS;
  await runAction(path, null, async () => {
    const { container } = await requireUser("owner", "manager");
    const products = container.repositories.products;
    const ids = await products.listVariantIdsWithoutBarcode(productId);
    if (ids.length === 0) return "Todas as variações já têm código de barras.";
    const codes = await reserveBarcodes(products, ids.length);
    for (const [i, id] of ids.entries()) await products.updateVariant(id, { barcode: codes[i] });
    return `${ids.length} código(s) de barras gerado(s).`;
  });
}
