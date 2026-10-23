import type { PaymentMethod } from "@/core/domain/value-objects/payment-method";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  credit_card: "Crédito",
  debit_card: "Débito",
  pix: "Pix",
  store_credit: "Crédito da loja",
  other: "Outro",
};
