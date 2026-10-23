import { assertRole, requireStoreId } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import type { UserProvisioner } from "../../ports/user-provisioner";

export class CreateSeller {
  constructor(private readonly provisioner: UserProvisioner) {}

  /** O owner só cria vendedores na própria loja. */
  async execute(
    actor: AuthUser,
    input: { email: string; password: string; fullName: string },
  ): Promise<{ id: string }> {
    assertRole(actor, "owner");
    return this.provisioner.createUser({ ...input, role: "seller", storeId: requireStoreId(actor) });
  }
}
