import { describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/core/application/ports/session-provider";
import type { UserProvisioner } from "@/core/application/ports/user-provisioner";
import { CreateProduct } from "@/core/application/use-cases/catalog/create-product";
import { CancelSale } from "@/core/application/use-cases/sales/cancel-sale";
import { CreateManager } from "@/core/application/use-cases/users/create-manager";
import { CreateSeller } from "@/core/application/use-cases/users/create-seller";
import { ForbiddenError, ValidationError } from "@/core/domain/errors/domain-error";
import type { ProductRepository } from "@/core/domain/repositories/product-repository";
import type { SaleRepository } from "@/core/domain/repositories/sale-repository";
import { Money } from "@/core/domain/value-objects/money";

const user = (role: AuthUser["role"]): AuthUser => ({ id: `${role}-1`, role, storeId: "s1", email: null });

describe("CancelSale", () => {
  const setup = () => {
    const cancel = vi.fn().mockResolvedValue({ id: "sale-1" });
    return { cancel, useCase: new CancelSale({ cancel } as unknown as SaleRepository) };
  };

  it.each(["owner", "manager"] as const)("%s cancela com motivo (normalizado)", async (role) => {
    const { cancel, useCase } = setup();
    await useCase.execute(user(role), "sale-1", "  Cliente desistiu ");
    expect(cancel).toHaveBeenCalledWith("sale-1", "Cliente desistiu");
  });

  it("exige motivo", async () => {
    const { cancel, useCase } = setup();
    await expect(useCase.execute(user("manager"), "sale-1", "  ")).rejects.toBeInstanceOf(ValidationError);
    expect(cancel).not.toHaveBeenCalled();
  });

  it.each(["seller", "master"] as const)("%s não cancela", async (role) => {
    await expect(setup().useCase.execute(user(role), "sale-1", "motivo válido")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("criação de equipe", () => {
  const provisioner = () => {
    const createUser = vi.fn().mockResolvedValue({ id: "new" });
    return { createUser, port: { createUser } as UserProvisioner };
  };
  const input = { email: "a@b.com", password: "12345678", fullName: "Fulano" };

  it("gerente cria vendedor na própria loja", async () => {
    const { createUser, port } = provisioner();
    await new CreateSeller(port).execute(user("manager"), input);
    expect(createUser).toHaveBeenCalledWith({ ...input, role: "seller", storeId: "s1" });
  });

  it("só o dono cria gerente", async () => {
    const { createUser, port } = provisioner();
    await new CreateManager(port).execute(user("owner"), input);
    expect(createUser).toHaveBeenCalledWith({ ...input, role: "manager", storeId: "s1" });
    await expect(new CreateManager(port).execute(user("manager"), input)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(new CreateManager(port).execute(user("seller"), input)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("vendedor não cria ninguém", async () => {
    await expect(new CreateSeller(provisioner().port).execute(user("seller"), input)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("CreateProduct e preço de custo", () => {
  const product = { name: "Camisa", basePrice: Money.fromDecimal(50), costPrice: Money.fromDecimal(20), variants: [{ sku: "A" }] };

  it("gerente cadastra sem o custo (restrito ao dono)", async () => {
    const create = vi.fn().mockResolvedValue({});
    await new CreateProduct({ create } as unknown as ProductRepository).execute(user("manager"), product);
    expect(create.mock.calls[0]?.[0].costPrice).toBeNull();
  });

  it("dono mantém o custo", async () => {
    const create = vi.fn().mockResolvedValue({});
    await new CreateProduct({ create } as unknown as ProductRepository).execute(user("owner"), product);
    expect(create.mock.calls[0]?.[0].costPrice?.toDecimal()).toBe(20);
  });
});
