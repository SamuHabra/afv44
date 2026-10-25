#!/bin/bash
# Test des règles métier côté base (situation des membres, prestations Secours, clôture, gel d'exercice, remise à neuf)
# sur une base PostgreSQL locale jetable. Les fonctions sont appelées en administrateur de la base : la sécurité par rôle
# est vérifiée à part par securite.sh.
# Usage : PGBIN=/usr/lib/postgresql/17/bin ./supabase/tests/metier.sh        Sortie 0 = tout est conforme.
set -u
PGBIN=${PGBIN:-/usr/lib/postgresql/17/bin}
export PATH="$PGBIN:$PATH" PGHOST=127.0.0.1 PGPORT=${PGPORT:-55497} PGUSER=postgres
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

q() { psql -d t -At -c "$1" 2>&1; }
echec=0; total=0
# verifier "titre" "valeur attendue" "requête SQL renvoyant une valeur"
verifier() {
  local obtenu; obtenu=$(q "$3" | tr -d '\n')
  total=$((total+1))
  if [ "$obtenu" = "$2" ]; then echo "  ✓ $1"; else echo "  ✗ $1"; echo "      attendu : $2"; echo "      obtenu  : $obtenu"; echo "$obtenu" >/dev/null; echec=$((echec+1)); fi
}
# Valeur d'un champ de la situation d'une membre pour une caisse de ce type
sit() { echo "select (select x->>'$3' from jsonb_array_elements(situation_membre('$1')->'caisses') x where x->>'type'='$2')"; }

A=11111111-1111-1111-1111-111111111111; M=33333333-3333-3333-3333-333333333333; N=44444444-4444-4444-4444-444444444444
q "INSERT INTO users (id,nom,prenom,telephone,role,actif,password_hash) VALUES
   ('$A','Admin','Ada','+1','admin',true,crypt('secret',gen_salt('bf'))),('$M','Memb','Mina','+3','membre',true,'x'),('$N','Autre','Nina','+4','membre',true,'x')" >/dev/null
q "DELETE FROM exercices" >/dev/null
EX=$(q "INSERT INTO exercices (annee,date_ouverture,statut,ouvert_par) VALUES (2026,'2026-01-01','ouvert','$A') RETURNING id" | head -1)
q "DELETE FROM caisses" >/dev/null
q "INSERT INTO caisses (nom,type,solde,actif,montant_annuel) VALUES ('Secours','secours',0,true,15000),('Cassation','cassation',0,true,10000),('Épargne Individuelle','epargne',0,true,NULL)" >/dev/null
SEC=$(q "select id from caisses where type='secours' and actif" | head -1)
CAS=$(q "select id from caisses where type='cassation' and actif" | head -1)
EPA=$(q "select id from caisses where type='epargne' and actif" | head -1)
[ -z "$SEC" ] || [ -z "$CAS" ] || [ -z "$EPA" ] && { echo "Caisses Secours/Cassation/Épargne absentes de la base initiale"; exit 1; }
mvt() { q "INSERT INTO mouvements (type,montant,caisse_id,membre_id,statut,date) VALUES ('$1',$2,'$3','$4','$5','$6')" >/dev/null; }

echo "Cotisations annuelles : « à jour » avec la caisse Secours (15 000 par an)"
verifier "montant annuel Secours = 15 000" "15000" "select montant_annuel from caisses where id='$SEC'"
verifier "aucun versement : reste 15 000" "15000" "$(sit $M secours reste_a_payer)"
mvt cotisation 5000 $SEC $M valide 2026-02-10
verifier "versement validé de 5 000 : reste 10 000" "10000" "$(sit $M secours reste_a_payer)"
mvt cotisation 4000 $SEC $M en_attente 2026-02-11
mvt cotisation 3000 $SEC $M rejete 2026-02-12
verifier "mouvements en attente ou rejetés ne comptent pas" "10000" "$(sit $M secours reste_a_payer)"
mvt cotisation 8000 $SEC $M valide 2025-12-20
verifier "un versement d'avant l'exercice ne compte pas" "10000" "$(sit $M secours reste_a_payer)"
mvt cotisation 99999 $SEC $N valide 2026-02-10
verifier "le versement d'une autre membre ne compte pas" "10000" "$(sit $M secours reste_a_payer)"
mvt cotisation 10000 $SEC $M valide 2026-03-10
verifier "solde exact : reste 0 (à jour)" "0" "$(sit $M secours reste_a_payer)"
mvt cotisation 5000 $SEC $M valide 2026-04-10
verifier "trop-perçu : le reste ne devient pas négatif" "0" "$(sit $M secours reste_a_payer)"
verifier "versé sur l'exercice = 20 000" "20000" "$(sit $M secours verse_exercice)"
verifier "caisse sans montant annuel : reste non défini" "" "$(sit $M epargne reste_a_payer)"
mvt epargne 7000 $EPA $M valide 2026-02-01
verifier "épargne de la membre = 7 000" "7000" "$(sit $M epargne solde_membre)"
mvt depense 2000 $EPA $M valide 2026-02-02
verifier "une sortie réduit le solde de la membre" "5000" "$(sit $M epargne solde_membre)"

echo "Prêts et amendes dans la situation"
q "INSERT INTO prets (membre_id,montant,motif,taux_interet,date_demande,date_echeance,statut,montant_restant,interets_generes)
   VALUES ('$M',100000,'test',5,'2026-01-01','2020-01-01','en_cours',60000,0),('$M',50000,'rejeté',5,'2026-01-01','2030-01-01','rejete',50000,0)" >/dev/null
