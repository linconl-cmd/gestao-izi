import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/core/domain/errors/domain-error";
import type { Sale } from "@/core/domain/entities/sale";
import type {
  CreateSaleInput,
  SaleQuery,
  SaleRepository,
} from "@/core/domain/repositories/sale-repository";
import { toSale } from "../mappers/mappers";
import type { SaleRow } from "../types/rows";
import { assertNoError, requireRow } from "./errors";

const SALE_SELECT = "*, sale_items(*)";

export class SupabaseSaleRepository implements SaleRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: CreateSaleInput): Promise<Sale> {
    const { data, error } = await this.db.rpc("create_sale", {
      p_cash_register_id: input.cashRegisterId,
      p_payment_method: input.paymentMethod,
      p_items: input.items.map((i) => ({
        variant_id: i.variantId,
        quantity: i.quantity,
        discount: i.discount?.toDecimal() ?? 0,
      })),
      p_customer_id: input.customerId ?? null,
      p_discount: input.discount?.toDecimal() ?? 0,
      p_notes: input.notes ?? null,
    });
    assertNoError(error);

    const sale = await this.findById(data as string);
    if (!sale) throw new NotFoundError("Sale");
    return sale;
  }

  async findById(id: string): Promise<Sale | null> {
    const { data, error } = await this.db
      .from("sales")
      .select(SALE_SELECT)
      .eq("id", id)
      .maybeSingle<SaleRow>();
    assertNoError(error);
    return data ? toSale(data) : null;
  }

  async list(query: SaleQuery = {}): Promise<Sale[]> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    let q = this.db.from("sales").select(SALE_SELECT).order("created_at", { ascending: false });
    if (query.from) q = q.gte("created_at", query.from.toISOString());
    if (query.to) q = q.lte("created_at", query.to.toISOString());
    if (query.sellerId) q = q.eq("seller_id", query.sellerId);
    if (query.status) q = q.eq("status", query.status);
    const { data, error } = await q.range(offset, offset + limit - 1).returns<SaleRow[]>();
    assertNoError(error);
    return (data ?? []).map(toSale);
  }

  async cancel(id: string): Promise<Sale> {
    const { data, error } = await this.db
      .from("sales")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select(SALE_SELECT)
      .maybeSingle<SaleRow>();
    return toSale(requireRow(data, error, "Sale"));
  }
}
