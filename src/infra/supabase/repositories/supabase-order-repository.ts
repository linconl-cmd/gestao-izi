import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/core/domain/errors/domain-error";
import type { Order } from "@/core/domain/entities/order";
import type {
  CreateOrderInput,
  OrderQuery,
  OrderRepository,
  PayOrderInput,
} from "@/core/domain/repositories/order-repository";
import { toOrder } from "../mappers/mappers";
import type { OrderRow } from "../types/rows";
import { assertNoError } from "./errors";

const ORDER_SELECT =
  "*, order_items(variant_id, quantity, product_variants(*, products(name, base_price)))";

export class SupabaseOrderRepository implements OrderRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: CreateOrderInput): Promise<Order> {
    const { data, error } = await this.db.rpc("create_order", {
      p_items: input.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      p_suggested_discount: input.suggestedDiscount?.toDecimal() ?? 0,
      p_notes: input.notes ?? null,
    });
    assertNoError(error);
    const order = await this.findById(data as string);
    if (!order) throw new NotFoundError("Order");
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    const { data, error } = await this.db
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .maybeSingle<OrderRow>();
    assertNoError(error);
    return data ? toOrder(data) : null;
  }

  async findByNumber(number: number): Promise<Order | null> {
    const { data, error } = await this.db
      .from("orders")
      .select(ORDER_SELECT)
      .eq("number", number)
      .maybeSingle<OrderRow>();
    assertNoError(error);
    return data ? toOrder(data) : null;
  }

  async list(query: OrderQuery = {}): Promise<Order[]> {
    let q = this.db.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
    if (query.status) q = q.eq("status", query.status);
    if (query.sellerId) q = q.eq("seller_id", query.sellerId);
    if (query.from) q = q.gte("created_at", query.from.toISOString());
    const { data, error } = await q.limit(query.limit ?? 50).returns<OrderRow[]>();
    assertNoError(error);
    return (data ?? []).map(toOrder);
  }

  async countOpen(): Promise<number> {
    const { count, error } = await this.db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    assertNoError(error);
    return count ?? 0;
  }

  async setItemQuantity(orderId: string, variantId: string, quantity: number): Promise<void> {
    const { error } = await this.db.rpc("set_order_item", {
      p_order_id: orderId,
      p_variant_id: variantId,
      p_quantity: quantity,
    });
    assertNoError(error);
  }

  async cancel(id: string, reason?: string | null): Promise<void> {
    const { error } = await this.db.rpc("cancel_order", { p_order_id: id, p_reason: reason ?? null });
    assertNoError(error);
  }

  async pay(input: PayOrderInput): Promise<string> {
    const { data, error } = await this.db.rpc("pay_order", {
      p_order_id: input.orderId,
      p_cash_register_id: input.cashRegisterId,
      p_payment_method: input.paymentMethod,
      p_discount: input.discount?.toDecimal() ?? null,
    });
    assertNoError(error);
    return data as string;
  }

  async expireStale(): Promise<number> {
    const { data, error } = await this.db.rpc("expire_stale_orders");
    assertNoError(error);
    return (data as number | null) ?? 0;
  }
}
