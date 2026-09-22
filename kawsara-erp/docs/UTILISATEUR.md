# Guide utilisateur — Kawsara ERP

## Espace client (boutique en ligne)

1. **Parcourir le catalogue** : `/catalogue`, produits groupes par categorie, recherche par nom.
2. **Creer un compte** : `/inscription` (nom, email, telephone, adresse, mot de passe).
3. **Ajouter au panier** : depuis le catalogue ou la fiche produit. Le panier est conserve dans le
   navigateur (persiste entre les visites, propre a chaque appareil).
4. **Commander** : `/panier` puis "Passer la commande" — renseigner l'adresse de livraison, le
   telephone et le mode de paiement.
5. **Suivre ses commandes** : `/compte/commandes` (statut : en attente, confirmee, en
   preparation, livree, annulee).
6. **Consulter ses factures** : `/compte/factures`, generees automatiquement a la livraison.
7. **Modifier son profil** : `/compte/profil`.

## Espace gestion (ERP)

Connexion sur `/connexion` avec un compte du personnel (voir tableau des roles ci-dessous).

| Role | Acces principal |
| --- | --- |
| Administrateur | Tout |
| Gerant | Gestion commerciale complete, rapports, utilisateurs |
| Caissier | Ventes, factures, encaissements, caisse, commandes en ligne |
| Magasinier | Stock, inventaire, commandes fournisseurs, receptions |
| Comptable | Factures, paiements, dettes, rapports financiers |
| Vendeur | Debits (ventes a credit) et factures |

### Cycle de vente comptant

Produits → `/erp/ventes/nouveau` → choisir client (optionnel), produits, mode de paiement →
facture generee et payee immediatement, stock mis a jour.

### Cycle de vente a credit (debit)

`/erp/debits/nouveau` → le stock est **reserve**, pas diminue. Puis, depuis la fiche du debit :
"Transformer en facture" (nouvelle verification du stock, sortie reelle) ou "Annuler" (libere la
reservation).

### Traiter une commande en ligne

`/erp/commandes-en-ligne` → ouvrir la commande → assigner un depot si necessaire → Confirmer →
Debuter la preparation (sortie de stock) → Marquer livree (genere la facture et l'encaissement).

### Gerer les dettes clients

`/erp/dettes` : encaisser un reglement partiel ou total pour chaque dette en cours.

### Rapports

`/erp/rapports` : chiffre d'affaires, marge, top produits/clients, stock bas, produits
dormants, clients a risque. Filtrable par periode et par boutique (selon le role). Export CSV et
impression PDF (bouton "Imprimer" du navigateur).

### Securiser son compte

`/erp/securite/2fa` : activer la double authentification (scanner le QR code avec une application
comme Google Authenticator).

## Comptes de demonstration (environnement local uniquement)

Voir `README.md`. **Ne jamais utiliser ces mots de passe en production.**
