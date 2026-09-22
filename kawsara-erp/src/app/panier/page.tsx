import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { PanierView } from "@/components/site/panier-view";

export default function PanierPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-green-900">Mon panier</h1>
          <PanierView />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
