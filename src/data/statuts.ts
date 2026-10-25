export interface ArticleStatut {
  numero: number;
  titre: string;
  texte: string;
}

export interface TitreStatut {
  id: string;
  libelle: string;
  articles: ArticleStatut[];
}

export const STATUTS_NOM = "Filles et Femmes Mebounou M'Eyinga";
export const STATUTS_SIGLE = 'A.F.F.M.M.';
export const STATUTS_ADOPTION = "Adoptés par l'Assemblée Constitutive du 12 janvier 2026 — Yaoundé, Cameroun";

export const STATUTS: TitreStatut[] = [
  {
    id: 'I',
    libelle: 'Dispositions générales',
    articles: [
      { numero: 1, titre: 'Dénomination', texte: "Il est créé entre les adhérentes aux présents statuts une association dénommée :\n« FILLES ET FEMMES MEBOUNOU M'EYINGA » — Sigle : A.F.F.M.M.\nCette association regroupe les filles et épouses de la famille MEBOUNOU M'EYINGA." },
      { numero: 2, titre: 'Objet et buts', texte: "L'association a pour objet de :\na) Maintenir et renforcer la solidarité, l'amour fraternel et l'épanouissement des membres ;\nb) Contribuer au développement socio-économique et culturel du village Mebounou M'Eyinga ;\nc) Promouvoir l'éducation, la formation et l'autonomisation des femmes ;\nd) Préserver et transmettre les valeurs culturelles et traditions familiales." },
      { numero: 3, titre: 'Siège social', texte: "Le siège social est situé à Yaoundé. Il peut être transféré en tout autre lieu du territoire national sur décision du bureau exécutif, ratifiée par l'assemblée générale." },
      { numero: 4, titre: 'Durée', texte: "La durée de l'association est illimitée. Elle peut être dissoute par décision de l'assemblée générale extraordinaire." },
    ],
  },
  {
    id: 'II',
    libelle: 'Des membres',
    articles: [
      { numero: 5, titre: 'Qualités requises', texte: "Sont membres toutes les femmes de la famille Mebounou M'Eyinga qui :\na) Acceptent les présents statuts et le règlement intérieur ;\nb) Sont à jour de leurs obligations financières ;\nc) Respectent les valeurs et objectifs de l'association." },
      { numero: 6, titre: 'Admission', texte: "Toute candidate doit :\na) Présenter une demande écrite d'adhésion ;\nb) S'acquitter d'une inscription de 1 000 FCFA ;\nc) Être agréée par le bureau exécutif." },
      { numero: 7, titre: 'Droits des membres', texte: 'Tout membre a le droit de : participer aux activités, bénéficier des avantages, être informée des décisions, voter et être élue, présenter des suggestions.' },
      { numero: 8, titre: 'Devoirs des membres', texte: "Toute membre est tenue de : respecter les statuts et décisions, s'acquitter ponctuellement des cotisations, participer activement aux activités, s'abstenir de tout acte nuisant à l'image de l'association." },
      { numero: 9, titre: 'Perte de la qualité', texte: "La qualité se perd par : démission écrite, décès, radiation par le bureau exécutif, exclusion décidée par l'assemblée générale pour faute grave." },
    ],
  },
  {
    id: 'III',
    libelle: 'Organisation et fonctionnement',
    articles: [
      { numero: 10, titre: 'Organes', texte: "L'association comprend :\na) L'assemblée générale ;\nb) Le bureau exécutif." },
      { numero: 11, titre: 'Assemblée générale', texte: "L'AG est l'organe suprême. Elle se réunit en session ordinaire chaque 2ème samedi du mois à 14h. Session extraordinaire sur convocation du président ou à la demande d'1/3 des membres. Les assises se tiennent à rotation chez les membres selon un calendrier préétabli." },
      { numero: 12, titre: "Attributions de l'AG", texte: "L'AG : adopte et modifie les statuts ; élit le bureau exécutif ; délibère sur l'ordre du jour ; approuve les rapports d'activités et financier ; approuve le budget prévisionnel ; décide de la dissolution." },
      { numero: 13, titre: 'Bureau exécutif', texte: 'Élu pour 3 ans (renouvelable). Composé de : Présidente, Secrétaire générale, Trésorière, Commissaire aux comptes & censeure, Animatrice, 2 Conseillères.' },
      { numero: 14, titre: 'Attributions de la Présidente', texte: "Représente l'association légalement ; préside les réunions ; veille à l'exécution des décisions ; ordonne les dépenses ; signe tous les documents engageant l'association." },
      { numero: 15, titre: 'Attributions de la Secrétaire', texte: "Assure le secrétariat ; rédige les PV et les conserve ; tient les documents administratifs ; établit le rapport d'activités." },
      { numero: 16, titre: 'Attributions de la Trésorière', texte: "Tient la comptabilité ; perçoit les recettes ; effectue les paiements ; établit le rapport financier ; présente l'état de trésorerie à chaque réunion." },
      { numero: 17, titre: 'Attributions du Commissaire aux comptes', texte: "Certifie la régularité des informations financières ; veille à l'application des statuts ; saisit le bureau de toute irrégularité ; émet un avis sur le rapport financier." },
      { numero: 18, titre: "Attributions de l'Animatrice", texte: "Fait vivre l'association dans une ambiance conviviale ; propose et organise des activités de détente ; anime les séances et gère les jeux. Elle est choisie par le bureau à chaque séance." },
      { numero: 19, titre: 'Attributions des Conseillères', texte: "Conseillent et suggèrent des orientations ; médient et règlent les conflits ; veillent au respect de l'éthique et des valeurs de l'association." },
    ],
  },
  {
    id: 'IV',
    libelle: 'Ressources et gestion financière',
    articles: [
      { numero: 20, titre: 'Ressources', texte: 'Cotisations des membres, amendes et pénalités, dons et legs, subventions, toutes autres ressources autorisées par la loi.' },
      { numero: 21, titre: 'Les caisses', texte: "a) Épargne individuelle (facultative) ;\nb) Caisse cassation : 10 000 FCFA/an (cassation annuelle) ;\nc) Caisse charité : 10 000 FCFA/an (soutien aux nécessiteux en fin d'année) ;\nd) Caisse secours : 15 000 FCFA/an (événements malheureux et heureux) ;\ne) Caisse scolaire (facultative)." },
      { numero: 22, titre: 'Cotisations', texte: 'Ration mensuelle : 2 000 FCFA obligatoire (présentes ou absentes).\nRepas obligatoire : 1/4 de poulet + frites + boisson 500 FCFA.' },
      { numero: 23, titre: 'Les amendes', texte: "• Échec de cotisation : 1 000 FCFA\n• Bavardage pendant les séances : 100 FCFA\n• Querelles et bagarres : 2 000 FCFA\n• Non-respect du dress code : 1 000 FCFA\n• Retard à la réunion : 500 FCFA (après 1h)\nEn plus, l'animatrice choisit une activité pour les retardataires." },
      { numero: 24, titre: 'Les prêts', texte: "Prêts accordés moyennant des avales en gage. Remboursement dans un délai de 3 mois, taux d'intérêt : 5%/mois. Conditions fixées par le bureau exécutif." },
      { numero: 25, titre: 'Gestion des événements', texte: "JOYEUX :\n• Naissance : main levée 2 000 FCFA\n• Mariage : 50 000 FCFA (caisse secours) + main levée 5 000 FCFA/membre (annoncé 3 mois avant) + 1 casier\n• Promotion/sortie d'école : 1 000 FCFA\n• Anniversaire : 500 FCFA/membre (par mois)\n• Amis invisibles : cadeau 10 000 FCFA (cassation)\n\nTRISTES :\n• Décès membre : 50 000 FCFA (secours) + main levée gerbe\n• Décès enfant : 30 000 FCFA (secours)\n• Décès parent : 20 000 FCFA (secours)\n• Décès conjoint : 30 000 FCFA (secours)\n\nNB : Seule la membre à jour avec sa caisse secours peut bénéficier des prestations." },
    ],
  },
  {
    id: 'V',
    libelle: 'Dispositions diverses et transitoires',
    articles: [
      { numero: 26, titre: 'Règlement intérieur', texte: "Un RI peut être adopté par l'AG pour préciser les modalités d'application des présents statuts." },
      { numero: 27, titre: 'Modification des statuts', texte: "Possible uniquement par l'AG extraordinaire, à la majorité des 2/3 des membres présents ou représentés." },
      { numero: 28, titre: 'Dissolution', texte: "Prononcée par l'AG extraordinaire, à la majorité des 3/4. Un ou plusieurs liquidateurs sont désignés. L'actif net est dévolu conformément à la législation." },
      { numero: 29, titre: 'Savoir-vivre', texte: "Le respect mutuel entre membres est obligatoire.\nLe respect du forum est exigé : toute membre qui sort volontairement du forum n'est plus admise à y revenir.\nAucun manquement de comportement ne sera toléré." },
      { numero: 30, titre: 'Premier bureau', texte: 'Élu le 12 janvier 2026 :\n• Présidente : Mme JACKY ABENG\n• Secrétaire générale : Mlle FANNY MENGBWA\n• Trésorière : Mme MYRIAM BINDJEME\n• Commissaire aux comptes : Mlle VANESSA KEDI\n• Conseillère 1 : Mme FRANCINE MONIQUE ONDO\n• Conseillère 2 : Mme HERVIE OUMAROU' },
      { numero: 31, titre: 'Entrée en vigueur', texte: 'Les présents statuts entrent en vigueur à compter de leur adoption le 12 janvier 2026.' },
    ],
  },
];
