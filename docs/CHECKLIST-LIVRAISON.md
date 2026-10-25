# AFMEY — Liste de contrôle avant mise en service

Cochez au fur et à mesure. Faites les parties 1 à 3 **dans l'ordre** : la partie 4 ne vaut que si la base est bien verrouillée.

---

## 1. Base de données (Supabase → SQL Editor)

**Avant tout : sauvegarde** (Database → Backups). Notez l'heure.

- [ ] Scripts exécutés dans l'ordre de `supabase/LISEZ-MOI.md`, **sans message d'erreur rouge** :
  `schema` → `update-base` → `update-reunions` → `update-tontine` → `update-distribution-interets` → `update-mon-espace` → `update-rapports` → `update-parametres` → `update-statuts`
- [ ] `update-securite-1-jeton.sql` exécuté avec le vrai secret JWT, puis le texte `COLLER_ICI_LE_JWT_SECRET` remis dans le fichier (ne jamais commiter le secret)
- [ ] Message « ✅ Secret JWT enregistré »
- [ ] **Test de connexion** : déconnexion, reconnexion en administratrice, *Paramètres → Rôles → Tester ma connexion* affiche « Jeton accepté ✅ »
- [ ] `update-securite-2-verrouillage.sql` exécuté. Le tableau final affiche **0** table sans RLS et **0** table lisible par `anon`
- [ ] Après le verrouillage, l'application se charge toujours (sinon : `update-securite-rollback.sql` et noter l'erreur)

## 2. Données de départ

