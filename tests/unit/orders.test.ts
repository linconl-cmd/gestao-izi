import { describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/core/application/ports/session-provider";
import { CancelOrder } from "@/core/application/use-cases/orders/cancel-order";
import { CreateOrder } from "@/core/application/use-cases/orders/create-order";
import { PayOrder } from "@/core/application/use-cases/orders/pay-order";
import { SetOrderItem } from "@/core/application/use-cases/orders/set-order-item";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/core/domain/errors/domain-error";
import type { Order } from "@/core/domain/entities/order";
import { itemsWithoutStock, orderSubtotal } from "@/core/domain/entities/order";
import type { CashRegisterRepository } from "@/core/domain/repositories/cash-register-repository";
import type { OrderRepository } from "@/core/domain/repositories/order-repository";
import type { SaleRepository } from "@/core/domain/repositories/sale-repository";
import { Money } from "@/core/domain/value-objects/money";

const user = (role: AuthUser["role"]): AuthUser => ({ id: `${role}-1`, role, storeId: "s1", email: null });

const item = (over: Partial<Order["items"][number]> = {}) => ({
  variantId: "v1", quantity: 2, productName: "Camiseta", size: "M", color: "Azul",
  sku: "SKU1", unitPrice: Money.fromDecimal(50), stock: 10, ...over,
});

const order = (over: Partial<Order> = {}): Order => ({
  id: "o1", storeId: "s1", number: 7, sellerId: "seller-1", status: "open",
  suggestedDiscount: Money.fromDecimal(5), notes: null, businessDate: "2026-10-25", saleId: null,
  cancelReason: null, createdAt: new Date(), closedAt: null, closedBy: null, items: [item()], ...over,
});

describe("entidade Order", () => {
  it("subtotal soma preço × quantidade; detecta item acima do estoque", () => {
    const o = order({ items: [item({ quantity: 2 }), item({ variantId: "v2", quantity: 3, unitPrice: Money.fromDecimal(10), stock: 1 })] });
    expect(orderSubtotal(o).toDecimal()).toBe(130);
    expect(itemsWithoutStock(o).map((i) => i.variantId)).toEqual(["v2"]);
  });
});

describe("CreateOrder", () => {
  const setup = () => {
    const create = vi.fn().mockResolvedValue(order());
    return { create, useCase: new CreateOrder({ create } as unknown as OrderRepository) };
  };

  it("vendedor cria; itens repetidos são somados", async () => {
    const { create, useCase } = setup();
    await useCase.execute(user("seller"), {
      items: [{ variantId: "v1", quantity: 1 }, { variantId: "v1", quantity: 2 }, { variantId: "v2", quantity: 1 }],
      suggestedDiscount: Money.fromDecimal(5),
    });
    expect(create.mock.calls[0]?.[0].items).toEqual([
      { variantId: "v1", quantity: 3 },
      { variantId: "v2", quantity: 1 },
    ]);
  });

  it.each([
    [[], "vazia"],
    [[{ variantId: "v1", quantity: 0 }], "quantidade zero"],
    [[{ variantId: "v1", quantity: 1.5 }], "quantidade fracionada"],
    [[{ variantId: "v1", quantity: 1000 }], "acima do máximo"],
  ])("recusa comanda inválida (%#)", async (items) => {
    const { create, useCase } = setup();
    await expect(useCase.execute(user("seller"), { items })).rejects.toBeInstanceOf(ValidationError);
    expect(create).not.toHaveBeenCalled();
  });

  it("recusa desconto sugerido negativo e papel master", async () => {
    const { useCase } = setup();
    await expect(
      useCase.execute(user("seller"), { items: [{ variantId: "v1", quantity: 1 }], suggestedDiscount: Money.fromDecimal(-1) }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      useCase.execute(user("master"), { items: [{ variantId: "v1", quantity: 1 }] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("PayOrder", () => {
  const setup = (o: Order | null = order(), openRegister: boolean = true) => {
    const pay = vi.fn().mockResolvedValue("sale-1");
    const orders = { findById: vi.fn().mockResolvedValue(o), pay } as unknown as OrderRepository;
    const registers = {
      findOpenByUser: vi.fn().mockResolvedValue(openRegister ? { id: "reg-1" } : null),
    } as unknown as CashRegisterRepository;
    const sales = { findById: vi.fn().mockResolvedValue({ id: "sale-1" }) } as unknown as SaleRepository;
    return { pay, useCase: new PayOrder(orders, registers, sales) };
  };
  const input = { orderId: "o1", paymentMethod: "pix" as const };

  it("gerente recebe no próprio caixa; o desconto é o que ele informar", async () => {
    const { pay, useCase } = setup();
    await useCase.execute(user("manager"), { ...input, discount: Money.fromDecimal(7) });
    expect(pay).toHaveBeenCalledWith({
      orderId: "o1", cashRegisterId: "reg-1", paymentMethod: "pix", discount: Money.fromDecimal(7),
    });
  });

  it("sem desconto informado repassa null (o banco usa a sugestão do vendedor)", async () => {
    const { pay, useCase } = setup();
    await useCase.execute(user("owner"), input);
    expect(pay.mock.calls[0]?.[0].discount).toBeNull();
  });

  it("vendedor não recebe", async () => {
    const { pay, useCase } = setup();
    await expect(useCase.execute(user("seller"), input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(pay).not.toHaveBeenCalled();
  });

  it("exige caixa aberto do próprio usuário", async () => {
    const { pay, useCase } = setup(order(), false);
    await expect(useCase.execute(user("manager"), input)).rejects.toBeInstanceOf(ConflictError);
    expect(pay).not.toHaveBeenCalled();
  });

  it("recusa comanda inexistente, fechada, vazia ou sem estoque", async () => {
    await expect(setup(null).useCase.execute(user("manager"), input)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setup(order({ status: "paid" })).useCase.execute(user("manager"), input)).rejects.toBeInstanceOf(ConflictError);
    await expect(setup(order({ items: [] })).useCase.execute(user("manager"), input)).rejects.toBeInstanceOf(ValidationError);
    const noStock = setup(order({ items: [item({ quantity: 5, stock: 2 })] }));
    await expect(noStock.useCase.execute(user("manager"), input)).rejects.toThrow(/Estoque insuficiente/);
    expect(noStock.pay).not.toHaveBeenCalled();
  });

  it("desconto negativo é recusado", async () => {
    await expect(
      setup().useCase.execute(user("manager"), { ...input, discount: Money.fromDecimal(-1) }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("CancelOrder e SetOrderItem", () => {
  it("os três papéis de loja cancelam (o banco limita o vendedor às próprias)", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const useCase = new CancelOrder({ cancel } as unknown as OrderRepository);
    for (const role of ["seller", "manager", "owner"] as const) await useCase.execute(user(role), "o1", "  motivo ");
    expect(cancel).toHaveBeenCalledTimes(3);
    expect(cancel).toHaveBeenCalledWith("o1", "motivo");
    await expect(useCase.execute(user("master"), "o1")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("quantidade do item: 0 remove; negativa ou fracionada é recusada", async () => {
    const setItemQuantity = vi.fn().mockResolvedValue(undefined);
    const useCase = new SetOrderItem({ setItemQuantity } as unknown as OrderRepository);
    await useCase.execute(user("manager"), "o1", "v1", 0);
    expect(setItemQuantity).toHaveBeenCalledWith("o1", "v1", 0);
    await expect(useCase.execute(user("manager"), "o1", "v1", -1)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(user("manager"), "o1", "v1", 1.5)).rejects.toBeInstanceOf(ValidationError);
  });
});
