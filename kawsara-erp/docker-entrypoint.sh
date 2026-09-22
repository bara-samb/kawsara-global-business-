#!/bin/sh
set -e

# Applique le schema Prisma sur PostgreSQL au demarrage du conteneur (idempotent : ne fait rien
# si le schema est deja a jour). Volontairement SANS --accept-data-loss : si un changement de
# schema serait destructif, le demarrage doit echouer plutot que supprimer des donnees en silence.
# Pas de seed automatique ici : les comptes de demonstration (mots de passe connus) ne doivent
# jamais etre crees automatiquement en production.
echo "Synchronisation du schema Prisma avec la base de donnees..."
npx prisma db push --skip-generate

exec "$@"
