import { ValidationError } from "../errors/domain-error";

/** Valor monetário em centavos (inteiro) para evitar erros de ponto flutuante. */
export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) throw new ValidationError("Invalid money amount");
    return new Money(cents);
  }

  /** Aceita o numeric(12,2) do Postgres (number ou string decimal). */
  static fromDecimal(value: number | string): Money {
    const n = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(n)) throw new ValidationError("Invalid money amount");
    return new Money(Math.round(n * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  times(factor: number): Money {
    return new Money(Math.round(this.cents * factor));
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toDecimal(): number {
    return this.cents / 100;
  }

  format(locale = "pt-BR", currency = "BRL"): string {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(this.toDecimal());
  }
}
