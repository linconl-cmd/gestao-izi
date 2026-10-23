export const PAYMENT_METHODS = [
  "cash",
  "credit_card",
  "debit_card",
  "pix",
  "store_credit",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
