import { describe, expect, it } from 'vitest';
import { datePourTour, etatTour, miseParticipant, montantPot, ordonnerTours, refusVersement, totalParts } from '../tontine';

const a = { id: 'a', nbParts: 1, ordre: 1 };
const b = { id: 'b', nbParts: 2, ordre: 2 };
const c = { id: 'c', nbParts: 1, ordre: 3 };

// Générateur pseudo-aléatoire reproductible
const graine = (n: number) => () => { n = (n * 1664525 + 1013904223) % 4294967296; return n / 4294967296; };

describe('pot et mises', () => {
  it('total de parts = nombre de tours', () => expect(totalParts([a, b, c])).toBe(4));
  it('pot = mise par part × total des parts', () => expect(montantPot(10000, [a, b, c])).toBe(40000));
  it('mise d\'un participant = mise par part × ses parts', () => {
    expect(miseParticipant(10000, a)).toBe(10000);
    expect(miseParticipant(10000, b)).toBe(20000);
  });
  it('à chaque tour, les mises de tous les participants égalent le pot', () => {
    const mises = [a, b, c].reduce((s, p) => s + miseParticipant(10000, p), 0);
    expect(mises).toBe(montantPot(10000, [a, b, c]));
  });
});

describe('datePourTour', () => {
  it('hebdomadaire : +7 jours par tour', () => expect(datePourTour('2026-01-01T00:00:00Z', 'hebdomadaire', 2)).toBe('2026-01-15T00:00:00.000Z'));
  it('bimensuel : +14 jours par tour', () => expect(datePourTour('2026-01-01T00:00:00Z', 'bimensuel', 2)).toBe('2026-01-29T00:00:00.000Z'));
  it('mensuel : +1 mois par tour', () => expect(datePourTour('2026-01-15T00:00:00Z', 'mensuel', 3)).toBe('2026-04-15T00:00:00.000Z'));
  it('tour 0 = date de début', () => expect(datePourTour('2026-01-01T00:00:00Z', 'mensuel', 0)).toBe('2026-01-01T00:00:00.000Z'));
});

describe('ordonnerTours', () => {
  it('manuel : tours de table dans l\'ordre choisi', () => {
    // a:1 part, b:2 parts, c:1 part → a b c puis b
    expect(ordonnerTours([c, a, b], 'manuel').map(p => p.id)).toEqual(['a', 'b', 'c', 'b']);
  });
  it('manuel : respecte un ordre modifié', () => {
    expect(ordonnerTours([{ ...a, ordre: 3 }, { ...c, ordre: 1 }, { ...b, ordre: 2 }], 'manuel').map(p => p.id)).toEqual(['c', 'b', 'a', 'b']);
  });
  it('tirage : chaque participant reçoit exactement autant de tours que de parts', () => {
    for (let n = 1; n <= 30; n++) {
      const ids = ordonnerTours([a, b, c], 'tirage', graine(n)).map(p => p.id);
      expect(ids).toHaveLength(4);
      expect(ids.filter(i => i === 'a')).toHaveLength(1);
      expect(ids.filter(i => i === 'b')).toHaveLength(2);
      expect(ids.filter(i => i === 'c')).toHaveLength(1);
    }
  });
  it('tirage : évite deux tours de suite pour la même personne quand c\'est possible', () => {
    const gros = [{ id: 'x', nbParts: 3 }, { id: 'y', nbParts: 2 }, { id: 'z', nbParts: 2 }];
    for (let n = 1; n <= 50; n++) {
      const ids = ordonnerTours(gros, 'tirage', graine(n)).map(p => p.id);
      expect(ids.some((id, i) => i > 0 && id === ids[i - 1])).toBe(false);
    }
  });
  it('tirage : quand c\'est impossible (plus de la moitié des parts), tous les tours sont quand même attribués', () => {
    const ids = ordonnerTours([{ id: 'x', nbParts: 3 }, { id: 'y', nbParts: 1 }], 'tirage', graine(7)).map(p => p.id);
    expect(ids.filter(i => i === 'x')).toHaveLength(3);
    expect(ids.filter(i => i === 'y')).toHaveLength(1);
  });
  it('ne modifie pas la liste d\'origine', () => {
    const liste = [c, a, b];
    ordonnerTours(liste, 'manuel');
    ordonnerTours(liste, 'tirage', graine(1));
    expect(liste.map(p => p.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('etatTour', () => {
  const m = (type: string, montant: number, statut: string) => ({ type, montant, statut });
  it('seuls les mouvements validés comptent', () => {
    const r = etatTour([m('cotisation', 10000, 'valide'), m('cotisation', 10000, 'en_attente'), m('cotisation', 10000, 'rejete')], 40000);
    expect(r.collecte).toBe(10000);
    expect(r.potComplet).toBe(false);
  });
  it('pot complet quand les mises validées atteignent le montant attendu', () => {
    const r = etatTour([m('cotisation', 20000, 'valide'), m('cotisation', 20000, 'valide')], 40000);
    expect(r.potComplet).toBe(true);
    expect(r.termine).toBe(false);
  });
  it('tour terminé quand le versement validé atteint le pot', () => {
    const r = etatTour([m('cotisation', 40000, 'valide'), m('distribution', 40000, 'valide')], 40000);
    expect(r.verse).toBe(40000);
    expect(r.termine).toBe(true);
  });
  it('un versement en attente ne termine pas le tour', () => {
    expect(etatTour([m('distribution', 40000, 'en_attente')], 40000).termine).toBe(false);
  });
  it('accepte des montants texte venant de la base', () => {
    expect(etatTour([m('cotisation', '10000.50' as unknown as number, 'valide')], 1).collecte).toBe(10000.5);
  });
});

describe('refusVersement', () => {
  it('refuse si le pot est incomplet', () => expect(refusVersement(30000, 40000, false)).toMatch(/pot n’est pas complet/));
  it('refuse un second versement', () => expect(refusVersement(40000, 40000, true)).toMatch(/déjà en cours/));
  it('autorise quand le pot est complet et qu\'aucun versement n\'est en cours', () => expect(refusVersement(40000, 40000, false)).toBeUndefined());
});
