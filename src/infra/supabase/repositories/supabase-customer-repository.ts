import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer } from "@/core/domain/entities/customer";
import type {
  CustomerRepository,
  NewCustomerInput,
} from "@/core/domain/repositories/customer-repository";
import { toCustomer } from "../mappers/mappers";
import type { CustomerRow } from "../types/rows";
import { assertNoError, requireRow } from "./errors";
import { compact, escapeLike } from "./utils";

export class SupabaseCustomerRepository implements CustomerRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<Customer | null> {
    const { data, error } = await this.db.from("customers").select("*").eq("id", id).maybeSingle<CustomerRow>();
    assertNoError(error);
    return data ? toCustomer(data) : null;
  }

  async search(query?: string, limit = 20): Promise<Customer[]> {
    let q = this.db.from("customers").select("*").order("name").limit(limit);
    if (query?.trim()) q = q.ilike("name", `%${escapeLike(query.trim())}%`);
    const { data, error } = await q.returns<CustomerRow[]>();
    assertNoError(error);
    return (data ?? []).map(toCustomer);
  }

  async create(input: NewCustomerInput): Promise<Customer> {
    const { data, error } = await this.db
      .from("customers")
      .insert({
        store_id: input.storeId,
        name: input.name,
        document: input.document ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
      })
      .select("*")
      .single<CustomerRow>();
    return toCustomer(requireRow(data, error, "Customer"));
  }

  async update(id: string, patch: Partial<Omit<NewCustomerInput, "storeId">>): Promise<Customer> {
    const { data, error } = await this.db
      .from("customers")
      .update(compact({ ...patch }))
      .eq("id", id)
      .select("*")
      .maybeSingle<CustomerRow>();
    return toCustomer(requireRow(data, error, "Customer"));
  }
}
