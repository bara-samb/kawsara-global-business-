// Remplace les images generiques de categorie par l'illustration dediee de chaque produit.
// Usage : npm run products:illustrations
// Ne touche JAMAIS a une vraie photo televersee depuis l'ERP : seules les 5 anciennes images
// generiques (une par categorie) sont remplacees. Sans risque a relancer.
import { PrismaClient } from "@prisma/client";
import { GENERIC_CATEGORY_IMAGES, illustrationUrl } from "../prisma/product-illustrations.mjs";

const prisma = new PrismaClient();

try {
  const images = await prisma.productImage.findMany({
    where: { url: { in: GENERIC_CATEGORY_IMAGES } },
    include: { product: { select: { name: true } } },
  });

  let updated = 0;
  for (const image of images) {
    const url = illustrationUrl(image.product.name);
    if (!url) continue;
    await prisma.productImage.update({ where: { id: image.id }, data: { url } });
    updated += 1;
  }
  console.log(`${updated} produit(s) mis a jour avec leur illustration dediee (${images.length - updated} ignore(s)).`);
} finally {
  await prisma.$disconnect();
}
