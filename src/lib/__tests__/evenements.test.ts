import { describe, expect, it } from 'vitest';
import { EVENEMENTS, resume, typesDe } from '../evenements';

// Montants issus des statuts, art. 25
describe('barème des événements', () => {
  it('prestations des caisses', () => {
    expect(EVENEMENTS.mariage.prestation).toEqual({ montant: 50000, caisse: 'secours' });
    expect(EVENEMENTS.deces_membre.prestation).toEqual({ montant: 50000, caisse: 'secours' });
    expect(EVENEMENTS.deces_enfant.prestation).toEqual({ montant: 30000, caisse: 'secours' });
    expect(EVENEMENTS.deces_parent.prestation).toEqual({ montant: 20000, caisse: 'secours' });
    expect(EVENEMENTS.deces_conjoint.prestation).toEqual({ montant: 30000, caisse: 'secours' });
    expect(EVENEMENTS.amis_invisibles.prestation).toEqual({ montant: 10000, caisse: 'cassation' });
  });
  it('mains levées par membre', () => {
    expect(EVENEMENTS.naissance.mainLevee).toBe(2000);
    expect(EVENEMENTS.mariage.mainLevee).toBe(5000);
    expect(EVENEMENTS.promotion.mainLevee).toBe(1000);
    expect(EVENEMENTS.anniversaire.mainLevee).toBe(500);
  });
  it('naissance, promotion et anniversaire ne sortent rien d\'une caisse', () => {
    expect(EVENEMENTS.naissance.prestation).toBeUndefined();
    expect(EVENEMENTS.promotion.prestation).toBeUndefined();
    expect(EVENEMENTS.anniversaire.prestation).toBeUndefined();
  });
  it('classe les événements heureux et tristes', () => {
    expect(typesDe('heureux')).toHaveLength(5);
    expect(typesDe('triste')).toHaveLength(4);
  });
  it('le résumé mentionne la caisse et la main levée', () => {
    expect(resume('mariage')).toContain('Secours');
    expect(resume('mariage')).toContain('main levée');
  });
});
