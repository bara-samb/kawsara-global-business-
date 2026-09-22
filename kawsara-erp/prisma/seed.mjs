import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const REF_PREFIXES = {
  store: "BTQ",
  user: "USR",
  customer: "CLI",
  supplier: "FRN",
  product: "PRD",
  cashRegister: "CSE",
};

async function ref(kind) {
  const year = new Date().getFullYear();
  const key = `${kind}-${year}`;
  const counter = await prisma.referenceCounter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${REF_PREFIXES[kind]}-${year}-${String(counter.value).padStart(6, "0")}`;
}

async function main() {
  console.log("Seed : creation des donnees de demonstration Kawsara Global Business...");

  const storePrincipal = await prisma.store.create({
    data: {
      reference: await ref("store"),
      name: "Depot Principal - Dakar",
      address: "Zone industrielle, Dakar",
      phone: "+221 77 000 00 00",
    },
  });

  const storeSecondaire = await prisma.store.create({
    data: {
      reference: await ref("store"),
      name: "Depot Secondaire - Thies",
      address: "Route de Thies, Thies",
      phone: "+221 77 111 11 11",
    },
  });

  const password = await bcrypt.hash("Admin123!", 10);
  const staffPassword = await bcrypt.hash("Kawsara123!", 10);

  await prisma.user.create({
    data: {
      reference: await ref("user"),
      name: "Administrateur Kawsara",
      email: "admin@kawsara.com",
      passwordHash: password,
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      reference: await ref("user"),
      name: "Fatou Gerante",
      email: "gerant@kawsara.com",
      passwordHash: staffPassword,
      role: "GERANT",
      storeId: storePrincipal.id,
    },
  });

  await prisma.user.create({
    data: {
      reference: await ref("user"),
      name: "Moussa Caissier",
      email: "caissier@kawsara.com",
      passwordHash: staffPassword,
      role: "CAISSIER",
      storeId: storePrincipal.id,
    },
  });

  await prisma.user.create({
    data: {
      reference: await ref("user"),
      name: "Ibrahima Magasinier",
      email: "magasinier@kawsara.com",
      passwordHash: staffPassword,
      role: "MAGASINIER",
      storeId: storePrincipal.id,
    },
  });

  await prisma.user.create({
    data: {
      reference: await ref("user"),
      name: "Aissatou Comptable",
      email: "comptable@kawsara.com",
      passwordHash: staffPassword,
      role: "COMPTABLE",
    },
  });

  await prisma.user.create({
    data: {
      reference: await ref("user"),
      name: "Ousmane Vendeur",
      email: "vendeur@kawsara.com",
      passwordHash: staffPassword,
      role: "VENDEUR",
      storeId: storePrincipal.id,
    },
  });

  const categorieQuincaillerie = await prisma.category.create({ data: { name: "Quincaillerie generale" } });
  const categorieOutillage = await prisma.category.create({ data: { name: "Outillage" } });
  const categoriePeinture = await prisma.category.create({ data: { name: "Peinture" } });
  const categoriePlomberie = await prisma.category.create({ data: { name: "Plomberie" } });
  const categorieElectricite = await prisma.category.create({ data: { name: "Electricite" } });

  const categoryImages = {
    [categorieQuincaillerie.id]: "/products/quincaillerie.svg",
    [categorieOutillage.id]: "/products/outillage.svg",
    [categoriePeinture.id]: "/products/peinture.svg",
    [categoriePlomberie.id]: "/products/plomberie.svg",
    [categorieElectricite.id]: "/products/electricite.svg",
  };

  const supplier = await prisma.supplier.create({
    data: {
      reference: await ref("supplier"),
      name: "Materiaux Senegal SARL",
      phone: "+221 33 800 00 00",
      email: "contact@materiaux-senegal.sn",
      address: "Zone industrielle, Dakar",
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      reference: await ref("supplier"),
      name: "Quincaillerie Import SARL",
      phone: "+221 33 900 00 00",
      email: "ventes@quincaillerie-import.sn",
      address: "Port autonome, Dakar",
    },
  });

  // stockPrincipal / stockSecondaire = quantite dans chaque depot (certains volontairement bas
  // pour demontrer l'alerte de rupture de stock).
  const productsData = [
    { name: "Ciment CEM II 50kg", category: categorieQuincaillerie.id, supplier: supplier.id, purchasePrice: 3800, sellingPrice: 4500, minThreshold: 20, stockPrincipal: 150, stockSecondaire: 60 },
    { name: "Fer a beton 8mm (barre 12m)", category: categorieQuincaillerie.id, supplier: supplier.id, purchasePrice: 4200, sellingPrice: 5000, minThreshold: 15, stockPrincipal: 80, stockSecondaire: 3 },
    { name: "Fer a beton 12mm (barre 12m)", category: categorieQuincaillerie.id, supplier: supplier.id, purchasePrice: 8500, sellingPrice: 10000, minThreshold: 10, stockPrincipal: 40, stockSecondaire: 12 },
    { name: "Clous 5cm (boite 1kg)", category: categorieQuincaillerie.id, supplier: supplier2.id, purchasePrice: 800, sellingPrice: 1200, minThreshold: 25, stockPrincipal: 100, stockSecondaire: 30 },
    { name: "Vis a bois assorties (boite 200)", category: categorieQuincaillerie.id, supplier: supplier2.id, purchasePrice: 2500, sellingPrice: 3500, minThreshold: 10, stockPrincipal: 45, stockSecondaire: 2 },
    { name: "Cadenas laiton 50mm", category: categorieQuincaillerie.id, supplier: supplier2.id, purchasePrice: 1500, sellingPrice: 2200, minThreshold: 10, stockPrincipal: 30, stockSecondaire: 8 },
    { name: "Marteau menuisier 500g", category: categorieOutillage.id, supplier: supplier2.id, purchasePrice: 2200, sellingPrice: 3200, minThreshold: 8, stockPrincipal: 25, stockSecondaire: 5 },
    { name: "Tournevis multi-embouts (set 6)", category: categorieOutillage.id, supplier: supplier2.id, purchasePrice: 3000, sellingPrice: 4500, minThreshold: 8, stockPrincipal: 20, stockSecondaire: 1 },
    { name: "Scie egoine 500mm", category: categorieOutillage.id, supplier: supplier2.id, purchasePrice: 3500, sellingPrice: 5000, minThreshold: 6, stockPrincipal: 18, stockSecondaire: 4 },
    { name: "Perceuse electrique 650W", category: categorieOutillage.id, supplier: supplier2.id, purchasePrice: 22000, sellingPrice: 32000, minThreshold: 4, stockPrincipal: 10, stockSecondaire: 0 },
    { name: "Niveau a bulle 60cm", category: categorieOutillage.id, supplier: supplier2.id, purchasePrice: 2800, sellingPrice: 4000, minThreshold: 6, stockPrincipal: 15, stockSecondaire: 3 },
    { name: "Peinture glycero blanche 20L", category: categoriePeinture.id, supplier: supplier.id, purchasePrice: 25000, sellingPrice: 35000, minThreshold: 6, stockPrincipal: 22, stockSecondaire: 5 },
    { name: "Peinture vinylique couleur 15L", category: categoriePeinture.id, supplier: supplier.id, purchasePrice: 18000, sellingPrice: 26000, minThreshold: 6, stockPrincipal: 16, stockSecondaire: 1 },
    { name: "Pinceau plat 4 pouces", category: categoriePeinture.id, supplier: supplier2.id, purchasePrice: 800, sellingPrice: 1500, minThreshold: 15, stockPrincipal: 40, stockSecondaire: 10 },
    { name: "Rouleau a peindre + manche", category: categoriePeinture.id, supplier: supplier2.id, purchasePrice: 1200, sellingPrice: 2000, minThreshold: 10, stockPrincipal: 25, stockSecondaire: 2 },
    { name: "Tuyau PVC evacuation 110mm (2m)", category: categoriePlomberie.id, supplier: supplier.id, purchasePrice: 3200, sellingPrice: 4500, minThreshold: 12, stockPrincipal: 35, stockSecondaire: 8 },
    { name: "Robinet melangeur evier", category: categoriePlomberie.id, supplier: supplier.id, purchasePrice: 6500, sellingPrice: 9500, minThreshold: 6, stockPrincipal: 14, stockSecondaire: 0 },
    { name: "Raccord PVC coude 90 (32mm)", category: categoriePlomberie.id, supplier: supplier.id, purchasePrice: 400, sellingPrice: 700, minThreshold: 20, stockPrincipal: 60, stockSecondaire: 15 },
    { name: "Joint teflon plomberie", category: categoriePlomberie.id, supplier: supplier2.id, purchasePrice: 300, sellingPrice: 600, minThreshold: 20, stockPrincipal: 50, stockSecondaire: 12 },
    { name: "Cable electrique souple 2.5mm (rouleau 100m)", category: categorieElectricite.id, supplier: supplier.id, purchasePrice: 28000, sellingPrice: 38000, minThreshold: 4, stockPrincipal: 12, stockSecondaire: 2 },
    { name: "Disjoncteur differentiel 20A", category: categorieElectricite.id, supplier: supplier.id, purchasePrice: 4500, sellingPrice: 6500, minThreshold: 8, stockPrincipal: 20, stockSecondaire: 3 },
    { name: "Interrupteur simple allumage", category: categorieElectricite.id, supplier: supplier2.id, purchasePrice: 600, sellingPrice: 1000, minThreshold: 20, stockPrincipal: 45, stockSecondaire: 10 },
    { name: "Prise de courant 2P+T", category: categorieElectricite.id, supplier: supplier2.id, purchasePrice: 700, sellingPrice: 1200, minThreshold: 20, stockPrincipal: 40, stockSecondaire: 1 },
    { name: "Ampoule LED 12W culot E27", category: categorieElectricite.id, supplier: supplier2.id, purchasePrice: 900, sellingPrice: 1500, minThreshold: 25, stockPrincipal: 55, stockSecondaire: 18 },
  ];

  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        reference: await ref("product"),
        name: p.name,
        categoryId: p.category,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        minThreshold: p.minThreshold,
        supplierId: p.supplier,
        active: true,
        onlineEnabled: true,
      },
    });
    await prisma.stock.create({
      data: { productId: product.id, storeId: storePrincipal.id, quantity: p.stockPrincipal },
    });
    await prisma.stock.create({
      data: { productId: product.id, storeId: storeSecondaire.id, quantity: p.stockSecondaire },
    });
    await prisma.productImage.create({
      data: { productId: product.id, url: categoryImages[p.category], position: 0 },
    });
  }

  const customerUserPassword = await bcrypt.hash("Client123!", 10);
  const customerUser = await prisma.user.create({
    data: {
      reference: await ref("user"),
      name: "Aminata Cliente",
      email: "client@kawsara.com",
      passwordHash: customerUserPassword,
      role: "CLIENT",
    },
  });
  await prisma.customer.create({
    data: {
      reference: await ref("customer"),
      name: "Aminata Cliente",
      email: "client@kawsara.com",
      phone: "+221 70 123 45 67",
      address: "Sacre-Coeur, Dakar",
      userId: customerUser.id,
    },
  });

  await prisma.customer.create({
    data: {
      reference: await ref("customer"),
      name: "Entreprise Batir SARL",
      phone: "+221 78 222 33 44",
      address: "Rufisque, Dakar",
    },
  });

  await prisma.cashRegister.create({
    data: {
      reference: await ref("cashRegister"),
      storeId: storePrincipal.id,
      name: "Caisse 1",
      number: "C1",
    },
  });
  await prisma.cashRegister.create({
    data: {
      reference: await ref("cashRegister"),
      storeId: storePrincipal.id,
      name: "Caisse 2",
      number: "C2",
    },
  });
  await prisma.cashRegister.create({
    data: {
      reference: await ref("cashRegister"),
      storeId: storeSecondaire.id,
      name: "Caisse Thies",
      number: "C1",
    },
  });

  console.log("Seed termine.");
  console.log("Comptes de demonstration :");
  console.log("  admin@kawsara.com / Admin123! (ADMIN)");
  console.log("  gerant@kawsara.com / Kawsara123! (GERANT)");
  console.log("  caissier@kawsara.com / Kawsara123! (CAISSIER)");
  console.log("  magasinier@kawsara.com / Kawsara123! (MAGASINIER)");
  console.log("  comptable@kawsara.com / Kawsara123! (COMPTABLE)");
  console.log("  vendeur@kawsara.com / Kawsara123! (VENDEUR)");
  console.log("  client@kawsara.com / Client123! (CLIENT)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
