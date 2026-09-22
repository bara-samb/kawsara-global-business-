# Guide de deploiement — Kawsara ERP

## 1. Developpement local (SQLite, sans Docker)

Voir le `README.md` a la racine du projet : `npm install`, `npm run db:push`,
`npm run db:seed`, `npm run dev`.

## 2. Production avec Docker + PostgreSQL

Ce depot fournit une image Docker de production qui bascule automatiquement le schema Prisma sur
PostgreSQL au moment du build (le developpement local reste sur SQLite, voir
`scripts/docker-use-postgres-schema.mjs`).

### Prerequis

- Docker et Docker Compose installes.
- Un nom de domaine et un reverse proxy TLS (nginx, Caddy, Traefik...) si l'application doit etre
  exposee sur Internet : ce projet ne fournit pas de certificat TLS lui-meme.

### Etapes

1. Copier le fichier d'exemple et renseigner de vraies valeurs :

   ```bash
   cp .env.docker.example .env.docker
   # Editer .env.docker : POSTGRES_PASSWORD, AUTH_SECRET (openssl rand -base64 32), NEXTAUTH_URL
   ```

   **Ne jamais reutiliser les secrets de `.env` (developpement) en production.**

2. Construire et demarrer :

   ```bash
   docker compose --env-file .env.docker up --build -d
   ```

   Au demarrage, le conteneur `app` applique automatiquement le schema Prisma sur PostgreSQL
   (`docker-entrypoint.sh`). Aucune donnee de demonstration n'est creee automatiquement.

3. Creer le premier compte administrateur. Deux options :
   - Executer un script d'initialisation ponctuel dans le conteneur (a adapter du
     `prisma/seed.mjs` existant, en changeant les mots de passe par defaut) ;
   - Ou inserer directement un utilisateur `ADMIN` via `docker compose exec app npx prisma studio`
     (accessible uniquement en local via un tunnel, a ne pas exposer publiquement).

4. Verifier que l'application repond : `http://localhost:3000` (ou le domaine configure derriere
   le reverse proxy).

### Mise a jour de l'application

```bash
git pull
docker compose --env-file .env.docker up --build -d
```

Le schema Prisma est resynchronise automatiquement au demarrage (`prisma db push`, sans
`--accept-data-loss` : si un changement casserait des donnees existantes, le conteneur refuse de
demarrer plutot que de supprimer des donnees silencieusement — voir `docs/SECURITE.md`).

### Sauvegardes

Voir `docs/RESTAURATION.md`.

## 3. Variables d'environnement (production)

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | URL de connexion PostgreSQL (fournie automatiquement par `docker-compose.yml`) |
| `AUTH_SECRET` | Cle de signature des sessions. Generer avec `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | URL publique de l'application (ex. `https://erp.kawsaraglobalbusiness.com`) |

## 4. Reverse proxy TLS (exemple minimal Caddy)

```
erp.exemple.com {
  reverse_proxy localhost:3000
}
```

Caddy obtient et renouvelle automatiquement un certificat Let's Encrypt.
