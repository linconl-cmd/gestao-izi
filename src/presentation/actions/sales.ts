"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Money } from "@/core/domain/value-objects/money";
import { PAYMENT_METHODS } from "@/core/domain/value-objects/payment-method";
import { userMessage } from "@/presentation/lib/action-result";
import { parseForm } from "@/presentation/lib/form";
import { requireUser } from "@/presentation/lib/require-user";
import { isRedirect, runAction } from "@/presentation/lib/run-action";

export type RegisterSaleResult = { ok: true; total: string } | { ok: false; error: string };

const registerSaleSchema = z.object({
  cashRegisterId: z.uuid(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  discountCents: z.number().int().min(0),
  items: z
    .array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(999) }))
    .min(1)
    .max(200),
});

/** Chamada direta do terminal (client component): devolve resultado em vez de redirecionar. */
export async function registerSaleAction(input: unknown): Promise<RegisterSaleResult> {
  const parsed = registerSaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Venda inválida." };
  const d = parsed.data;

  try {
    const { container, user } = await requireUser("owner", "manager", "seller");
    const sale = await container.useCases.registerSale.execute(user, {
      cashRegisterId: d.cashRegisterId,
      paymentMethod: d.paymentMethod,
      discount: Money.fromCents(d.discountCents),
      items: d.items,
    });
    revalidatePath("/pos");
    return { ok: true, total: sale.total.format() };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { ok: false, error: userMessage(error) };
  }
}

export async function cancelSaleAction(formData: FormData): Promise<void> {
  const path = "/owner/sales";
  const d = parseForm(
    z.object({ id: z.uuid(), reason: z.string().trim().min(3, "Informe o motivo do cancelamento.") }),
    formData,
    path,
  );
  await runAction(path, "Venda cancelada e estoque estornado.", async () => {
    const { container, user } = await requireUser("owner", "manager");
    await container.useCases.cancelSale.execute(user, d.id, d.reason);
  });
}
