# Documentation de securite — Kawsara ERP

Reference le cahier des charges (sections 36 a 48). Decrit les mesures effectivement
implementees dans ce projet, leurs limites connues, et ce qui reste a faire pour un usage en
production a grande echelle.

## 1. Authentification

- Mots de passe haches avec bcrypt (`bcryptjs`, cout 10).
- Blocage apres 5 echecs par couple email + adresse IP (15 minutes) : un attaquant se bloque
  lui-meme sans bloquer le vrai titulaire du compte. Verrouillage global du compte seulement a
  20 echecs (attaque depuis plusieurs adresses), avec notification aux administrateurs
  (`src/lib/auth.ts`, `src/lib/rate-limit.ts`).
- L'adresse IP est lue sur la derniere valeur de `X-Forwarded-For` (celle du reverse proxy), la
  premiere etant falsifiable par le client.
- Sessions JWT signees (NextAuth / Auth.js v5), cookies `HttpOnly` par defaut.
- Double authentification (2FA) TOTP (RFC 6238) optionnelle par utilisateur, activable depuis
  `/erp/securite/2fa`. Implementee sans dependance externe (`src/lib/totp.ts`), compatible avec
  Google Authenticator, Microsoft Authenticator, Authy, etc. Un code deja utilise est refuse
  (anti-rejeu, `User.twoFactorLastCounter`). Le secret 2FA est chiffre en base (AES-256-GCM,
  cle derivee de `AUTH_SECRET`, `src/lib/secret-box.ts`) : **changer `AUTH_SECRET` oblige les
  utilisateurs a reconfigurer leur 2FA**.
- Journal des evenements de securite (`SecurityEvent`) : connexions echouees, comptes bloques,
  codes 2FA invalides.

- A chaque requete, le compte est relu en base (callback `jwt`) : un compte desactive est
  deconnecte immediatement, un changement de role ou de boutique s'applique sans reconnexion.

## 2. Autorisation (RBAC)

- Matrice de permissions centralisee dans `src/lib/permissions.ts`, verifiee **cote serveur
  uniquement** via `requirePermission()` dans chaque Server Action et route sensible
  (`src/lib/require-permission.ts`). Une tentative refusee est journalisee (`AuditLog`,
  action `ACCESS_DENIED`).
- Un role n'a jamais acces qu'aux operations listees dans `PERMISSIONS[role]` ; masquer un bouton
  cote client n'est jamais la seule protection.
- Chaque page ERP verifie aussi sa permission de lecture (`requirePagePermission`) : taper une URL
  a la main ne permet pas de voir des donnees hors de son role (redirection vers
  `/erp/acces-refuse`, tentative journalisee).
- **Actions dangereuses reservees a l'admin principal** (`PRINCIPAL_ADMIN_ONLY`) : suppressions,
  annulations, ajustement manuel du stock, gestion des comptes, vente sous le prix d'achat. Le
  statut d'admin principal (`User.isPrincipalAdmin`, un seul compte) est relu en base a chaque
  appel. Designation : `npm run admin:principal -- <email>`.
- Cloisonnement par boutique : un employe rattache a une boutique ne peut vendre, encaisser,
  ouvrir/fermer une caisse ou traiter une commande que pour sa boutique (`assertStoreAccess`).
  Un encaissement en especes doit viser une caisse ouverte de sa boutique.
- Prix : les prix negocies sont libres, mais vendre sous le prix d'achat (par article ou au
  total apres remise) est reserve a l'admin principal et journalise (`CREATE_BELOW_COST`).
