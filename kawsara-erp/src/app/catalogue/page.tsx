import Link from "next/link";
import { Search, SlidersHorizontal, RotateCcw, PackageSearch } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { ProductVisual } from "@/components/site/product-visual";
import { CategoryFilter } from "@/components/site/category-filter";
import { prisma } from "@/lib/prisma";

function availableStock(stocks: { quantity: number; reserved: number }[]) {
  return stocks.reduce((sum, s) => sum + Math.max(0, s.quantity - s.reserved), 0);
}

async function getCatalogue(q?: string, categoryId?: string) {
  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          active: true,
          onlineEnabled: true,
          ...(categoryId ? { categoryId } : {}),
          ...(q ? { name: { contains: q } } : {}),
        },
        orderBy: { name: "asc" },
        include: { category: true, images: { take: 1, orderBy: { position: "asc" } }, stocks: true },
      }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);
    return { products, categories };
  } catch {
    return { products: [], categories: [] };
  }
}

type CatalogueProduct = Awaited<ReturnType<typeof getCatalogue>>["products"][number];

function groupByCategory(products: CatalogueProduct[]) {
  const groups = new Map<string, { name: string; products: CatalogueProduct[] }>();
  for (const p of products) {
    const key = p.category?.id ?? "sans-categorie";
    const name = p.category?.name ?? "Divers";
    if (!groups.has(key)) groups.set(key, { name, products: [] });
    groups.get(key)!.products.push(p);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string }>;
}) {
  const { q, categorie } = await searchParams;
  const { products, categories } = await getCatalogue(q, categorie);
  const groups = groupByCategory(products);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-brand-green-900 py-10 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h1 className="text-2xl font-bold">Catalogue</h1>
            <p className="mt-1 text-sm text-brand-green-100">
              Produits disponibles a la vente en ligne, stock verifie en temps reel.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <form className="flex flex-wrap items-end gap-3" action="/catalogue">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-brand-green-900">Recherche</label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Nom du produit..."
                  className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm transition focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-brand-green-900">Categorie</label>
              <CategoryFilter
                categories={categories}
                selectedCategory={categorie}
                query={q}
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-800 active:scale-95">
              <SlidersHorizontal className="h-4 w-4" />
              Filtrer
            </button>
            {(q || categorie) && (
              <Link href="/catalogue" className="flex items-center gap-1 text-sm font-semibold text-brand-green-700 hover:text-brand-gold-600">
                <RotateCcw className="h-3.5 w-3.5" />
                Reinitialiser
              </Link>
            )}
          </form>

          {products.length === 0 ? (
            <div className="animate-fade-in mt-10 flex flex-col items-center gap-3 rounded-lg border border-dashed border-brand-green-200 bg-white p-10 text-center">
              <PackageSearch className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">Aucun produit ne correspond a votre recherche.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-12">
              {groups.map((group) => (
                <div key={group.name} className="animate-fade-in-up">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-brand-green-900">{group.name}</h2>
                    <span className="rounded-full bg-brand-green-100 px-2.5 py-0.5 text-xs font-semibold text-brand-green-700">
                      {group.products.length}
                    </span>
                    <div className="h-px flex-1 bg-brand-green-100" />
                  </div>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {group.products.map((p) => {
                      const stock = availableStock(p.stocks);
                      return (
                        <div key={p.id} className="group rounded-xl border border-brand-green-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                          <Link href={`/catalogue/${p.id}`}>
                            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                              <ProductVisual src={p.images[0]?.url} alt={p.name} sizes="(min-width: 1024px) 250px, (min-width: 640px) 45vw, 90vw" zoomOnHover />
                            </div>
                            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-brand-gold-600">
                              {p.category?.name ?? "Divers"}
                            </p>
                            <p className="font-semibold text-brand-green-900 group-hover:text-brand-gold-600">{p.name}</p>
                            <p className="mt-1 font-bold text-brand-green-800">{p.sellingPrice.toLocaleString("fr-FR")} FCFA</p>
                            <p className={`mt-1 text-xs ${stock > 0 ? "text-gray-500" : "text-red-600 font-semibold"}`}>
                              {stock > 0 ? `${stock} en stock` : "Rupture de stock"}
                            </p>
                          </Link>
                          <div className="mt-3">
                            <AddToCartButton
                              product={{
                                id: p.id,
                                reference: p.reference,
                                name: p.name,
                                description: p.description,
                                sellingPrice: p.sellingPrice,
                                imageUrl: p.images[0]?.url,
                                availableStock: stock,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
