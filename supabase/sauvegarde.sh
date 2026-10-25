#!/bin/bash
# Sauvegarde complète des données (schéma public) dans un fichier daté. À faire AU MOINS une fois par mois avec l'offre gratuite
# de Supabase, qui ne fait pas de sauvegarde automatique.
# Usage : DATABASE_URL='postgresql://postgres:MOT_DE_PASSE@db.xxxx.supabase.co:5432/postgres' ./supabase/sauvegarde.sh
# (Supabase → bouton « Connect » → « Direct connection » ; remplacez [YOUR-PASSWORD] par le mot de passe de la base.)
# Le fichier contient des données personnelles et les mots de passe chiffrés : gardez-le hors du dépôt, dans un endroit privé.
set -eu
: "${DATABASE_URL:?Définissez DATABASE_URL (voir le début du script)}"
DOSSIER="${DOSSIER:-sauvegardes}"
mkdir -p "$DOSSIER"
FICHIER="$DOSSIER/afmey-$(date +%Y-%m-%d_%Hh%M).sql"
pg_dump "$DATABASE_URL" --schema=public --no-owner --no-privileges --file="$FICHIER"
chmod 600 "$FICHIER"
TAILLE=$(du -h "$FICHIER" | cut -f1)
TABLES=$(grep -c "^COPY " "$FICHIER" || true)
echo "Sauvegarde écrite : $FICHIER ($TAILLE)"
echo "Vérification : $TABLES tables de données exportées."
