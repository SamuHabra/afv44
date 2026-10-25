import { supabase } from './supabase';

export interface ElementControle {
  code: string;
  message: string;
  nombre?: number;
}

export interface ControleCloture {
  bloquants: ElementControle[];
  avertissements: ElementControle[];
}

export interface ResultatAction {
  ok: boolean;
  error?: string;
  bloquants?: ElementControle[];
  inchange?: boolean;
}

export interface SoldeExercice {
  caisseNom: string;
  solde: number;
  type: 'ouverture' | 'cloture';
  exerciceId: string;
}

export interface EntreeJournal {
  id: string;
  userId?: string;
  action: string;
  details: any;
  date: string;
}

async function appeler<T>(fonction: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fonction, params);
  if (error) throw new Error(error.message);
  return data as T;
}

const enResultat = async (promesse: Promise<ResultatAction>): Promise<ResultatAction> => {
  try {
    return await promesse;
  } catch (e: any) {
    return { ok: false, error: `${e.message} (migration update-parametres.sql exécutée ?)` };
  }
};

export const getControleCloture = (exerciceId: string) => appeler<ControleCloture>('controle_cloture', { p_exercice_id: exerciceId });

export const cloturerExerciceRpc = (exerciceId: string, userId: string, password: string, confirmation: string) =>
  enResultat(appeler('cloturer_exercice', { p_exercice_id: exerciceId, p_user_id: userId, p_password: password, p_confirmation: confirmation }));

export const ouvrirExerciceRpc = (annee: number, userId: string) =>
  enResultat(appeler('ouvrir_exercice', { p_annee: annee, p_user_id: userId }));

export const rouvrirExerciceRpc = (exerciceId: string, userId: string, password: string, motif: string) =>
  enResultat(appeler('rouvrir_exercice', { p_exercice_id: exerciceId, p_user_id: userId, p_password: password, p_motif: motif }));

export const modifierParametresRpc = (userId: string, data: Record<string, unknown>) =>
  enResultat(appeler('modifier_parametres', { p_user_id: userId, p_data: data }));

export const modifierBaremeAmendeRpc = (userId: string, code: string, libelle: string, montant: number) =>
  enResultat(appeler('modifier_bareme_amende', { p_user_id: userId, p_code: code, p_libelle: libelle, p_montant: montant }));

export const modifierRoleRpc = (adminId: string, membreId: string, role: string) =>
  enResultat(appeler('modifier_role', { p_admin_id: adminId, p_membre_id: membreId, p_role: role }));

export async function getSoldesExercices(): Promise<SoldeExercice[]> {
  const { data, error } = await supabase.from('exercices_soldes').select('*').order('caisse_nom');
  if (error) throw new Error(error.message);
  return (data || []).map(s => ({ caisseNom: s.caisse_nom, solde: Number(s.solde), type: s.type, exerciceId: s.exercice_id }));
}

export async function getJournal(limite = 100): Promise<EntreeJournal[]> {
  const { data, error } = await supabase.from('journal_parametres').select('*').order('date', { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  return (data || []).map(j => ({ id: j.id, userId: j.user_id ?? undefined, action: j.action, details: j.details, date: j.date }));
}
