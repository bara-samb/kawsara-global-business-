import Image from "next/image";
import { Package } from "lucide-react";

/**
 * Affichage uniforme des visuels produit sur toute la boutique. Remplit son parent, qui doit
 * etre `relative` et dimensionne (ex. `relative aspect-[4/3]`).
 * - Illustration de la boutique (public/products) : deja mise en scene, affichee plein cadre.
 * - Vraie photo televersee : centree sur un fond doux, le blanc de la photo se fond dans le
 *   decor (mix-blend-multiply) : rendu "studio" meme pour une photo prise au telephone.
 * - Aucune image : un emplacement propre plutot qu'un texte "Pas d'image".
 */
export function ProductVisual({
  src,
  alt,
  sizes,
  priority,
  zoomOnHover = false,
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  zoomOnHover?: boolean;
}) {
  const zoom = zoomOnHover ? "transition-transform duration-500 group-hover:scale-105" : "";

  if (!src) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-white to-brand-green-50 text-brand-green-600/40">
        <Package className="h-1/4 max-h-16 w-1/4 max-w-16" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  if (src.startsWith("/products/")) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${zoom}`} />;
  }

  // Meme mise en scene que les illustrations (voir public/products/illustrations) : fond degrade,
  // disque vert et ombre au sol, aux memes proportions (cadre 800x600 : disque de rayon 232
  // centre en 400,285 ; ombre en 400,508).
  return (
    <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 40%, #ffffff, #e8f0ea)" }}>
      <div
        aria-hidden
        className="absolute left-1/2 top-[47.5%] aspect-square h-[77%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(65% 65% at 50% 35%, #f2f9f4, #d6ebdc)" }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[84.5%] h-[6%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-brand-green-900/20 blur-md"
      />
      {/* Le blanc de la photo se fond dans le disque (multiply) : le produit semble detoure. */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-contain px-[22%] pb-[17%] pt-[9%] mix-blend-multiply ${zoom}`}
      />
    </div>
  );
}
