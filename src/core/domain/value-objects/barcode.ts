import { ValidationError } from "../errors/domain-error";

const BARCODE_PATTERN = /^[A-Za-z0-9\-._]{4,64}$/;

/** Código lido pela câmera (EAN/UPC/Code128/QR com SKU) ou digitado. */
export class Barcode {
  private constructor(readonly value: string) {}

  static create(raw: string): Barcode {
    const value = raw.trim();
    if (!BARCODE_PATTERN.test(value)) throw new ValidationError("Invalid barcode");
    return new Barcode(value);
  }
}
