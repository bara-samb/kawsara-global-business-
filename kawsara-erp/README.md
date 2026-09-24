# Kawsara Global Business — Plateforme ERP + E-commerce

Application de gestion commerciale (type Sage - Gestion Commerciale) et boutique en ligne
pour **Kawsara Global Business**, basee sur le cahier des charges fourni.

> Ce projet est fait pour tourner **en local sur votre ordinateur pendant le developpement**.
> Vous n'avez **pas besoin de deployer sur Vercel** pour le voir ou le tester : suivez les
> etapes ci-dessous et ouvrez simplement votre navigateur sur `http://localhost:3000`.

## 1. Demarrer le projet en local (voir le resultat)

Dans un terminal, a la racine du projet (`kawsara-erp`) :

```bash
npm install          # une seule fois (deja fait si vous lisez ceci apres le scaffolding)
npm run db:push       # cree la base de donnees locale (SQLite) a partir du schema
npm run db:seed       # ajoute des donnees de demonstration (produits, comptes, etc.)
npm run dev            # lance le serveur de developpement
```

Puis ouvrez **http://localhost:3000** dans votre navigateur.

- Le **portail public** (boutique en ligne) est sur `/`.
- L'**espace de gestion (ERP)** est sur `/erp` (necessite une connexion).
- La page de **connexion du personnel** est sur `/gestion` (aucun lien depuis la boutique).

Rien de tout cela n'est envoye sur Internet : tout tourne sur votre machine, dans une base
de donnees SQLite locale (`prisma/dev.db`).

### Comptes de demonstration (crees par `npm run db:seed`)

| Role | Email | Mot de passe |
| --- | --- | --- |
| Administrateur | admin@kawsara.com | Admin123! |
| Gerant | gerant@kawsara.com | Kawsara123! |
| Caissier | caissier@kawsara.com | Kawsara123! |
| Magasinier | magasinier@kawsara.com | Kawsara123! |
| Comptable | comptable@kawsara.com | Kawsara123! |
| Vendeur | vendeur@kawsara.com | Kawsara123! |
| Client (boutique en ligne) | client@kawsara.com | Client123! |

## 2. Quand deployer ?

Le deploiement (Vercel ou autre) n'est utile que lorsque vous voulez rendre le site
accessible sur Internet a d'autres personnes. Ce n'est **pas necessaire** pour developper,
visualiser ou tester l'application : faites cela en local avec `npm run dev` d'abord.
On en reparlera une fois que vous serez satisfait du resultat en local.

## 3. Etat d'avancement par rapport au cahier des charges

Le cahier des charges (`Cahier_des_charges_ERP_Ecommerce_Securise.pdf`) definit un
perimetre tres large (60+ exigences, 9 phases). Voici ce qui est deja en place et ce qui
reste a construire.

### Deja en place

- Architecture Next.js 16 (App Router) : le frontend et le backend (Server Actions / routes
  API) sont dans la meme application ; **le navigateur n'accede jamais directement a la base
  de donnees**, uniquement via le serveur.
- Modele de donnees complet (Prisma / `prisma/schema.prisma`) couvrant : utilisateurs et
  roles, boutiques, produits/categories, stock et mouvements de stock, clients, dettes et
  reglements, fournisseurs et commandes fournisseurs, ventes, debits, factures, paiements,
  caisses, commandes e-commerce, notifications, journal d'audit et evenements de securite.
- Authentification (NextAuth / Auth.js) avec mots de passe haches (bcrypt), verrouillage du
  compte apres 5 echecs, et journalisation des tentatives de connexion.
