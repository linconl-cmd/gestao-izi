"use server";

import { z } from "zod";
import { money, optionalText, parseForm } from "@/presentation/lib/form";
import { requireUser } from "@/presentation/lib/require-user";
import { runAction } from "@/presentation/lib/run-action";

const PATH = "/pos/cash-register";

export async function openCashRegisterAction(formData: FormData): Promise<void> {
  const d = parseForm(z.object({ openingAmount: money }), formData, PATH);
  await runAction(PATH, "Caixa aberto.", async () => {
    const { container, user } = await requireUser("owner", "manager");
    await container.useCases.openCashRegister.execute(user, d.openingAmount);
  });
}

export async function closeCashRegisterAction(formData: FormData): Promise<void> {
  const d = parseForm(
    z.object({ registerId: z.uuid(), closingAmount: money, notes: optionalText }),
    formData,
    PATH,
  );
  await runAction(PATH, null, async () => {
    const { container, user } = await requireUser("owner", "manager");
    const closed = await container.useCases.closeCashRegister.execute(user, d.registerId, {
      closingAmount: d.closingAmount,
      notes: d.notes,
    });
    const expected = closed.expectedAmount;
    if (!expected) return "Caixa fechado.";
    const diff = d.closingAmount.subtract(expected);
    return `Caixa fechado. Esperado em dinheiro: ${expected.format()} · diferença: ${diff.format()}`;
  });
}