- Isolation des donnees client : chaque page consultant une commande ou une facture d'un client
  verifie explicitement que la ressource appartient a l'utilisateur connecte avant de l'afficher
  (`/compte/commandes/[id]`, `/compte/factures/[id]`), sinon renvoie une 404 (jamais un message
  qui confirmerait l'existence de la ressource pour un autre client).

## 3. Protection anti-bot / anti-brute-force

- Connexion reservee au personnel sur `/gestion` (aucun lien depuis la boutique, page non indexee
  par les moteurs de recherche). Un compte de role CLIENT est refuse a la connexion. Les anciennes
  adresses `/connexion`, `/inscription` et `/compte` sont fermees au niveau du proxy.
- CAPTCHA maison (defi mathematique signe par HMAC-SHA256, sans etat serveur ni service tiers)
  sur le formulaire de connexion (`src/lib/captcha.ts`).
- Limitation de debit (rate limiting) en memoire sur `/api/auth/callback/credentials` et
  `/gestion` : 15 tentatives par minute et par IP (`src/proxy.ts`). Adaptee a une instance
  unique ; pour plusieurs instances en production, remplacer par un compteur partage (Redis).
- Un CAPTCHA resolu ne peut etre utilise qu'une fois (anti-rejeu).
- Commande en ligne (avec ou sans compte) : 5 commandes par 10 minutes par compte ou par IP,
  100 unites maximum par article, 50 articles maximum, 3 commandes en attente maximum par
  numero de telephone. Empeche de bloquer tout le stock avec de fausses commandes.
- Exports CSV : les valeurs commencant par `=`, `+`, `-`, `@` sont neutralisees (injection de
  formules Excel).

## 4. En-tetes de securite HTTP

Definis globalement dans `next.config.ts` (`headers()`) :

| En-tete | Valeur | Objectif |
| --- | --- | --- |
| `X-Frame-Options` | `DENY` | anti-clickjacking |
| `X-Content-Type-Options` | `nosniff` | anti-MIME-sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | limite les fuites d'URL |
| `Permissions-Policy` | camera/microphone/geolocalisation desactives | reduction de surface |
| `Strict-Transport-Security` | 2 ans, sous-domaines inclus | force HTTPS (a activer derriere un reverse proxy TLS) |
| `Content-Security-Policy` | voir `next.config.ts` | limite les sources de script/style/image |

**Limite connue** : la CSP autorise `'unsafe-inline'` pour les scripts, necessaire car Next.js
insere des donnees dans des balises `<script>` inline sans nonce dans cette configuration. Une
CSP stricte avec nonces demanderait de generer un nonce par requete dans le middleware et de le
propager a Next (fonctionnalite plus recente de Next.js), ce qui n'a pas ete fait ici.

## 5. Journal d'audit

- Table `AuditLog` : toute creation, modification, annulation, connexion, refus d'acces,
  activation/desactivation de compte, activation/desactivation de la 2FA est journalisee avec
  l'utilisateur, l'action et l'entite concernee.
- Consultable par les roles autorises sur `/erp/securite`, filtrable par utilisateur.
- Une commande passee sans compte est journalisee sans utilisateur (`userId` vide), avec le nom,
  le telephone et l'IP du client : jamais attribuee a un employe.

## 6. Protection des donnees en transit et au repos

- En local : SQLite (fichier), pas de trafic reseau.
- En production (Docker/PostgreSQL) : le HTTPS/TLS doit etre termine par un reverse proxy
  (nginx, Traefik, Caddy...) place devant le conteneur `app` ; ce depot ne fournit pas de
  certificat TLS lui-meme (voir `docs/DEPLOIEMENT.md`).
- Les secrets (`AUTH_SECRET`, mot de passe PostgreSQL) sont fournis par variables d'environnement,
  jamais codes en dur, jamais commit (`.env*` est dans `.gitignore`).

## 7. Ce qui reste hors perimetre de cette implementation

- CAPTCHA tiers (hCaptcha/reCAPTCHA) : necessiterait des cles d'API que ce projet n'a pas ; le
  CAPTCHA maison actuel offre une protection basique contre les robots simples, pas contre des
  attaques ciblees sophistiquees.
- Detection d'activite utilisateur "inhabituelle" par apprentissage/heuristique avancee (section
  34) : seules des alertes simples (comptes verrouilles, stock bas) sont implementees.
- Chiffrement au niveau applicatif des donnees sensibles en base (au-dela du hachage des mots de
  passe) : non implemente, a evaluer selon la sensibilite reelle des donnees stockees.