- RBAC (controle d'acces par role) verifie cote serveur (`src/lib/permissions.ts`), avec les
  7 roles : Administrateur, Gerant, Caissier, Magasinier, Comptable, Vendeur (limite aux
  debits et factures), Client.
- Portail public (page d'accueil, branding Kawsara Global Business avec les couleurs du
  logo) et espace ERP avec menu adapte au role connecte.
- Generateur de references uniques (`PRD-2026-000001`, `FAC-2026-000001`, etc.).
- Catalogue de demonstration type quincaillerie (ciment, fer a beton, outillage, peinture,
  plomberie, electricite) reparti sur 2 depots, avec seuils de stock bas pour demontrer
  l'alerte de rupture (produits, tableau de bord, page Stock).
- Clients : recherche par reference ou nom, historique d'achats par jour/semaine/mois.
- Ventes comptant (`/erp/ventes`) et debits/ventes a credit (`/erp/debits`) avec
  transformation d'un debit en facture (paiement immediat ou creance client).
- Factures personnalisees et imprimables (`/erp/factures`) avec reglement multi-mode
  (Caisse 1, Caisse 2, Wave, Orange Money, Banque, Cheque).
- Caisses (`/erp/caisses`) : ouverture/fermeture de session avec calcul du solde theorique.
- Commandes fournisseurs (`/erp/commandes-fournisseurs`) : creation et reception
  (partielle ou totale) qui met a jour le stock du depot.
- Depots &amp; stock (`/erp/stock`) : creation de depots, vue du stock par depot, ajustement
  manuel (inventaire/correction).
- Dettes clients (`/erp/dettes`) : suivi des creances, encaissement partiel/total relie a une
  caisse ou un mode de paiement.
- Utilisateurs (`/erp/utilisateurs`) : creation des comptes du personnel, activation/desactivation.
- Centre de securite (`/erp/securite`) : historique des tentatives de connexion et journal d'audit.
- Catalogue public (`/catalogue`, produits groupes par categorie avec visuel), fiche produit,
  panier (`/panier`, persiste dans le navigateur), tunnel de commande (`/commande`) relie au
  stock reel (reservation automatique du depot ayant assez de stock).
- Commande sans compte client : les clients ne se connectent jamais (l'ancienne inscription
  `/inscription` et l'espace client `/compte` sont fermes et redirigent vers le catalogue).
- Traitement des commandes en ligne (`/erp/commandes-en-ligne`) : assignation de depot,
  confirmation, preparation (sortie de stock), livraison (facture + encaissement), annulation
  (liberation ou retour de stock).
- Rapports &amp; statistiques (`/erp/rapports`) : chiffre d'affaires par jour (graphique), marge,
  panier moyen, top produits/clients, produits dormants, clients a risque, alertes de stock bas,
  export CSV et impression (PDF via le navigateur).
- Notifications (`/erp/notifications`) : nouvelle commande en ligne, stock bas/rupture, facture
  soldee, dette soldee, compte verrouille — visibles aussi depuis la cloche du menu ERP.
- Securite avancee : CAPTCHA maison sur la connexion, limitation de debit (rate
  limiting) anti brute-force, double authentification (2FA/TOTP) optionnelle par compte
  (`/erp/securite/2fa`), en-tetes de securite HTTP (CSP, X-Frame-Options, HSTS...). Voir
  `docs/SECURITE.md`.
- Tests automatises (`npm test`, Vitest) : RBAC, CAPTCHA, 2FA, references, et surtout les regles
  metier critiques (blocage de vente si stock insuffisant, un debit ne diminue jamais le stock
  physique, aucune double vente possible sur une commande en ligne simultanee).
- Image Docker de production avec PostgreSQL (`Dockerfile`, `docker-compose.yml`). Voir
  `docs/DEPLOIEMENT.md`.

### En cours de construction (prochaines etapes)

- CAPTCHA tiers (hCaptcha/reCAPTCHA) si un niveau de protection anti-bot superieur est requis
  (necessite des cles d'API que ce projet n'a pas).
- Generation automatique de commande fournisseur a partir d'une rupture de stock (section 20) :
  aujourd'hui la creation de commande fournisseur reste manuelle.
- CSP stricte a base de nonces (actuellement `'unsafe-inline'` pour les scripts, voir
  `docs/SECURITE.md`).

## 4. Base de donnees : SQLite en local, PostgreSQL en production

Le developpement local utilise SQLite (`prisma/dev.db`), sans dependance a Docker. Pour la
production, une image Docker bascule automatiquement sur PostgreSQL au moment du build — voir
`docs/DEPLOIEMENT.md` pour la procedure complete (`docker compose up`).

## 5. Tests automatises

```bash
npm test
```

Execute la suite Vitest (`tests/unit` et `tests/integration`) sur une base SQLite dediee
(`prisma/test.db`, jamais `dev.db`). Voir le detail des scenarios couverts dans les fichiers de
`tests/`.

## 6. Stack technique

- **Frontend/Backend** : Next.js 16 (App Router, Server Actions, Turbopack), TypeScript,
  Tailwind CSS v4.
- **Base de donnees** : Prisma ORM, SQLite en local / PostgreSQL en production (Docker).
- **Authentification** : NextAuth (Auth.js) v5, sessions JWT, 2FA TOTP maison, CAPTCHA maison.
- **Etat client** : Zustand (panier, etc.).
- **Graphiques** : Recharts.
- **Tests** : Vitest.

## 7. Documentation complementaire

- `docs/SECURITE.md` — mesures de securite implementees et limites connues.
- `docs/DEPLOIEMENT.md` — deploiement Docker + PostgreSQL, variables d'environnement, TLS.
- `docs/RESTAURATION.md` — sauvegardes et procedure de restauration.
- `docs/UTILISATEUR.md` — guide d'utilisation par role.
- `docs/API.md` — organisation des Server Actions et routes HTTP.

## 8. Structure du projet

```
prisma/schema.prisma     Modele de donnees complet
prisma/seed.mjs           Donnees de demonstration
src/lib/auth.ts           Configuration NextAuth + regles d'autorisation + 2FA
src/lib/permissions.ts    Matrice RBAC (roles -> permissions)
src/lib/reference.ts      Generateur de references uniques
src/lib/captcha.ts        CAPTCHA maison (defi signe HMAC, sans etat serveur)
src/lib/totp.ts           2FA TOTP (RFC 6238), sans dependance externe
src/lib/notify.ts         Notifications metier
src/proxy.ts              Protection des routes /erp et /compte + rate limiting
src/app/page.tsx           Page d'accueil du portail public (boutique)
src/app/gestion           Page de connexion du personnel
src/app/erp               Espace de gestion commerciale
src/components/site        Composants du portail public (en-tete, pied de page)
tests/                     Suite de tests automatises (Vitest)
Dockerfile, docker-compose.yml   Image de production (PostgreSQL)
docs/                      Documentation securite / deploiement / restauration / utilisateur / API
```
