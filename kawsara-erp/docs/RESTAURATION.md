# Sauvegardes et restauration — Kawsara ERP

Reference le cahier des charges section 46.

## 1. Environnement local (SQLite)

### Sauvegarder

```bash
npm run backup
```

Copie `prisma/dev.db` vers `backups/dev-<horodatage>.db`. Le dossier `backups/` n'est pas suivi
par git (`.gitignore`).

### Restaurer

```bash
cp backups/dev-2026-09-17T10-00-00-000Z.db prisma/dev.db
npm run db:generate
```

Puis relancer `npm run dev`.

## 2. Production (Docker + PostgreSQL)

### Sauvegarder

```bash
./scripts/backup-postgres.sh
```

Produit un dump compresse `backups/kawsara-postgres-<horodatage>.sql.gz` via `pg_dump` dans le
conteneur `db`.

### Planifier des sauvegardes automatiques

- **Linux / serveur avec cron** : ajouter au crontab (exemple : tous les jours a 2h du matin,
  conserver les sauvegardes hebdomadaires et mensuelles via un second job qui copie le fichier du
  dimanche/1er du mois vers un dossier separe) :

  ```cron
  0 2 * * * cd /chemin/vers/kawsara-erp && ./scripts/backup-postgres.sh >> backups/backup.log 2>&1
  ```

- **Windows (Planificateur de taches)** : creer une tache declenchee quotidiennement qui execute
  `wsl ./scripts/backup-postgres.sh` (ou un script `.ps1` equivalent appelant `docker compose exec`).

Conserver les sauvegardes sur un stockage **separe** du serveur applicatif (autre disque, bucket
S3/Backblaze, etc.) pour survivre a une panne materielle complete.

### Restaurer

```bash
gunzip -c backups/kawsara-postgres-2026-09-17T02-00-00.sql.gz | docker compose exec -T db psql -U kawsara -d kawsara_erp
```

**Attention** : ceci remplace les donnees existantes de la base cible. Restaurer d'abord sur un
environnement de test pour verifier l'integrite de la sauvegarde avant toute restauration en
production.

### Tester regulierement la restauration

Une sauvegarde jamais testee n'est pas une sauvegarde fiable. Procedure recommandee (mensuelle) :

1. Restaurer la derniere sauvegarde sur une base PostgreSQL temporaire
   (`docker compose -f docker-compose.yml run --rm db` avec un volume different).
2. Verifier que les tables cles contiennent des donnees coherentes (nombre de factures, de
   produits, dates recentes).
3. Documenter la date du test et le resultat.
