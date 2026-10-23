import { createStoreAction, setStoreActiveAction } from "@/presentation/actions/stores";
import { Flash } from "@/presentation/components/layout/app-shell";
import { buttonClass, inputClass, linkButtonClass } from "@/presentation/components/shared/styles";
import { requireUser } from "@/presentation/lib/require-user";

export default async function MasterStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container }] = await Promise.all([searchParams, requireUser("master")]);
  const stores = await container.repositories.stores.list();

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Lojas</h1>
        <Flash error={error} ok={ok} />
        {stores.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma loja cadastrada.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft">
            {stores.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.slug} · {s.isActive ? "ativa" : "inativa"}
                  </p>
                </div>
                <form action={setStoreActiveAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="isActive" value={String(!s.isActive)} />
                  <button type="submit" className={linkButtonClass}>
                    {s.isActive ? "Desativar" : "Reativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Nova loja</h2>
        <form action={createStoreAction} className="flex flex-col gap-3">
          <input name="name" required placeholder="Nome da loja" className={inputClass} />
          <input name="slug" placeholder="Identificador (opcional)" className={inputClass} />
          <input name="document" placeholder="CNPJ (opcional)" className={inputClass} />
          <hr className="border-border" />
          <input name="ownerName" required placeholder="Nome do proprietário" className={inputClass} />
          <input name="ownerEmail" type="email" required placeholder="E-mail do proprietário" className={inputClass} />
          <input name="ownerPassword" type="password" required minLength={8} placeholder="Senha inicial (mín. 8)"
            autoComplete="new-password" className={inputClass} />
          <button type="submit" className={buttonClass}>Criar loja</button>
        </form>
      </section>
    </div>
  );
}
