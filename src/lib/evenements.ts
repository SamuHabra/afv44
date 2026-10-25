import { supabase } from './supabase';
import { TypeEvenement, CategorieEvenement, TypeCaisse } from '../types';

// Barème des événements — Statuts, art. 25.
//  • « main levée » : somme versée par chaque membre, remise en main propre au bénéficiaire
//    (elle ne passe pas par les caisses) ;
//  • « prestation » : montant fixe versé par une caisse de l'association.
export interface SpecEvenement {
  label: string;
  categorie: CategorieEvenement;
  mainLevee: number;
  mainLeveeNote?: string;
  prestation?: { montant: number; caisse: TypeCaisse };
}

export const EVENEMENTS: Record<TypeEvenement, SpecEvenement> = {
  naissance: { label: 'Naissance', categorie: 'heureux', mainLevee: 2000 },
  mariage: { label: 'Mariage', categorie: 'heureux', mainLevee: 5000, mainLeveeNote: 'annoncée 3 mois avant, plus 1 casier', prestation: { montant: 50000, caisse: 'secours' } },
  promotion: { label: 'Promotion / sortie d\'école', categorie: 'heureux', mainLevee: 1000 },
  anniversaire: { label: 'Anniversaire', categorie: 'heureux', mainLevee: 500, mainLeveeNote: 'par membre et par mois' },
  amis_invisibles: { label: 'Amis invisibles', categorie: 'heureux', mainLevee: 0, prestation: { montant: 10000, caisse: 'cassation' } },
  deces_membre: { label: 'Décès d\'une membre', categorie: 'triste', mainLevee: 0, mainLeveeNote: 'gerbe (montant libre)', prestation: { montant: 50000, caisse: 'secours' } },
  deces_enfant: { label: 'Décès d\'un enfant', categorie: 'triste', mainLevee: 0, prestation: { montant: 30000, caisse: 'secours' } },
  deces_parent: { label: 'Décès d\'un parent', categorie: 'triste', mainLevee: 0, prestation: { montant: 20000, caisse: 'secours' } },
  deces_conjoint: { label: 'Décès du conjoint', categorie: 'triste', mainLevee: 0, prestation: { montant: 30000, caisse: 'secours' } },
};

export const typesDe = (categorie: CategorieEvenement): TypeEvenement[] =>
  (Object.keys(EVENEMENTS) as TypeEvenement[]).filter(t => EVENEMENTS[t].categorie === categorie);

const NOM_CAISSE: Partial<Record<TypeCaisse, string>> = { secours: 'Secours', cassation: 'Cassation' };
export const nomCaisse = (t: TypeCaisse) => NOM_CAISSE[t] ?? t;

/** Résumé en une phrase, pour les listes de choix. */
export function resume(type: TypeEvenement, devise = 'FCFA'): string {
  const e = EVENEMENTS[type];
  const f = (n: number) => `${n.toLocaleString('fr-FR')} ${devise}`;
  const parts: string[] = [];
  if (e.prestation) parts.push(`${f(e.prestation.montant)} (caisse ${nomCaisse(e.prestation.caisse)})`);
  if (e.mainLevee) parts.push(`main levée ${f(e.mainLevee)}/membre`);
  return `${e.label} — ${parts.join(' + ') || 'main levée libre'}`;
}

/**
 * Art. 25 : « Seule la membre à jour avec sa caisse secours peut bénéficier des prestations ».
 * Renvoie un message de refus, ou null si la bénéficiaire peut recevoir la prestation.
 */
export async function verifierEligibilite(membreId: string, caisses: { id: string; type?: string }[]): Promise<string | null> {
  const secours = caisses.find(c => c.type === 'secours');
  if (!secours) return 'Caisse Secours introuvable';
  const { data, error } = await supabase.rpc('situation_membre', { p_membre_id: membreId });
  if (error || !data) return 'Impossible de vérifier la situation de la bénéficiaire. Réessayez.';
  const ligne = (data.caisses as { caisse_id: string; reste_a_payer: number | null }[]).find(c => c.caisse_id === secours.id);
  if (ligne && ligne.reste_a_payer != null && ligne.reste_a_payer > 0) {
    return `La bénéficiaire n'est pas à jour avec la caisse Secours (reste ${Math.round(ligne.reste_a_payer).toLocaleString('fr-FR')}). Enregistrez d'abord son versement.`;
  }
  return null;
}
