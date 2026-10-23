import { describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/core/application/ports/session-provider";
import { RegisterSale } from "@/core/application/use-cases/sales/register-sale";
import { ForbiddenError, ValidationError } from "@/core/domain/errors/domain-error";
import type { SaleRepository } from "@/core/domain/repositories/sale-repository";
import { Money } from "@/core/domain/value-objects/money";

const seller: AuthUser = { id: "u1", role: "seller", storeId: "s1", email: null };

function setup() {
  const create = vi.fn().mockResolvedValue({ id: "sale-1" });
  const useCase = new RegisterSale({ create } as unknown as SaleRepository);
  return { create, useCase };
}

describe("Money", () => {
  it("avoids floating point drift", () => {
    expect(Money.fromDecimal(0.1).add(Money.fromDecimal(0.2)).toDecimal()).toBe(0.3);
  });
});

describe("RegisterSale", () => {
  const base = { cashRegisterId: "c1", paymentMethod: "pix" as const };

  it("merges repeated variants", async () => {
    const { create, useCase } = setup();
    await useCase.execute(seller, {
      ...base,
      items: [
        { variantId: "v1", quantity: 1 },
        { variantId: "v1", quantity: 2 },
      ],
    });
    expect(create.mock.calls[0]?.[0].items).toEqual([{ variantId: "v1", quantity: 3, discount: undefined }]);
  });

  it("rejects empty sales and invalid quantities", async () => {
    const { useCase } = setup();
    await expect(useCase.execute(seller, { ...base, items: [] })).rejects.toBeInstanceOf(ValidationError);
    await expect(
      useCase.execute(seller, { ...base, items: [{ variantId: "v1", quantity: 0 }] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("forbids master from selling", async () => {
    const { useCase } = setup();
    const master: AuthUser = { id: "m", role: "master", storeId: null, email: null };
    await expect(
      useCase.execute(master, { ...base, items: [{ variantId: "v1", quantity: 1 }] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
