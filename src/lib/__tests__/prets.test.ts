import { describe, expect, it } from 'vitest';
import { appliquerRemboursement, calculerInterets, dateEcheance, dureeMois, resteDu, totalDu, verifierDemande } from '../prets';

// Prêt type : 100 000 FCFA à 5 % par mois sur 3 mois (90 jours) → intérêts 15 000, total dû 115 000
const pret = { montant: 100000, tauxInteret: 5, dateDemande: '2026-01-01T00:00:00Z', dateEcheance: '2026-04-01T00:00:00Z' };

describe('dureeMois', () => {
  it('90 jours = 3 mois', () => expect(dureeMois(pret)).toBe(3));
  it('arrondit au mois supérieur', () => {
    expect(dureeMois({ dateDemande: '2026-01-01', dateEcheance: '2026-01-31' })).toBe(1);
    expect(dureeMois({ dateDemande: '2026-01-01', dateEcheance: '2026-02-01' })).toBe(2); // 31 jours > 30
  });
  it('au minimum 1 mois, même si l\'échéance est le jour même ou passée', () => {
    expect(dureeMois({ dateDemande: '2026-01-01', dateEcheance: '2026-01-01' })).toBe(1);
    expect(dureeMois({ dateDemande: '2026-02-01', dateEcheance: '2026-01-01' })).toBe(1);
  });
  it('une demande faite en cours de journée garde la durée choisie', () => {
    const demande = new Date('2026-03-10T15:42:00Z');
    for (const mois of [1, 2, 3, 6, 12]) {
      expect(dureeMois({ dateDemande: demande.toISOString(), dateEcheance: dateEcheance(mois, demande) })).toBe(mois);
    }
  });
});

describe('calculerInterets', () => {
  it('intérêts simples par mois', () => {
    expect(calculerInterets(100000, 3, 5)).toEqual({ interetsMensuels: 5000, interetsTotaux: 15000, totalARembourser: 115000 });
  });
  it('taux zéro : pas d\'intérêts', () => {
    expect(calculerInterets(100000, 6, 0).totalARembourser).toBe(100000);
  });
});

describe('totalDu et resteDu', () => {
  it('total dû = capital + intérêts', () => expect(totalDu(pret)).toBe(115000));
  it('reste dû après un paiement partiel', () => expect(resteDu(pret, 40000)).toBe(75000));
  it('jamais négatif en cas de trop-perçu', () => expect(resteDu(pret, 200000)).toBe(0));
});

describe('appliquerRemboursement', () => {
  it('les intérêts sont payés en premier', () => {
    const r = appliquerRemboursement(pret, 0, 10000);
    expect(r.interetsPayes).toBe(10000);
    expect(r.capitalPaye).toBe(0);
    expect(r.montantRestant).toBe(105000);
    expect(r.solde).toBe(false);
  });
  it('un paiement qui dépasse les intérêts entame le capital', () => {
    const r = appliquerRemboursement(pret, 0, 20000);
    expect(r.interetsPayes).toBe(15000);
    expect(r.capitalPaye).toBe(5000);
    expect(r.montantRestant).toBe(95000);
  });
  it('tient compte de ce qui a déjà été payé', () => {
    // 10 000 déjà payés (tous en intérêts) : il reste 5 000 d'intérêts à payer
    const r = appliquerRemboursement(pret, 10000, 20000);
    expect(r.interetsPayes).toBe(5000);
    expect(r.capitalPaye).toBe(15000);
    expect(r.montantRestant).toBe(85000);
  });
  it('une fois les intérêts soldés, plus rien ne va à la caisse Intérêts', () => {
    const r = appliquerRemboursement(pret, 30000, 10000);
    expect(r.interetsPayes).toBe(0);
    expect(r.capitalPaye).toBe(10000);
  });
  it('le dernier paiement solde le prêt', () => {
    const r = appliquerRemboursement(pret, 100000, 15000);
    expect(r.montantRestant).toBe(0);
    expect(r.solde).toBe(true);
  });
  it('un paiement trop élevé ne rend pas le reste négatif', () => {
    expect(appliquerRemboursement(pret, 100000, 50000).montantRestant).toBe(0);
  });
  it('la somme des intérêts payés ne dépasse jamais les intérêts totaux', () => {
    let paye = 0; let interets = 0;
    for (const p of [7000, 7000, 7000, 50000, 50000]) {
      const r = appliquerRemboursement(pret, paye, p);
      interets += r.interetsPayes; paye += p;
    }
    expect(interets).toBe(15000);
  });
  it('intérêts générés plafonnés au total des intérêts', () => {
    expect(appliquerRemboursement(pret, 0, 10000).interetsGeneres).toBe(10000);
    expect(appliquerRemboursement(pret, 0, 90000).interetsGeneres).toBe(15000);
  });
});

describe('verifierDemande', () => {
  const limites = { montantMaxPret: 500000, dureeMaxPretMois: 6, devise: 'FCFA' };
  it('accepte une demande dans les limites', () => expect(verifierDemande(100000, 3, limites)).toBeUndefined());
  it('accepte exactement les plafonds', () => expect(verifierDemande(500000, 6, limites)).toBeUndefined());
  it('refuse un montant nul, négatif ou invalide', () => {
    for (const m of [0, -5, NaN]) expect(verifierDemande(m, 3, limites)).toMatch(/montant valide/);
  });
  it('refuse un montant au-dessus du plafond', () => expect(verifierDemande(500001, 3, limites)).toMatch(/maximum autorisé/));
  it('refuse une durée au-dessus du plafond', () => expect(verifierDemande(1000, 7, limites)).toMatch(/durée/));
  it('plafond de montant à 0 = pas de limite', () => {
    expect(verifierDemande(10_000_000, 3, { ...limites, montantMaxPret: 0 })).toBeUndefined();
  });
});
