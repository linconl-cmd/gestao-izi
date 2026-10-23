import type { SupabaseClient } from "@supabase/supabase-js";
import type { CashRegister } from "@/core/domain/entities/cash-register";
import type { CashRegisterRepository } from "@/core/domain/repositories/cash-register-repository";
import type { Money } from "@/core/domain/value-objects/money";
import { toCashRegister } from "../mappers/mappers";
import type { CashRegisterRow } from "../types/rows";
import { assertNoError, requireRow } from "./errors";

export class SupabaseCashRegisterRepository implements CashRegisterRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findOpenByUser(userId: string): Promise<CashRegister | null> {
    const { data, error } = await this.db
      .from("cash_registers")
      .select("*")
      .eq("opened_by", userId)
      .eq("status", "open")
      .maybeSingle<CashRegisterRow>();
    assertNoError(error);
    return data ? toCashRegister(data) : null;
  }

  async findById(id: string): Promise<CashRegister | null> {
    const { data, error } = await this.db
      .from("cash_registers")
      .select("*")
      .eq("id", id)
      .maybeSingle<CashRegisterRow>();
    assertNoError(error);
    return data ? toCashRegister(data) : null;
  }

  async open(input: { storeId: string; openedBy: string; openingAmount: Money }): Promise<CashRegister> {
    const { data, error } = await this.db
      .from("cash_registers")
      .insert({
        store_id: input.storeId,
        opened_by: input.openedBy,
        opening_amount: input.openingAmount.toDecimal(),
        status: "open",
      })
      .select("*")
      .single<CashRegisterRow>();
    return toCashRegister(requireRow(data, error, "Cash register"));
  }

  async close(id: string, input: { closingAmount: Money; notes?: string | null }): Promise<CashRegister> {
    const { data, error } = await this.db
      .from("cash_registers")
      .update({
        status: "closed",
        closing_amount: input.closingAmount.toDecimal(),
        notes: input.notes ?? null,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle<CashRegisterRow>();
    return toCashRegister(requireRow(data, error, "Cash register"));
  }

  async list(params: { limit?: number; offset?: number } = {}): Promise<CashRegister[]> {
    const limit = params.limit ?? 30;
    const offset = params.offset ?? 0;
    const { data, error } = await this.db
      .from("cash_registers")
      .select("*")
      .order("opened_at", { ascending: false })
      .range(offset, offset + limit - 1)
      .returns<CashRegisterRow[]>();
    assertNoError(error);
    return (data ?? []).map(toCashRegister);
  }
}
