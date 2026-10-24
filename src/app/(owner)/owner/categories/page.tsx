import { createCategoryAction, deleteCategoryAction } from "@/presentation/actions/catalog";
import { Flash } from "@/presentation/components/layout/app-shell";
import { buttonClass, inputClass, linkButtonClass } from "@/presentation/components/shared/styles";
import { requireUser } from "@/presentation/lib/require-user";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container }] = await Promise.all([searchParams, requireUser("owner", "manager")]);
  const categories = await container.repositories.categories.list();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Categorias</h1>
      <Flash error={error} ok={ok} />
      <form action={createCategoryAction} className="mb-6 flex gap-2">
        <input name="name" required placeholder="Nova categoria" className={`${inputClass} flex-1`} />
        <button type="submit" className={buttonClass}>Adicionar</button>
      </form>
      {categories.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma categoria.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2">
              <span>{c.name}</span>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className={linkButtonClass}>Remover</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
