import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { ConflictError, NotFoundError, ValidationError } from "@/core/domain/errors/domain-error";
import { itemsWithoutStock } from "@/core/domain/entities/order";
import type { Sale } from "@/core/domain/entities/sale";
import type { CashRegisterRepository } from "@/core/domain/repositories/cash-register-repository";
import type { OrderRepository } from "@/core/domain/repositories/order-repository";
import type { SaleRepository } from "@/core/domain/repositories/sale-repository";
import type { Money } from "@/core/domain/value-objects/money";
import type { PaymentMethod } from "@/core/domain/value-objects/payment-method";

/** Recebimento: dono/gerente aplica o desconto, escolhe o pagamento e a venda nasce no caixa dele. */
export class PayOrder {
  constructor(
    private readonly orders: OrderRepository,
    private readonly registers: CashRegisterRepository,
    private readonly sales: SaleRepository,
  ) {}

  async execute(
    actor: AuthUser,
    input: { orderId: string; paymentMethod: PaymentMethod; discount?: Money | null },
  ): Promise<Sale> {
    assertRole(actor, "owner", "manager");
    if (input.discount?.isNegative()) throw new ValidationError("O desconto não pode ser negativo.");

    const order = await this.orders.findById(input.orderId);
    if (!order) throw new NotFoundError("Comanda");
    if (order.status !== "open") throw new ConflictError("Esta comanda não está mais aberta.");
    if (order.items.length === 0) throw new ValidationError("A comanda está vazia.");

    const short = itemsWithoutStock(order);
    if (short.length > 0) {
      throw new ConflictError(
        `Estoque insuficiente: ${short.map((i) => `${i.productName} ${[i.size, i.color].filter(Boolean).join("/")} (restam ${i.stock})`).join("; ")}. Ajuste a comanda.`,
      );
    }

    const register = await this.registers.findOpenByUser(actor.id);
    if (!register) throw new ConflictError("Abra o seu caixa antes de receber.");

    const saleId = await this.orders.pay({
      orderId: order.id,
      cashRegisterId: register.id,
      paymentMethod: input.paymentMethod,
      discount: input.discount ?? null,
    });
    const sale = await this.sales.findById(saleId);
    if (!sale) throw new NotFoundError("Venda");
    return sale;
  }
}
