import { PageHeader } from "@/presentation/components/layout/app-shell";
import { ProductLookup } from "@/presentation/components/pos/product-lookup";
import { loadPosCatalog } from "@/presentation/lib/pos-catalog";
import { requireUser } from "@/presentation/lib/require-user";

export default async function PosLookupPage() {
  const { container } = await requireUser("owner", "seller");
  const catalog = await loadPosCatalog(container);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Consulta" description="Veja preço e estoque por tamanho. Escaneie a etiqueta para localizar." />
      <ProductLookup catalog={catalog} />
    </div>
  );
}
