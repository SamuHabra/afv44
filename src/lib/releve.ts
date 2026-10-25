import { notifier } from './notifier';
import { Mouvement, SituationMembre, User } from '../types';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

interface ReleveParams {
  membre: User;
  situation: SituationMembre;
  mouvements: Mouvement[];
  devise: string;
  getNomCaisse: (id: string) => string;
}

// Relevé de compte imprimable (le navigateur permet « Enregistrer au format PDF »)
export function ouvrirReleve({ membre, situation, mouvements, devise, getNomCaisse }: ReleveParams) {
  const m = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} ${esc(devise)}`;
  const d = (s: string) => new Date(s).toLocaleDateString('fr-FR');
  const debut = new Date(situation.exercice.debut).getTime();
  const fin = new Date(situation.exercice.fin).getTime();
  const lignes = mouvements
    .filter(x => x.statut === 'valide' && new Date(x.date).getTime() >= debut && new Date(x.date).getTime() <= fin)
    .sort((a, b) => a.date.localeCompare(b.date));

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Relevé ${esc(membre.prenom)} ${esc(membre.nom)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:32px;font-size:13px}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:24px 0 8px;border-bottom:2px solid #4f46e5;padding-bottom:4px}
  table{width:100%;border-collapse:collapse} th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left}
  th{background:#f3f4f6;font-size:11px;text-transform:uppercase} .r{text-align:right} .neg{color:#b91c1c} .pos{color:#15803d}
  .muted{color:#6b7280} @media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="float:right;padding:8px 16px">Imprimer / Enregistrer en PDF</button>
<h1>Relevé de compte</h1>
<p class="muted">${esc(membre.prenom)} ${esc(membre.nom)} · ${esc(membre.telephone)}<br>Exercice ${esc(situation.exercice.annee ?? '')} · du ${d(situation.exercice.debut)} au ${d(situation.exercice.fin)}<br>Édité le ${d(new Date().toISOString())}</p>

<h2>Situation par caisse</h2>
<table><tr><th>Caisse</th><th class="r">Obligation annuelle</th><th class="r">Versé</th><th class="r">Reste à payer</th><th class="r">Mon solde</th></tr>
${situation.caisses.map(c => `<tr><td>${esc(c.nom)}</td><td class="r">${c.montant_annuel ? m(c.montant_annuel) : '—'}</td><td class="r">${m(c.verse_exercice)}</td><td class="r ${c.reste_a_payer ? 'neg' : ''}">${c.reste_a_payer == null ? '—' : m(c.reste_a_payer)}</td><td class="r">${m(c.solde_membre)}</td></tr>`).join('')}
</table>

<h2>Prêts en cours</h2>
${situation.prets.length === 0 ? '<p class="muted">Aucun prêt en cours</p>' : `<table><tr><th>Motif</th><th class="r">Montant</th><th class="r">Reste dû</th><th>Échéance</th></tr>
${situation.prets.map(p => `<tr><td>${esc(p.motif)}</td><td class="r">${m(p.montant)}</td><td class="r">${m(p.montant_restant)}</td><td class="${p.en_retard ? 'neg' : ''}">${d(p.date_echeance)}${p.en_retard ? ' (en retard)' : ''}</td></tr>`).join('')}</table>`}

<h2>Assiduité</h2>
<p>Présence : ${situation.presence.presences} / ${situation.presence.reunions} réunions · Retards : ${situation.presence.retards} · Amendes de l'exercice : ${m(situation.amendes_exercice)}<br>Intérêts reçus (cumul) : ${m(situation.interets_recus)}</p>

<h2>Mouvements validés de l'exercice</h2>
${lignes.length === 0 ? '<p class="muted">Aucun mouvement</p>' : `<table><tr><th>Date</th><th>Description</th><th>Caisse</th><th class="r">Montant</th></tr>
${lignes.map(x => `<tr><td>${d(x.date)}</td><td>${esc(x.description)}</td><td>${esc(getNomCaisse(x.caisseId))}</td><td class="r ${x.categorie === 'entree' ? 'pos' : 'neg'}">${x.categorie === 'entree' ? '+' : '-'}${m(x.montant)}</td></tr>`).join('')}</table>`}
</body></html>`;

  const fenetre = window.open('', '_blank');
  if (!fenetre) {
    notifier('Le navigateur a bloqué l’ouverture du relevé. Autorisez les fenêtres pop-up pour ce site.');
    return;
  }
  fenetre.document.open();
  fenetre.document.write(html);
  fenetre.document.close();
}
