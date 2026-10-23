import type { UserRole } from "@/core/domain/value-objects/user-role";

export interface ProvisionUserInput {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  storeId: string | null;
}

/** Criação de contas exige privilégio de servidor (service role). */
export interface UserProvisioner {
  createUser(input: ProvisionUserInput): Promise<{ id: string }>;
}
