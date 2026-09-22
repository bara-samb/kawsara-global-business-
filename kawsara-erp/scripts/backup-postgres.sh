#!/bin/sh
# Sauvegarde de la base PostgreSQL de production (conteneur Docker "db").
# Usage : ./scripts/backup-postgres.sh
# A programmer via cron / Planificateur de taches Windows pour des sauvegardes
# quotidiennes/hebdomadaires/mensuelles (cahier des charges section 46).
set -e

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
DEST="$BACKUP_DIR/kawsara-postgres-$TIMESTAMP.sql.gz"

docker compose exec -T db pg_dump -U kawsara kawsara_erp | gzip > "$DEST"

echo "Sauvegarde creee : $DEST"
