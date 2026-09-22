# Documentation "API" — Kawsara ERP

## Choix d'architecture

Le cahier des charges (section 4) autorise un backend Next.js "si le developpeur justifie ce
choix". Ce projet utilise les **Server Actions** de Next.js (App Router) comme mecanisme
principal d'ecriture/lecture cote serveur, plutot qu'une API REST separee (NestJS) :

- Le frontend ne peut jamais acceder directement a la base de donnees (section 3) : chaque Server
  Action s'execute exclusivement cote serveur, importe `@/lib/prisma` et verifie les permissions
  via `requirePermission()` avant toute operation — la meme garantie qu'un controleur d'API REST.
- Chaque action est un point d'entree individuel, type de bout en bout (TypeScript), sans couche
  de serialisation JSON manuelle a maintenir.
- Les quelques besoins de type "route HTTP classique" (export CSV, NextAuth) restent des Route
  Handlers standards (`route.ts`), documentes plus bas.

Ce choix est documente ici conformement a la demande du cahier des charges ; il peut etre revu
(migration vers NestJS + API REST) si le projet a besoin d'exposer ces operations a des clients
externes (application mobile tierce, integration partenaire, etc.).

## Route Handlers (URLs HTTP classiques)

| Route | Methode | Description |
| --- | --- | --- |
| `/api/auth/*` | GET/POST | NextAuth (connexion, deconnexion, session, CSRF) |
| `/erp/rapports/export/ventes` | GET | Export CSV des ventes sur la periode (permission `report.view`) |
| `/erp/rapports/export/produits` | GET | Export CSV des produits vendus |
| `/erp/rapports/export/clients` | GET | Export CSV des clients |
| `/erp/rapports/export/stock` | GET | Export CSV du stock bas |

## Server Actions par domaine

Chaque fichier est dans `src/lib/actions/`. Toutes verifient la permission necessaire via
`requirePermission()` (`src/lib/require-permission.ts`) avant d'ecrire en base.

| Domaine | Fichier | Actions principales |
| --- | --- | --- |
| Produits | `products.ts` | `createProduct`, `updateProduct`, `toggleProductActive` |
| Categories | `categories.ts` | `createCategory`, `deleteCategory` |
| Clients | `customers.ts` | `createCustomer`, `updateCustomer` |
| Fournisseurs | `suppliers.ts` | creation/mise a jour fournisseur |
| Boutiques / stock | `stores.ts` | `createStore`, `adjustStock` |
| Ventes | `sales.ts` | `createSale` (bloque si stock insuffisant) |
| Debits | `debits.ts` | `createDebit` (reservation), `transformDebitToInvoice`, `cancelDebit` |
| Dettes clients | `debts.ts` | `settleDebt` (reglement partiel/total) |
| Factures | `invoices.ts` | `addInvoicePayment` |
| Caisses | `cash.ts` | ouverture/fermeture de session, mouvements |
| Commandes fournisseurs | `supplier-orders.ts` | `createSupplierOrder`, reception |
| Commandes en ligne | `ecommerce.ts` | `createEcommerceOrder` (public), `assignEcommerceOrderStore`, `confirmEcommerceOrder`, `startPreparationEcommerceOrder`, `markDeliveredEcommerceOrder`, `cancelEcommerceOrder` |
| Comptes utilisateurs (personnel) | `users.ts` | `createStaffUser`, `toggleUserActive` |
| Compte client | `account.ts` | `updateOwnProfile` (uniquement son propre profil) |
| Inscription | `auth-register.ts` | `registerCustomer` (CAPTCHA obligatoire) |
| Double authentification | `two-factor.ts` | `generateTwoFactorSecret`, `confirmTwoFactor`, `disableTwoFactor` |
| Notifications | `notifications.ts` | `markNotificationRead`, `markAllNotificationsRead` |

## Regles communes a toutes les actions d'ecriture

1. `requirePermission("<ressource>.<action>")` en premiere ligne.
2. Les operations touchant le stock, les paiements ou les factures s'executent dans une
   transaction Prisma (`prisma.$transaction`), pour garantir la coherence (section 51).
3. Une `AuditLog` est creee pour toute operation sensible.
4. `revalidatePath()` rafraichit les pages ERP concernees apres ecriture.
