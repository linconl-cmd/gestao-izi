import { assertRole, requireStoreId } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import type { UserProvisioner } from "../../ports/user-provisioner";

export class CreateSeller {
  constructor(private readonly provisioner: UserProvisioner) {}

  /** Owner e gerente criam vendedores, sempre na própria loja. */
  async execute(
    actor: AuthUser,
    input: { email: string; password: string; fullName: string },
  ): Promise<{ id: string }> {
    assertRole(actor, "owner", "manager");
    return this.provisioner.createUser({ ...input, role: "seller", storeId: requireStoreId(actor) });
  }
}
