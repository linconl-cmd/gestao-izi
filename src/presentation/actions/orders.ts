"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Money } from "@/core/domain/value-objects/money";
import { PAYMENT_METHODS } from "@/core/domain/value-objects/payment-method";
import { userMessage } from "@/presentation/lib/action-result";
import { money, optionalText, parseForm } from "@/presentation/lib/form";
import { requireUser } from "@/presentation/lib/require-user";
import { isRedirect, runAction } from "@/presentation/lib/run-action";

const ORDERS = "/owner/orders";

/** Só voltamos para telas conhecidas (evita redirecionamento aberto via campo oculto). */
function safeReturn(value: unknown, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return /^\/(owner|pos)(\/[\w-]+)*$/.test(v) ? v : fallback;
}

// ---- vendedor: criar comanda (chamada direta do terminal) ---------------------

export type CreateOrderResult = { ok: true; id: string; number: number } | { ok: false; error: string };

const createOrderSchema = z.object({
  discountCents: z.number().int().min(0),
  items: z
    .array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(999) }))
    .min(1)
    .max(200),
});

export async function createOrderAction(input: unknown): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Comanda inválida." };

  try {
    const { container, user } = await requireUser("owner", "manager", "seller");
    const order = await container.useCases.createOrder.execute(user, {
      items: parsed.data.items,
      suggestedDiscount: Money.fromCents(parsed.data.discountCents),
    });
    revalidatePath("/", "layout");
    return { ok: true, id: order.id, number: order.number };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { ok: false, error: userMessage(error) };
  }
}

// ---- cancelar / editar ---------------------------------------------------------

export async function cancelOrderAction(formData: FormData): Promise<void> {
  const back = safeReturn(formData.get("returnTo"), "/pos/orders");
  const d = parseForm(z.object({ id: z.uuid(), reason: optionalText }), formData, back);
  await runAction(back, "Comanda cancelada.", async () => {
    const { container, user } = await requireUser("owner", "manager", "seller");
    await container.useCases.cancelOrder.execute(user, d.id, d.reason);
  }, back === "/pos/orders" || back === ORDERS ? back : ORDERS);
}

export async function setOrderItemAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const path = `${ORDERS}/${String(raw.orderId ?? "")}`;
  const d = parseForm(
    z.object({ orderId: z.uuid(), variantId: z.uuid(), quantity: z.coerce.number().int().min(0).max(999) }),
    formData,
    safeReturn(path, ORDERS),
  );
  await runAction(`${ORDERS}/${d.orderId}`, null, async () => {
    const { container, user } = await requireUser("owner", "manager");
    await container.useCases.setOrderItem.execute(user, d.orderId, d.variantId, d.quantity);
  });
}

// ---- gerente/dono: receber ------------------------------------------------------

const payOrderSchema = z.object({
  orderId: z.uuid(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  // Campo vazio = sem desconto (o formulário já vem preenchido com a sugestão do vendedor).
  discount: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || "0")
    .pipe(money),
});

export async function payOrderAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const path = safeReturn(`${ORDERS}/${String(raw.orderId ?? "")}`, ORDERS);
  const d = parseForm(payOrderSchema, formData, path);
  await runAction(
    path,
    null,
    async () => {
      const { container, user } = await requireUser("owner", "manager");
      const sale = await container.useCases.payOrder.execute(user, {
        orderId: d.orderId,
        paymentMethod: d.paymentMethod,
        discount: d.discount,
      });
      return `${sale.notes ?? "Comanda"} recebida · ${sale.total.format()}`;
    },
    ORDERS,
  );
}

// ---- localizar por QR/número ------------------------------------------------------

export type LookupOrderResult = { ok: true; id: string } | { ok: false; error: string };

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Aceita o QR da comanda (izi:order:<uuid>), um UUID solto ou o número (#12 / 12). */
export async function lookupOrderAction(code: string): Promise<LookupOrderResult> {
  try {
    const { container } = await requireUser("owner", "manager");
    const text = String(code).trim();
    const uuid = UUID.exec(text)?.[0];
    const order = uuid
      ? await container.repositories.orders.findById(uuid.toLowerCase())
      : /^#?\d{1,9}$/.test(text)
        ? await container.repositories.orders.findByNumber(Number(text.replace("#", "")))
        : null;
    return order ? { ok: true, id: order.id } : { ok: false, error: "Comanda não encontrada." };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { ok: false, error: userMessage(error) };
  }
}

// ---- notificações ------------------------------------------------------------------

export async function markNotificationsReadAction(formData: FormData): Promise<void> {
  const back = safeReturn(formData.get("returnTo"), ORDERS);
  const id = formData.get("id");
  await runAction(back, null, async () => {
    const { container } = await requireUser("owner", "manager");
    await container.repositories.notifications.markRead(typeof id === "string" && id ? [id] : undefined);
  });
}
