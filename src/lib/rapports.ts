import { notifier } from './notifier';
import { supabase } from './supabase';

// ===== Types des rapports (calculés en base, voir supabase/update-rapports.sql) =====

export interface Periode { debut: string; fin: string }

export interface RapportFinancier {
  periode: Periode;
  caisses: { caisse_id: string; nom: string; type: string; solde_ouverture: number; entrees: number; sorties: number; solde_cloture: number }[];
  par_type: { type: string; categorie: 'entree' | 'sortie'; total: number; nb: number }[];
  mensuel: { mois: string; entrees: number; sorties: number; solde_fin: number }[];
  total_entrees: number;
  total_sorties: number;
  solde_ouverture: number;
  solde_cloture: number;
  coherence?: Coherence[];
}

export interface Coherence {
  caisse_id: string;
  nom: string;
  type: string;
  solde_enregistre: number;
  solde_calcule: number;
  ecart: number;
  nb_en_attente: number;
}

export interface RapportCotisations {
  exercice: { id?: string; annee?: number; debut: string; fin: string };
  caisses: { caisse_id: string; nom: string; montant_annuel: number }[];
  membres: { membre_id: string; nom: string; versements: Record<string, number> }[];
}

export interface RapportPrets {
  periode: Periode;
  details: { id: string; membre: string; motif: string; montant: number; montant_restant: number; taux_interet: number; date_demande: string; date_echeance: string; statut: string; rembourse: number; interets_generes: number; en_retard: boolean }[];
  nb: number;
  total_prete: number;
  total_rembourse: number;
  interets_percus: number;
  encours: number;
  nb_en_retard: number;
  montant_en_retard: number;
}

export interface RapportReunions {
  periode: Periode;
  reunions: { id: string; titre: string; date: string; lieu: string; statut: string; presents: number; absents: number; retards: number; total_cotisations: number; total_amendes: number; total_depenses: number; nb_decisions: number; statut_pv: string }[];
  membres: { membre_id: string; nom: string; reunions: number; presences: number; retards: number }[];
}

export interface RapportTontine {
  id: string; nom: string; statut: string; mise: number; nb_participants: number; nb_parts: number;
  tours_total: number; tours_verses: number; total_verse: number; solde_jeu: number; mises_en_retard: number;
}

export type TypeRapportArchive = 'financier' | 'cotisations' | 'prets' | 'reunions' | 'tontines';

export interface RapportArchive {
  id: string;
  type: TypeRapportArchive;
  titre: string;
  periodeDebut?: string;
  periodeFin?: string;
  contenu: any;
  creePar?: string;
  dateCreation: string;
}

// ===== Appels =====

async function appeler<T>(fonction: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fonction, params);
  if (error) throw new Error(error.message);
  return data as T;
}

export const getRapportFinancier = (p: Periode) => appeler<RapportFinancier>('rapport_financier', { p_debut: p.debut, p_fin: p.fin });
export const getCoherence = () => appeler<Coherence[]>('rapport_coherence');
export const getRapportCotisations = (exerciceId?: string) => appeler<RapportCotisations>('rapport_cotisations', { p_exercice_id: exerciceId || null });
export const getRapportPrets = (p: Periode) => appeler<RapportPrets>('rapport_prets', { p_debut: p.debut, p_fin: p.fin });
export const getRapportReunions = (p: Periode) => appeler<RapportReunions>('rapport_reunions', { p_debut: p.debut, p_fin: p.fin });
export const getRapportTontines = () => appeler<RapportTontine[]>('rapport_tontines');
export const recalculerSoldeCaisse = (caisseId: string) => appeler<number>('recalculer_solde_caisse', { p_caisse_id: caisseId });

export const archiverRapport = (type: TypeRapportArchive, titre: string, p: Periode, userId: string, exerciceId?: string) =>
  appeler<string>('archiver_rapport', { p_type: type, p_titre: titre, p_debut: p.debut, p_fin: p.fin, p_user: userId, p_exercice_id: exerciceId || null });

export async function getArchives(): Promise<RapportArchive[]> {
  const { data, error } = await supabase.from('rapports_archives').select('*').order('date_creation', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(a => ({
    id: a.id, type: a.type, titre: a.titre, periodeDebut: a.periode_debut ?? undefined, periodeFin: a.periode_fin ?? undefined,
    contenu: a.contenu, creePar: a.cree_par ?? undefined, dateCreation: a.date_creation
  }));
}

// ===== Exports =====

export interface SectionRapport {
  titre: string;
  colonnes: string[];
  lignes: (string | number)[][];
}

const echapperCsv = (v: string | number) => {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV pour Excel : séparateur « ; » et BOM UTF-8 pour conserver les accents
export function telechargerCsv(nomFichier: string, sections: SectionRapport[]) {
  const contenu = sections.map(s => [
    echapperCsv(s.titre),
    s.colonnes.map(echapperCsv).join(';'),
    ...s.lignes.map(l => l.map(echapperCsv).join(';'))
  ].join('\r\n')).join('\r\n\r\n');
  const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nomFichier}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Page imprimable (le navigateur permet « Enregistrer au format PDF »)
export function imprimerRapport(titre: string, sousTitre: string, sections: SectionRapport[]) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:32px;font-size:12px}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:22px 0 8px;border-bottom:2px solid #4f46e5;padding-bottom:4px}
  table{width:100%;border-collapse:collapse} th,td{padding:5px 7px;border-bottom:1px solid #e5e7eb;text-align:left}
  th{background:#f3f4f6;font-size:10px;text-transform:uppercase} td.n{text-align:right}
  .muted{color:#6b7280} @media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="float:right;padding:8px 16px">Imprimer / Enregistrer en PDF</button>
<h1>${esc(titre)}</h1><p class="muted">${esc(sousTitre)}<br>Édité le ${new Date().toLocaleDateString('fr-FR')}</p>
${sections.map(s => `<h2>${esc(s.titre)}</h2>${s.lignes.length === 0 ? '<p class="muted">Aucune donnée</p>' : `<table><tr>${s.colonnes.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${s.lignes.map(l => `<tr>${l.map(c => `<td class="${typeof c === 'number' ? 'n' : ''}">${esc(typeof c === 'number' ? Math.round(c).toLocaleString('fr-FR') : c)}</td>`).join('')}</tr>`).join('')}</table>`}`).join('')}
</body></html>`;
  const fenetre = window.open('', '_blank');
  if (!fenetre) {
    notifier('Le navigateur a bloqué l’ouverture du rapport. Autorisez les fenêtres pop-up pour ce site.');
    return;
  }
  fenetre.document.open();
  fenetre.document.write(html);
  fenetre.document.close();
}
