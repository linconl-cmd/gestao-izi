import { LabelDesigner } from "@/presentation/components/labels/label-designer";
import { PageHeader } from "@/presentation/components/layout/app-shell";
import { loadPosCatalog } from "@/presentation/lib/pos-catalog";
import { requireUser } from "@/presentation/lib/require-user";

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const [{ product }, { container }] = await Promise.all([searchParams, requireUser("owner", "manager")]);
  const catalog = await loadPosCatalog(container);

  // /owner/labels?product=ID já traz todas as variantes do produto, com a quantidade do estoque.
  const initial: Record<string, number> = {};
  const preselected = catalog.products.find((p) => p.id === product);
  for (const v of preselected?.variants ?? []) initial[v.variantId] = Math.max(1, v.stock);

  return (
    <div className="print:m-0">
      <div className="print:hidden">
        <PageHeader title="Etiquetas" description="Monte a folha, confira a prévia e imprima em térmica ou folha adesiva." />
      </div>
      <LabelDesigner catalog={catalog} initial={initial} />
    </div>
  );
}
