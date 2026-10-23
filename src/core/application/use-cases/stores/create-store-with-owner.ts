import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import type { UserProvisioner } from "../../ports/user-provisioner";
import type { Store } from "@/core/domain/entities/store";
import type { NewStoreInput, StoreRepository } from "@/core/domain/repositories/store-repository";

export class CreateStoreWithOwner {
  constructor(
    private readonly stores: StoreRepository,
    private readonly provisioner: UserProvisioner,
  ) {}

  async execute(
    actor: AuthUser,
    input: { store: NewStoreInput; owner: { email: string; password: string; fullName: string } },
  ): Promise<{ store: Store; ownerId: string }> {
    assertRole(actor, "master");
    const store = await this.stores.create(input.store);
    try {
      const owner = await this.provisioner.createUser({
        ...input.owner,
        role: "owner",
        storeId: store.id,
      });
      return { store, ownerId: owner.id };
    } catch (error) {
      await this.stores.delete(store.id); // compensação: não deixar loja órfã
      throw error;
    }
  }
}
