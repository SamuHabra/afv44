# Mise en ligne de l'application AFMEY

Le site (fichiers React) est hébergé sur **Cloudflare Pages** ; les données restent chez **Supabase**. Compter environ 45 minutes la première fois.

> **À savoir : ce que Cloudflare protège, et ce qu'il ne protège pas.**
> Cloudflare sert et protège les *fichiers du site*. Les échanges avec la base (connexion, cotisations, prêts…) partent directement du téléphone vers Supabase et **ne passent pas par Cloudflare**. La protection de la base vient donc de Supabase (limites par défaut, accès fermé au public, droits par rôle, blocage de la connexion après trop d'essais), pas de Cloudflare.

## 0. Avant de commencer
- [ ] Les scripts SQL ont été exécutés dans l'ordre sur Supabase (voir `supabase/LISEZ-MOI.md`), y compris `update-securite-1-jeton.sql` puis `update-securite-2-verrouillage.sql`.
- [ ] Contrôle de sécurité (SQL Editor) : doit afficher **0**
  ```sql
  SELECT count(*) FROM information_schema.role_table_grants
  WHERE grantee = 'anon' AND privilege_type IN ('INSERT','UPDATE','DELETE') AND table_schema = 'public';
  ```
- [ ] `supabase/remise-a-neuf.sql` exécuté (après sauvegarde) pour partir sans données de test.
- [ ] En local : `npm run build`, `npm test`, `npm run typecheck` passent.

## 1. Mettre le code sur GitHub
1. Créer un compte sur github.com, puis un dépôt **privé** `afmey`.
2. Dans le dossier du projet : `git remote add origin <adresse du dépôt>` puis `git push -u origin main`.
3. Vérifier que le fichier `.env` n'est **pas** dans le dépôt (il est ignoré par défaut).

## 2. Créer le site sur Cloudflare Pages
1. Créer un compte sur cloudflare.com (gratuit).
2. **Workers & Pages → Create → Pages → Connect to Git**, choisir le dépôt `afmey`.
3. Réglages de construction :
   | Champ | Valeur |
   |---|---|
   | Framework preset | None (ou Vite) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
4. **Environment variables** (Production), à recopier depuis Supabase → Project Settings → API :
   | Nom | Valeur |
   |---|---|
   | `VITE_SUPABASE_URL` | l'adresse du projet (`https://xxxx.supabase.co`) |
   | `VITE_SUPABASE_ANON_KEY` | la clé **publique** (`anon` / `publishable`) |
   | `NODE_VERSION` | `20` |
   > Ne mettez **jamais** la clé `service_role` ici : tout ce qui commence par `VITE_` est visible par n'importe qui dans le navigateur.
5. **Save and Deploy**. Au bout d'une ou deux minutes, le site est en ligne sur `https://afmey.pages.dev` (ou le nom choisi).

Les fichiers `public/_headers` (en-têtes de sécurité) et `public/_redirects` sont copiés automatiquement dans `dist/` : rien à faire. Chaque `git push` sur `main` met le site à jour tout seul.

## 3. Brancher un nom de domaine (facultatif, recommandé)
1. Acheter un nom (par exemple `afmey.org`) chez Cloudflare Registrar ou un autre registraire.
2. Pages → votre projet → **Custom domains → Set up a domain**, saisir le nom et suivre les instructions (le DNS se configure en quelques clics si le domaine est chez Cloudflare).
3. Attendre quelques minutes que le certificat HTTPS soit actif, puis ouvrir `https://afmey.org`.

## 4. Vérifier après la mise en ligne
- [ ] La page de connexion s'affiche, en `https://` (cadenas).
- [ ] Connexion avec le compte administrateur, puis **changement du mot de passe provisoire**.
- [ ] Sur [securityheaders.com](https://securityheaders.com), saisir l'adresse du site : la note doit être A ou A+.
- [ ] Sur un téléphone : connexion, Mon espace, une cotisation saisie puis validée.
- [ ] Rechargement d'une page (F5) : l'application se rouvre sans erreur.

## 5. Offre gratuite de Supabase : deux protections indispensables
L'offre gratuite a deux limites qui comptent pour une association qui se réunit une fois par mois :

**a) Mise en pause après environ une semaine sans activité.** Le site ne répondrait plus le jour de la réunion.
- Le fichier `.github/workflows/garder-actif.yml` envoie une requête légère deux fois par semaine. Pour l'activer : GitHub → Settings → Secrets and variables → Actions, créer `SUPABASE_URL` et `SUPABASE_ANON_KEY` (mêmes valeurs qu'au point 2).
- **Vérifiez pendant les premières semaines** que le projet reste actif (Supabase → tableau de bord). Si une pause survient malgré tout, le bouton « Restore project » le relance, sans perte de données dans les 90 jours.

**b) Pas de sauvegarde automatique.**
- Une fois par mois **et avant chaque clôture d'exercice**, lancer :
  ```
  DATABASE_URL='postgresql://postgres:MOT_DE_PASSE@db.xxxx.supabase.co:5432/postgres' ./supabase/sauvegarde.sh
  ```
  (adresse dans Supabase → bouton **Connect**). Copier le fichier obtenu dans un endroit privé (clé USB, disque chiffré) : il contient des données personnelles.
- Pour passer à l'offre payante plus tard (sauvegardes quotidiennes automatiques, pas de pause), rien à changer dans l'application.

## 6. Mises à jour et retour arrière
- Mettre à jour : modifier le code, `git push`. Cloudflare reconstruit et publie.
- Revenir en arrière : Pages → **Deployments** → choisir une version précédente → **Rollback**.
- Changement de la base (nouveau script SQL) : le sauvegarder d'abord (point 5b), puis l'exécuter dans le SQL Editor.

## 7. Alternative : Vercel
Même principe : importer le dépôt, `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans Settings → Environment Variables. Le fichier `vercel.json` à la racine règle les en-têtes de sécurité et la redirection. Les conditions de l'offre gratuite de Vercel concernent un usage non commercial : à relire avant de choisir.
