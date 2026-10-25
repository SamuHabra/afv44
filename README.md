# AFMEY — Filles & Femmes Mebounou M'Eyinga

Application de gestion de l'association : membres, caisses, mouvements, prêts, réunions, tontines,
distribution des intérêts, rapports, exercice annuel et consultation des statuts.

React 18 + TypeScript + Vite + Tailwind, base de données Supabase (PostgreSQL).

## Installation

```bash
npm install
cp .env.example .env     # puis renseigner l'URL et la clé publique Supabase
npm run dev              # http://localhost:3000
```

## Base de données

Les scripts SQL et leur **ordre d'exécution** sont décrits dans [supabase/LISEZ-MOI.md](supabase/LISEZ-MOI.md).
La sécurité (jeton de connexion, règles par rôle) est en deux étapes : lisez les en-têtes des fichiers
`update-securite-*.sql` avant de les lancer.

## Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Compilation de production (dossier `dist`) |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests du calcul des intérêts (prorata) et du barème des événements |
| `supabase/tests/securite.sh` | Rejoue toutes les migrations sur une base PostgreSQL locale jetable et vérifie les droits de chaque rôle (nécessite PostgreSQL installé) |

## Règles à respecter

- Ne mettez jamais de clé `service_role` dans le code ou dans `.env` : tout ce qui commence par `VITE_` est visible dans le navigateur.
- Ne commitez jamais le secret JWT (utilisé uniquement dans le SQL Editor de Supabase).
- Les anciens guides de dépannage sont dans `docs/archive/` ; ils ne reflètent plus l'état actuel.
