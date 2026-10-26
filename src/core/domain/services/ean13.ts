/** Prefixo reservado para códigos internos da loja (faixa 20–29 da GS1 é de uso restrito/interno). */
export const INTERNAL_EAN_PREFIX = "200";
const SEQ_DIGITS = 9;
export const MAX_INTERNAL_SEQ = 10 ** SEQ_DIGITS - 1;

/** Dígito verificador do EAN-13 a partir dos 12 primeiros dígitos. */
export function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(value: string): boolean {
  return /^\d{13}$/.test(value) && ean13CheckDigit(value.slice(0, 12)) === Number(value[12]);
}

/** EAN-13 interno: 200 + sequência de 9 dígitos + dígito verificador. */
export function internalEan13(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1 || seq > MAX_INTERNAL_SEQ) throw new RangeError("Sequência de código de barras inválida.");
  const first12 = `${INTERNAL_EAN_PREFIX}${String(seq).padStart(SEQ_DIGITS, "0")}`;
  return `${first12}${ean13CheckDigit(first12)}`;
}

/** Sequência de um EAN interno (ou null se o código não for interno/válido). */
export function internalSeqOf(value: string): number | null {
  if (!isValidEan13(value) || !value.startsWith(INTERNAL_EAN_PREFIX)) return null;
  return Number(value.slice(INTERNAL_EAN_PREFIX.length, 12));
}
