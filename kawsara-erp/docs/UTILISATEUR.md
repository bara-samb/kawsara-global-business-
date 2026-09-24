# Guide utilisateur — Kawsara ERP

## Boutique en ligne (clients)

Les clients commandent **sans creer de compte** et ne voient aucun lien de connexion.

1. **Parcourir le catalogue** : `/catalogue`, produits groupes par categorie, recherche par nom.
2. **Ajouter au panier** : depuis le catalogue ou la fiche produit. Le panier est conserve dans le
   navigateur (persiste entre les visites, propre a chaque appareil).
3. **Commander** : `/panier` puis "Passer la commande" — renseigner nom, telephone, adresse de
   livraison et mode de paiement. Une reference de commande est affichee a la fin.
4. Le suivi se fait par telephone avec la boutique (commande traitee dans l'ERP).

## Espace gestion (ERP)

Connexion sur **`/gestion`** avec un compte du personnel (voir tableau des roles ci-dessous).
Cette adresse n'apparait nulle part sur la boutique : communiquez-la uniquement au personnel.
Les comptes clients ne peuvent pas s'y connecter.

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