verifier "total restant : seuls les prêts approuvés ou en cours" "60000" "select situation_membre('$M')->>'total_pret_restant'"
verifier "prêt dont l'échéance est passée : en retard" "true" "select situation_membre('$M')->'prets'->0->>'en_retard'"
mvt penalite 500 $CAS $M valide 2026-02-15
mvt penalite 500 $CAS $M en_attente 2026-02-16
verifier "amendes de l'exercice : validées seulement" "500" "select situation_membre('$M')->>'amendes_exercice'"

echo "Cohérence des caisses"
q "UPDATE caisses SET solde = (SELECT COALESCE(SUM(CASE WHEN categorie='entree' THEN montant ELSE -montant END),0) FROM v_mouvements_valides v WHERE v.caisse_id = caisses.id)" >/dev/null
verifier "soldes alignés sur les mouvements : aucun écart" "0" "select count(*) from jsonb_array_elements(rapport_coherence()) x where abs((x->>'ecart')::numeric) >= 1"
q "UPDATE caisses SET solde = solde + 1234 WHERE id='$SEC'" >/dev/null
verifier "solde faussé : écart détecté" "1" "select count(*) from jsonb_array_elements(rapport_coherence()) x where abs((x->>'ecart')::numeric) >= 1"
q "SELECT recalculer_solde_caisse('$SEC')" >/dev/null
verifier "après recalcul : plus d'écart" "0" "select count(*) from jsonb_array_elements(rapport_coherence()) x where abs((x->>'ecart')::numeric) >= 1"

echo "Clôture de l'exercice"
mvt cotisation 1000 $SEC $M en_attente 2026-05-01
CL="select cloturer_exercice('$EX','$A','secret','CLÔTURER 2026')::jsonb->>'error'"
verifier "bloquée par un mouvement en attente" "La clôture est bloquée" "$CL"
q "UPDATE mouvements SET statut='rejete' WHERE statut='en_attente'" >/dev/null
q "INSERT INTO reunions (titre,date,heure,lieu,statut,exercice_id) VALUES ('Réunion','2026-06-01','15:00','x','en_cours','$EX')" >/dev/null
verifier "bloquée par une réunion en cours" "La clôture est bloquée" "$CL"
q "UPDATE reunions SET statut='terminee'" >/dev/null
q "INSERT INTO distributions_interets (periode_debut,date_distribution,solde_caisse_interets,montant_total,statut) VALUES ('2026-01-01','2026-06-30',0,0,'brouillon')" | grep -i error
verifier "bloquée par une distribution d'intérêts non exécutée" "La clôture est bloquée" "$CL"
q "DELETE FROM distributions_interets" >/dev/null
verifier "mauvais mot de passe refusé" "Mot de passe incorrect" "select cloturer_exercice('$EX','$A','faux','CLÔTURER 2026')::jsonb->>'error'"
verifier "confirmation incorrecte refusée" "t" "select (cloturer_exercice('$EX','$A','secret','oui')::jsonb->>'error') like 'Confirmation incorrecte%'"
verifier "non-administratrice refusée" "Réservé à l'administratrice" "select cloturer_exercice('$EX','$M','x','CLÔTURER 2026')::jsonb->>'error'"
TOTAL=$(q "select sum(solde) from caisses where actif")
verifier "clôture réussie" "true" "select cloturer_exercice('$EX','$A','secret','clôturer 2026')::jsonb->>'ok'"
verifier "solde de clôture = somme des caisses" "$TOTAL" "select solde_cloture from exercices"
verifier "soldes de clôture figés pour chaque caisse" "$(q "select count(*) from caisses where actif")" "select count(*) from exercices_soldes where type='cloture'"
verifier "rapport de clôture archivé" "1" "select count(*) from rapports_archives"
verifier "double clôture refusée" "La clôture est bloquée" "$CL"
obtenu=$(q "INSERT INTO mouvements (type,montant,caisse_id,membre_id,statut,date) VALUES ('cotisation',1,'$SEC','$M','valide','2026-03-01')")
total=$((total+1)); if echo "$obtenu" | grep -q "Exercice clôturé"; then echo "  ✓ mouvement daté dans l'exercice clôturé refusé"; else echo "  ✗ mouvement daté dans l'exercice clôturé accepté : $obtenu"; echec=$((echec+1)); fi
verifier "ouverture de l'exercice suivant" "true" "select ouvrir_exercice(2027,'$A')::jsonb->>'ok'"
verifier "continuité : 2027 s'ouvre à la date de clôture 2026" "t" "select e27.date_ouverture = e26.date_cloture from exercices e27, exercices e26 where e27.annee=2027 and e26.annee=2026"
verifier "un seul exercice ouvert à la fois" "Un exercice est déjà ouvert : clôturez-le avant d'en ouvrir un autre" "select ouvrir_exercice(2028,'$A')::jsonb->>'error'"

echo "Remise à neuf"
psql -d t -q -f "$SQL/remise-a-neuf.sql" >/dev/null 2>&1
verifier "un seul compte, administratrice" "1|admin" "select count(*)||'|'||min(role) from users"
verifier "plus aucun mouvement ni prêt ni réunion" "0|0|0" "select (select count(*) from mouvements)||'|'||(select count(*) from prets)||'|'||(select count(*) from reunions)"
verifier "caisses conservées, à zéro" "0" "select count(*) from caisses where solde <> 0"
verifier "un exercice ouvert, plus de rapport archivé" "1|0" "select (select count(*) from exercices where statut='ouvert')||'|'||(select count(*) from rapports_archives)"
verifier "connexion de l'administratrice possible" "true" "select auth_login('+237693048669','Admin@2025')::jsonb->>'ok'"
psql -d t -q -f "$SQL/remise-a-neuf.sql" >/dev/null 2>&1
verifier "rejouable sans erreur" "1" "select count(*) from users"

echo; echo "$((total-echec))/$total vérifications conformes"
[ $echec = 0 ]
