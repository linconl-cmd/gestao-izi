import { redirect } from "next/navigation";
import { z } from "zod";
import { Money } from "@/core/domain/value-objects/money";
import { withFlash } from "./action-result";

/** Valida o FormData; em erro volta para `path` com a primeira mensagem. */
export function parseForm<S extends z.ZodType>(schema: S, formData: FormData, path: string): z.output<S> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(withFlash(path, "error", parsed.error.issues[0]?.message ?? "Dados inválidos."));
  return parsed.data;
}

/** "12,50" ou "12.5" -> Money. */
export const money = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/, "Valor monetário inválido.")
  .transform((v) => Money.fromDecimal(v.replace(",", ".")));

/** Campo monetário opcional: vazio -> null. */
export const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const r = money.safeParse(v);
    if (!r.success) {
      ctx.addIssue({ code: "custom", message: "Valor monetário inválido." });
      return z.NEVER;
    }
    return r.data;
  });

export const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

export const nonNegativeInt = z.coerce.number().int("Informe um número inteiro.").min(0, "Não pode ser negativo.");
