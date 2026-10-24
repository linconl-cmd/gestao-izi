import { requireStoreId } from "@/core/application/authorization";
import type { Profile } from "@/core/domain/entities/profile";
import { createManagerAction, createSellerAction, setSellerActiveAction } from "@/presentation/actions/sellers";
import { Flash, PageHeader } from "@/presentation/components/layout/app-shell";
import { buttonClass, inputClass, linkButtonClass, listClass } from "@/presentation/components/shared/styles";
import { Badge } from "@/presentation/components/ui/badge";
import { requireUser } from "@/presentation/lib/require-user";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container, user }] = await Promise.all([searchParams, requireUser("owner", "manager")]);
  const isOwner = user.role === "owner";
  const team = await container.repositories.profiles.listByStore(requireStoreId(user));
  // O gerente administra só vendedores; o dono vê e administra gerentes também.
  const members = team.filter((p) => p.role === "seller" || (isOwner && p.role === "manager"));

  return (
    <div>
      <PageHeader title="Equipe" description={isOwner ? "Gerentes e vendedores da loja." : "Vendedores da loja."} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
          <Flash error={error} ok={ok} />
          {members.length === 0 ? (
            <p className="text-muted-foreground">Ninguém cadastrado ainda.</p>
          ) : (
            <ul className={listClass}>
              {members.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Desativar bloqueia o login no próximo refresh do token (até 1 h para sessões já abertas).
          </p>
        </section>

        <div className="space-y-8">
          <NewMemberForm title="Novo vendedor" action={createSellerAction} submit="Criar vendedor" />
          {isOwner && <NewMemberForm title="Novo gerente" action={createManagerAction} submit="Criar gerente" />}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: Profile }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium">
          <span className="truncate">{member.fullName}</span>
          {member.role === "manager" && <Badge className="rounded-full">Gerente</Badge>}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {member.email} · {member.isActive ? "ativo" : "inativo"}
        </p>
      </div>
      <form action={setSellerActiveAction}>
        <input type="hidden" name="id" value={member.id} />
        <input type="hidden" name="isActive" value={String(!member.isActive)} />
        <button type="submit" className={linkButtonClass}>
          {member.isActive ? "Desativar" : "Reativar"}
        </button>
      </form>
    </li>
  );
}

function NewMemberForm({
  title,
  action,
  submit,
}: {
  title: string;
  action: (formData: FormData) => Promise<void>;
  submit: string;
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <form action={action} className="flex flex-col gap-3">
        <input name="fullName" required placeholder="Nome" className={inputClass} />
        <input name="email" type="email" required placeholder="E-mail" className={inputClass} />
        <input name="password" type="password" required minLength={8} autoComplete="new-password"
          placeholder="Senha inicial (mín. 8)" className={inputClass} />
        <button type="submit" className={buttonClass}>{submit}</button>
      </form>
    </section>
  );
}
