#!/bin/bash
# Test automatique des migrations et de la sécurité sur une base PostgreSQL locale jetable.
# Usage : PGBIN=/usr/lib/postgresql/17/bin ./supabase/tests/securite.sh
# Rejoue toute la chaîne de scripts sur une base vierge (simulant Supabase), ferme la base, puis vérifie
# ce que chaque rôle peut ou ne peut pas faire. Sortie 0 = tout est conforme.
set -u
PGBIN=${PGBIN:-/usr/lib/postgresql/17/bin}
export PATH="$PGBIN:$PATH" PGHOST=127.0.0.1 PGPORT=${PGPORT:-55499} PGUSER=postgres
ICI="$(cd "$(dirname "$0")" && pwd)"; SQL="$ICI/.."
TMP=$(mktemp -d); trap 'pg_ctl -D "$TMP/data" stop >/dev/null 2>&1; rm -rf "$TMP"' EXIT
initdb -D "$TMP/data" -U postgres --auth=trust >/dev/null 2>&1 || { echo "initdb impossible (PGBIN ?)"; exit 2; }
pg_ctl -D "$TMP/data" -o "-p $PGPORT -c unix_socket_directories='' -c listen_addresses=127.0.0.1" -l "$TMP/log" start >/dev/null 2>&1; sleep 2
psql -q -c "create database t" postgres >/dev/null
psql -d t -q -f "$ICI/00-simule-supabase.sql" >/dev/null 2>&1

for f in schema update-base update-reunions update-tontine update-distribution-interets update-mon-espace update-rapports update-parametres update-statuts; do
  erreurs=$(psql -d t -q -f "$SQL/$f.sql" 2>&1 | grep -E "ERROR|FATAL")
  [ -n "$erreurs" ] && { echo "ÉCHEC migration $f.sql : $erreurs"; exit 1; }
done
sed "s/COLLER_ICI_LE_JWT_SECRET/secret-de-test-0123456789abcdef0123456789abcdef/" "$SQL/update-securite-1-jeton.sql" | psql -d t -q >/dev/null 2>&1
A=11111111-1111-1111-1111-111111111111; T=22222222-2222-2222-2222-222222222222; M=33333333-3333-3333-3333-333333333333; C=aaaaaaaa-0000-0000-0000-000000000001
psql -d t -q >/dev/null <<EOS
INSERT INTO users (id, nom, prenom, telephone, role, actif, password_hash) VALUES
 ('$A','Admin','Ada','+1','admin',true,'x'),('$T','Tres','Tina','+2','tresoriere',true,'x'),('$M','Memb','Mina','+3','membre',true,'x');
INSERT INTO caisses (id, nom, type, solde, actif) VALUES ('$C','Epargne test','epargne',0,true);
INSERT INTO mouvements (id, type, montant, caisse_id, membre_id, statut) VALUES ('cccccccc-0000-0000-0000-000000000001','epargne',5000,'$C','$M','en_attente');
EOS
psql -d t -q -f "$SQL/update-securite-2-verrouillage.sql" >/dev/null 2>&1

echec=0; total=0
# verifier "titre" attendu(ok|refuse) role uid "sql"
verifier() {
  local sortie; sortie=$(psql -d t -At -c "BEGIN" -c "SET LOCAL ROLE $3" -c "SELECT set_config('request.jwt.claims', '{\"sub\":\"$4\"}', true)" -c "$5" -c "ROLLBACK" 2>&1)
  local refus=0; echo "$sortie" | grep -qE "ERROR|permission denied|row-level security" && refus=1
  # UPDATE/DELETE filtrés par RLS : « UPDATE 0 » compte aussi comme refus
  echo "$sortie" | grep -qE "^(UPDATE|DELETE) 0$" && refus=1
  total=$((total+1))
  if { [ "$2" = ok ] && [ $refus = 0 ]; } || { [ "$2" = refuse ] && [ $refus = 1 ]; }; then echo "  ✓ $1"; else echo "  ✗ $1 (attendu : $2)"; echo "$sortie" | head -2 | sed 's/^/      /'; echec=$((echec+1)); fi
}

echo "Anonyme"
verifier "ne lit pas les membres"        refuse anon "" "select count(*) from users"
verifier "ne modifie pas les caisses"    refuse anon "" "update caisses set solde=1"
verifier "n'appelle pas les fonctions"   refuse anon "" "select situation_membre('$M')"
verifier "peut tenter une connexion"     ok     anon "" "select auth_login('+3','mauvais')"
echo "Membre ordinaire"
verifier "lit les caisses"               ok     authenticated $M "select count(*) from caisses"
verifier "ne lit pas les mots de passe"  refuse authenticated $M "select password_hash from users"
verifier "ne se promeut pas"             refuse authenticated $M "update users set role='admin' where id='$M'"
verifier "ne crée pas de mouvement"      refuse authenticated $M "insert into mouvements(type,montant,caisse_id,statut) values ('epargne',1,'$C','valide')"
verifier "ne modifie pas un solde"       refuse authenticated $M "update caisses set solde=999"
verifier "ne change pas un rôle (usurpation)" refuse authenticated $M "select modifier_role('$A','$M','admin')"
verifier "ne valide pas (usurpation)"    refuse authenticated $M "select valider_mouvement('cccccccc-0000-0000-0000-000000000001','$A')"
verifier "voit sa propre situation"      ok     authenticated $M "select situation_membre('$M')"
verifier "ne voit pas celle d'une autre" refuse authenticated $M "select situation_membre('$T')"
verifier "n'a pas accès aux rapports"    refuse authenticated $M "select rapport_financier(current_date-30, current_date)"
verifier "demande un prêt pour elle"     ok     authenticated $M "insert into prets(membre_id,montant,montant_restant,motif,date_echeance) values ('$M',1000,1000,'t',now()+interval '30 days')"
verifier "pas de prêt au nom d'une autre" refuse authenticated $M "insert into prets(membre_id,montant,montant_restant,motif,date_echeance) values ('$T',1000,1000,'t',now()+interval '30 days')"
echo "Trésorière"
verifier "saisit un mouvement"           ok     authenticated $T "insert into mouvements(type,montant,caisse_id,statut) values ('epargne',1,'$C','en_attente')"
verifier "ne valide pas"                 refuse authenticated $T "select valider_mouvement('cccccccc-0000-0000-0000-000000000001','$T')"
verifier "lit le rapport financier"      ok     authenticated $T "select rapport_financier(current_date-30, current_date)"
echo "Administratrice"
verifier "valide un mouvement"           ok     authenticated $A "select valider_mouvement('cccccccc-0000-0000-0000-000000000001','$A')"
verifier "lit le journal de connexions"  ok     authenticated $A "select count(*) from journal_connexions"
verifier "lit la situation d'une membre" ok     authenticated $A "select situation_membre('$M')"

echo; echo "$((total-echec))/$total vérifications conformes"
[ $echec = 0 ]
