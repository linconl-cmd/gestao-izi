import type { Customer } from "../entities/customer";

export interface NewCustomerInput {
  storeId: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  search(query?: string, limit?: number): Promise<Customer[]>;
  create(input: NewCustomerInput): Promise<Customer>;
  /** Somente owner (RLS). */
  update(id: string, patch: Partial<Omit<NewCustomerInput, "storeId">>): Promise<Customer>;
}
