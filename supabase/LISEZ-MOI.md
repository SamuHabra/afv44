# Base de données AFMEY — ordre d'exécution

À lancer dans **Supabase → SQL Editor**, dans cet ordre. Tous les scripts sont rejouables.

| # | Fichier | Rôle |
|---|---------|------|
| 1 | `schema.sql` | Tables de départ (nouvelle base uniquement) |
| 2 | `update-base.sql` | Colonnes communes (type des caisses, catégorie des mouvements) |
| 3 | `update-reunions.sql` | Réunions, présences, amendes |
| 4 | `update-tontine.sql` | Jeux de tontine |
| 5 | `update-distribution-interets.sql` | Distribution des intérêts (prorata) |
| 6 | `update-mon-espace.sql` | Mots de passe hachés, situation des membres, notifications |
| 7 | `update-rapports.sql` | Rapports et archives |
| 8 | `update-parametres.sql` | Exercice annuel, paramètres, journal |
| 8b | `update-statuts.sql` | Statuts des prêts, mouvements, réunions et tontines |
| 9 | `update-securite-1-jeton.sql` | Jeton de connexion signé (**coller le secret JWT avant**) |
| — | *Test dans l'application* | Paramètres → Rôles → « Tester ma connexion » doit afficher ✅ |
| 10 | `update-securite-2-verrouillage.sql` | Ferme l'accès public, règles par rôle |

`remise-a-neuf.sql` vide les données de test avant la mise en service (voir l'en-tête du fichier).

`update-securite-rollback.sql` rétablit l'état d'avant l'étape 10 en cas de problème.


Les anciens scripts de dépannage sont rangés dans `archive/` : **ne pas les relancer** (certains désactivent la sécurité).

## Tests automatiques

- `tests/securite.sh` : ce que chaque rôle peut ou ne peut pas faire (22 vérifications).
- `tests/metier.sh` : règles métier côté base — situation des membres et « à jour » Secours, cohérence des caisses, clôture, gel d'exercice, remise à neuf (39 vérifications).

Les deux rejouent toute la chaîne de scripts sur une base PostgreSQL locale jetable (`PGBIN=/usr/lib/postgresql/17/bin ./supabase/tests/metier.sh`) et ne touchent jamais à Supabase.
