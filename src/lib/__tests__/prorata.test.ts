import { describe, expect, it } from 'vitest';
import { calculerCapitalJours, joursEntre, repartirInterets } from '../prorata';

describe('joursEntre', () => {
  it('compte les jours calendaires', () => {
    expect(joursEntre('2026-01-01', '2026-01-31')).toBe(30);
    expect(joursEntre('2026-01-01', '2026-01-01')).toBe(0);
  });
  it('ignore l\'heure et le changement d\'heure', () => {
    expect(joursEntre('2026-03-28T23:59:00Z', '2026-03-30T00:01:00Z')).toBe(2);
  });
  it('est négatif si la fin précède le début', () => {
    expect(joursEntre('2026-02-01', '2026-01-01')).toBe(-31);
  });
});

describe('calculerCapitalJours', () => {
  it('un dépôt compte pour montant × jours restants', () => {
    const r = calculerCapitalJours([{ membreId: 'a', montant: 1000, date: '2026-01-11' }], '2026-01-01', '2026-01-31');
    expect(r.get('a')).toBe(1000 * 20);
  });
  it('un solde d\'ouverture compte sur toute la période', () => {
    const r = calculerCapitalJours([{ membreId: 'a', montant: 1000, date: '2025-06-01' }], '2026-01-01', '2026-01-31');
    expect(r.get('a')).toBe(1000 * 30);
  });
  it('un retrait compte en négatif', () => {
    const r = calculerCapitalJours([
      { membreId: 'a', montant: 1000, date: '2025-06-01' },
      { membreId: 'a', montant: -400, date: '2026-01-16' },
    ], '2026-01-01', '2026-01-31');
    expect(r.get('a')).toBe(1000 * 30 - 400 * 15);
  });
  it('ignore les flux postérieurs à la date de distribution', () => {
    const r = calculerCapitalJours([{ membreId: 'a', montant: 5000, date: '2026-02-10' }], '2026-01-01', '2026-01-31');
    expect(r.has('a')).toBe(false);
  });
});

describe('repartirInterets', () => {
  const flux = [
    { membreId: 'a', montant: 1000, date: '2025-06-01' },
    { membreId: 'b', montant: 1000, date: '2026-01-16' },
  ];

  it('la somme distribuée est exactement le montant à partager', () => {
    const lignes = repartirInterets(flux, '2026-01-01', '2026-01-31', 1001);
    expect(lignes.reduce((s, l) => s + l.montant, 0)).toBe(1001);
  });
  it('plus longtemps dans la caisse = plus d\'intérêts', () => {
    const [premiere, seconde] = repartirInterets(flux, '2026-01-01', '2026-01-31', 3000);
    expect(premiere.membreId).toBe('a');
    expect(premiere.montant).toBe(2000);
    expect(seconde.montant).toBe(1000);
  });
  it('les pourcentages font 100', () => {
    const lignes = repartirInterets(flux, '2026-01-01', '2026-01-31', 3000);
    expect(lignes.reduce((s, l) => s + l.partPct, 0)).toBeCloseTo(100, 6);
  });
  it('exclut les membres non éligibles', () => {
    const lignes = repartirInterets(flux, '2026-01-01', '2026-01-31', 3000, new Set(['b']));
    expect(lignes).toHaveLength(1);
    expect(lignes[0].montant).toBe(3000);
  });
  it('ne répartit rien sans épargne ou sans montant', () => {
    expect(repartirInterets([], '2026-01-01', '2026-01-31', 1000)).toEqual([]);
    expect(repartirInterets(flux, '2026-01-01', '2026-01-31', 0)).toEqual([]);
  });
  it('un membre dont le solde est devenu nul ne reçoit rien', () => {
    const lignes = repartirInterets(
      [{ membreId: 'a', montant: 1000, date: '2025-06-01' }, { membreId: 'a', montant: -1000, date: '2026-01-01' }],
      '2026-01-01', '2026-01-31', 1000);
    expect(lignes).toEqual([]);
  });
});
