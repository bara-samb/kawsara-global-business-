import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { prisma } from "@/lib/prisma";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, active: true, onlineEnabled: true },
    include: { category: true, images: { orderBy: { position: "asc" } }, stocks: true },
  });

  if (!product) notFound();

  const availableStock = product.stocks.reduce((s, st) => s + Math.max(0, st.quantity - st.reserved), 0);
  const related = await prisma.product.findMany({
    where: {
      active: true,
      onlineEnabled: true,
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    take: 4,
    include: { images: { take: 1, orderBy: { position: "asc" } } },
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <nav className="text-xs text-gray-500">
            <Link href="/catalogue" className="hover:text-brand-gold-600">Catalogue</Link>
            {product.category && (
              <>
                {" / "}
                <Link href={`/catalogue?categorie=${product.category.id}`} className="hover:text-brand-gold-600">
                  {product.category.name}
                </Link>
              </>
            )}
            {" / "}
            <span className="text-gray-700">{product.name}</span>
          </nav>

          <div className="mt-6 grid gap-10 md:grid-cols-2">
            <div className="flex h-80 items-center justify-center overflow-hidden rounded-xl bg-brand-green-50">
              {product.images[0] ? (
                <Image src={product.images[0].url} alt={product.name} width={400} height={320} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm text-gray-400">Pas d&apos;image</span>
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-gold-600">
                {product.category?.name ?? "Divers"}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-brand-green-900">{product.name}</h1>
              <p className="mt-1 text-xs text-gray-400">Reference : {product.reference}</p>
              <p className="mt-4 text-3xl font-bold text-brand-green-800">
                {product.sellingPrice.toLocaleString("fr-FR")} FCFA
              </p>
              <p className={`mt-2 text-sm ${availableStock > 0 ? "text-brand-green-700" : "text-red-600 font-semibold"}`}>
                {availableStock > 0 ? `${availableStock} unite(s) disponible(s)` : "Rupture de stock"}
              </p>

              {product.description && (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">{product.description}</p>
              )}

              <div className="mt-6 max-w-xs">
                <AddToCartButton
                  product={{
                    id: product.id,
                    reference: product.reference,
                    name: product.name,
                    sellingPrice: product.sellingPrice,
                    imageUrl: product.images[0]?.url,
                    availableStock,
                  }}
                />
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="text-lg font-bold text-brand-green-900">Autres produits de cette categorie</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/catalogue/${p.id}`}
                    className="group rounded-xl border border-brand-green-100 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-brand-green-50">
                      {p.images[0] ? (
                        <Image src={p.images[0].url} alt={p.name} width={140} height={112} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400">Pas d&apos;image</span>
                      )}
                    </div>
                    <p className="mt-3 font-semibold text-brand-green-900 group-hover:text-brand-gold-600">{p.name}</p>
                    <p className="mt-1 font-bold text-brand-green-800">{p.sellingPrice.toLocaleString("fr-FR")} FCFA</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
