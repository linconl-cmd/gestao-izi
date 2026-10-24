"use server";

import { z } from "zod";
import { requireStoreId } from "@/core/application/authorization";
import { Money } from "@/core/domain/value-objects/money";
import { money, nonNegativeInt, optionalMoney, optionalText, parseForm } from "@/presentation/lib/form";
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
  sku: z.string().trim().min(1, "Informe o SKU."),
  barcode: optionalText,
  variantPrice: optionalMoney,
  stockQuantity: nonNegativeInt,
  minStock: nonNegativeInt,
};

const createProductSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto."),
  brand: optionalText,
  description: optionalText,
  categoryId: z.string().trim().optional().transform((v) => v || null),
  basePrice: money,
  costPrice: optionalMoney,
  ...variantFields,
});

export async function createProductAction(formData: FormData): Promise<void> {
  const d = parseForm(createProductSchema, formData, PRODUCTS);
  await runAction(PRODUCTS, "Produto criado.", async () => {
    const { container, user } = await requireUser("owner", "manager");
    await container.useCases.createProduct.execute(user, {
      name: d.name,
      brand: d.brand,
      description: d.description,
      categoryId: d.categoryId,
      basePrice: d.basePrice,
      costPrice: d.costPrice,
      variants: [
        {
          size: d.size,
          color: d.color,
          sku: d.sku,
          barcode: d.barcode,
          price: d.variantPrice,
          stockQuantity: d.stockQuantity,
          minStock: d.minStock,
        },
      ],
    });
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
    await container.repositories.products.addVariant(requireStoreId(user), d.productId, {
      size: d.size,
      color: d.color,
      sku: d.sku,
      barcode: d.barcode,
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
