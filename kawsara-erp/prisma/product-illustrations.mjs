// Illustration dediee a chaque produit de demonstration (public/products/illustrations).
// Partage par le seed et par scripts/apply-product-illustrations.mjs. Cle = nom exact du produit.
export const PRODUCT_ILLUSTRATIONS = {
  "Ampoule LED 12W culot E27": "ampoule-led-e27",
  "Cable electrique souple 2.5mm (rouleau 100m)": "cable-electrique-2-5mm",
  "Disjoncteur differentiel 20A": "disjoncteur-differentiel-20a",
  "Interrupteur simple allumage": "interrupteur-simple",
  "Prise de courant 2P+T": "prise-2p-t",
  "Marteau menuisier 500g": "marteau-menuisier",
  "Niveau a bulle 60cm": "niveau-a-bulle-60cm",
  "Perceuse electrique 650W": "perceuse-electrique",
  "Scie egoine 500mm": "scie-egoine",
  "Tournevis multi-embouts (set 6)": "tournevis-multi-embouts",
  "Peinture glycero blanche 20L": "peinture-glycero-blanche-20l",
  "Peinture vinylique couleur 15L": "peinture-vinylique-15l",
  "Pinceau plat 4 pouces": "pinceau-plat-4-pouces",
  "Rouleau a peindre + manche": "rouleau-a-peindre",
  "Joint teflon plomberie": "joint-teflon",
  "Raccord PVC coude 90 (32mm)": "raccord-pvc-coude-90",
  "Robinet melangeur evier": "robinet-melangeur",
  "Tuyau PVC evacuation 110mm (2m)": "tuyau-pvc-110mm",
  "Cadenas laiton 50mm": "cadenas-laiton-50mm",
  "Ciment CEM II 50kg": "ciment-cem-ii-50kg",
  "Clous 5cm (boite 1kg)": "clous-5cm-1kg",
  "Fer a beton 12mm (barre 12m)": "fer-a-beton-12mm",
  "Fer a beton 8mm (barre 12m)": "fer-a-beton-8mm",
  "Vis a bois assorties (boite 200)": "vis-a-bois-assorties",
};

// Anciennes images generiques (une seule par categorie) : les seules que le script remplace.
export const GENERIC_CATEGORY_IMAGES = [
  "/products/quincaillerie.svg",
  "/products/outillage.svg",
  "/products/peinture.svg",
  "/products/plomberie.svg",
  "/products/electricite.svg",
];

export function illustrationUrl(productName) {
  const slug = PRODUCT_ILLUSTRATIONS[productName];
  return slug ? `/products/illustrations/${slug}.svg` : null;
}
