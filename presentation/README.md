# Présentation AFMEY

Diaporama web pour présenter l'application aux membres, plus les fiches à imprimer. Aucun outil à installer : tout fonctionne en ouvrant les fichiers dans un navigateur, **même sans internet** (les polices Fraunces et DM Sans s'affichent si la connexion est disponible, sinon des polices de remplacement similaires sont utilisées).

## Lancer la présentation
Ouvrir `index.html` dans Chrome, Edge ou Firefox, puis appuyer sur **F** (plein écran).

| Touche | Action |
|---|---|
| → ou Espace ou clic | Suivant (affiche aussi les étapes une à une) |
| ← | Précédent |
| N | Notes de l'animatrice (déroulé, conseils, temps écoulé) |
| G ou Échap | Vue d'ensemble : aller directement à une diapositive |
| F | Plein écran |
| Début / Fin | Première / dernière diapositive |

Sur tablette : glisser le doigt vers la gauche ou la droite.
Une adresse comme `index.html#12` ouvre directement la diapositive 12 (`#12-2` : avec 2 étapes déjà affichées).

## Déroulé (45 minutes)
| Diapositives | Temps | Contenu |
|---|---|---|
| 1 à 2 | accueil | Titre, programme |
| 3 à 6 | 10 min | Pourquoi l'application |
| 7 à 15 | 15 min | L'histoire de Mina, du début à la fin, puis « chacune son rôle » |
| 16 à 18 | 15 min | À vous : les 4 gestes sur son téléphone |
| 19 à 20 | 5 min | Questions, la suite, merci |
| 21 à 24 | annexe | Une diapositive par rôle |

## Fiches à imprimer
Ouvrir `fiches.html` puis « Imprimer les fiches » (cocher « graphiques d'arrière-plan », format A4) : 5 pages.
1. **Mes 4 gestes** (pour toutes) : se connecter, voir son solde, lire ses nouvelles, demander un prêt. Deux lignes à remplir à la main : le lien du site et la personne à appeler.
2. à 5. **Une fiche par rôle** : Membre, Trésorière, Présidente, Administratrice.

## Avant la séance
- Remplacer, sur la fiche, le lien et le contact (lignes en pointillés) à la main ou dans `fiches.html`.
- Préparer des **comptes d'essai** (un par participante) : ne pas utiliser les vrais comptes pour s'entraîner.
- Vérifier le projecteur et que le grand écran affiche bien le plein écran (touche F).
- Les prénoms (Mina, Tina, Paulette) et les montants de l'histoire sont inventés. Les règles citées (5 % par mois, 3 mois maximum, cotisation Secours de 15 000 par an) correspondent à la configuration actuelle ; à modifier si les paramètres changent.

## Modifier le contenu
Les textes sont dans `index.html` (une `<section class="slide">` par diapositive, notes dans `<div class="notes-contenu">`). Les styles sont dans `css/style.css` et `css/fiches.css`, le moteur dans `js/app.js`.