- [ ] Les 8 caisses existent : Cassation, Charité, Secours, Épargne individuelle, Scolaire, Amendes, Tontine, Intérêts
- [ ] Cotisations annuelles : Cassation 10 000 · Charité 10 000 · Secours 15 000
- [ ] Paramètres (*Paramètres → Configuration*) : cotisation 2 000 · pénalité de retard 500 · intérêt 5 % · durée maximale 3 mois · réunion le samedi
- [ ] Barème des amendes : retard 500 · bavardage 100 · querelle 2 000 · dress code 1 000 · échec de cotisation 1 000
- [ ] Un exercice est **ouvert** (*Paramètres → Exercice annuel*)
- [ ] Les membres réelles sont créées avec leur **vrai numéro** au format `+237 6XX XX XX XX`
- [ ] Les rôles du bureau sont attribués (statuts, art. 30) : Présidente, Secrétaire générale, Trésorière, Commissaire aux comptes, 2 Conseillères
- [ ] **Les anciennes données de démonstration sont supprimées** (comptes et mouvements d'essai)

## 3. Mots de passe et accès

- [ ] Aucun compte ne garde `Password123!` : réinitialiser chaque membre depuis *Membres → Mot de passe*, et transmettre le message copié (WhatsApp ou SMS)
- [ ] Comptes de test supprimés ou désactivés
- [ ] Le fichier `.env` n'est pas dans Git (`git ls-files .env` ne renvoie rien)
- [ ] Aucune clé `service_role` dans `.env` ni dans le code
- [ ] Le site est servi en **HTTPS**

## 4. Parcours par rôle

Connectez-vous avec un compte de chaque rôle. Pour chaque ligne : ce qui doit marcher **et** ce qui doit être refusé.

### Membre ordinaire
- [ ] Voit : Tableau de bord, Caisses, Mouvements, Prêts, Réunions, Tontine, Mon espace, Statuts
- [ ] Ne voit **pas** dans le menu : Distributions, Rapports (et l'adresse directe ramène au tableau de bord)
- [ ] *Mon espace* : situation par caisse affichée (pas « Situation indisponible »), relevé imprimable
- [ ] Demande un prêt **pour elle-même** (pas de choix de la membre) ; durée limitée à 3 mois
- [ ] S'inscrit à un jeu de tontine, puis se désinscrit
- [ ] Ne voit pas les boutons Valider / Rejeter / Remboursement / Nouveau mouvement
- [ ] Ne peut ni créer de membre ni changer de rôle

### Trésorière
- [ ] Crée un mouvement (cotisation, épargne, dépense) → il apparaît « À valider »
- [ ] Enregistre une amende et une sortie physique
- [ ] Enregistre un remboursement de prêt
- [ ] Verse un tour de tontine
- [ ] **Ne peut pas valider** ses propres mouvements
- [ ] Voit les Rapports ; archive un rapport

### Présidente
- [ ] Valide et rejette un mouvement (le rejet exige un motif)
- [ ] Approuve ou rejette un prêt
- [ ] Planifie, démarre et termine une réunion
- [ ] Valide un procès-verbal rédigé par la secrétaire
- [ ] Crée un jeu de tontine

### Secrétaire générale
- [ ] Rédige un procès-verbal
- [ ] Saisit des amendes pendant une réunion
- [ ] Peut signaler un retard de tontine
- [ ] Ne peut pas valider un mouvement

### Commissaire aux comptes
- [ ] Valide un mouvement
- [ ] Voit les Rapports, la cohérence des caisses et le **journal** (*Paramètres → Journal*)
- [ ] Ne peut ni saisir un mouvement ni changer les paramètres

### Animatrice / Conseillère
- [ ] Voit les Rapports en lecture
- [ ] Ne peut rien modifier dans les finances

### Administratrice
- [ ] Crée une membre, copie le message d'accès, la membre se connecte avec
- [ ] Change un rôle (le changement apparaît dans le journal)
- [ ] Désactive une membre (confirmation demandée) : elle ne peut plus se connecter ; la réactiver
- [ ] Modifie un paramètre et voit la ligne dans le journal
- [ ] Ne peut pas se désactiver ni changer son propre rôle

## 5. Scénarios métier de bout en bout

- [ ] **Réunion** : planifier → démarrer → pointer les présences et retards → saisir cotisations et amendes → terminer → rédiger et valider le PV
- [ ] **Événement** : décès d'un parent → prestation de **20 000** (pas multipliée par le nombre de membres) ; refus si la bénéficiaire n'est pas à jour avec la caisse Secours
- [ ] **Prêt** : demande → approbation → remboursement partiel → intérêts versés à la caisse Intérêts → solde du prêt cohérent
- [ ] **Tontine** : inscription → démarrage → collecte des mises → versement du tour → les soldes de la caisse Tontine sont exacts
- [ ] **Distribution des intérêts** : simulation → création → validation → exécution ; la caisse Intérêts est vidée et les parts créditées à l'épargne
- [ ] **Rapports** : *Cohérence des caisses* sans écart (sinon « Recalculer » par l'administratrice)
- [ ] **Clôture** (à faire sur un exercice d'essai) : bloquée tant qu'il reste un mouvement en attente ; une fois prête, elle fige les soldes et archive le rapport. **Ne clôturez pas l'exercice réel pour tester.**

## 6. Appareils et accessibilité

- [ ] Téléphone Android (Chrome) : connexion, Mon espace, saisie en réunion, Mouvements
- [ ] Téléphone iPhone (Safari) : mêmes écrans
- [ ] Connexion lente (3G) : l'application s'affiche en moins de 10 secondes, les squelettes de chargement apparaissent
- [ ] Au clavier : Échap ferme une fenêtre, Tab reste dans la fenêtre
- [ ] Lecture à l'écran en plein soleil : le texte reste lisible

## 7. Mise en service

- [ ] `npm run build` sans erreur, `npm test` (63 tests) et `npm run typecheck` passent
- [ ] `supabase/tests/securite.sh` : 22/22 vérifications conformes (si PostgreSQL est installé)
- [ ] `supabase/tests/metier.sh` : 39/39 vérifications conformes (cotisations, prestations Secours, clôture, remise à neuf)
- [ ] Variables d'environnement définies sur l'hébergeur : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Sauvegarde automatique Supabase activée
- [ ] Une personne de confiance connaît la procédure de retour arrière (`update-securite-rollback.sql`) et sait réinitialiser un mot de passe
- [ ] Message d'accueil envoyé aux membres avec le lien et leur identifiant (leur numéro)

---

### À décider avant ou juste après la livraison
- Inscription de 1 000 FCFA à l'admission (art. 6) : pas encore enregistrée dans l'application
- Repas obligatoire (art. 22, « boisson 500 FCFA ») : à clarifier
- Réunion « le 2ème samedi du mois à 14 h » : l'application ne connaît que le jour de la semaine
- Répartition de fin d'année pour Cassation et Charité : seulement un avertissement à la clôture
- Les membres ordinaires peuvent lire tous les mouvements et prêts des autres (transparence) : confirmer que c'est voulu
- Rotation du secret JWT (il est apparu dans une conversation de travail) après la mise en service
