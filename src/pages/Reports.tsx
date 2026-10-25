import { CarteGraphique, GraphSolde, GraphFlux, GraphRepartition } from '../components/Charts';
import { useConfirmation } from '../components/ui';
import { PageSkeleton } from '../components/Skeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Download, Printer, Archive, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  Periode, RapportFinancier, Coherence, RapportCotisations, RapportPrets, RapportReunions, RapportTontine, RapportArchive,
  TypeRapportArchive, SectionRapport, getRapportFinancier, getCoherence, getRapportCotisations, getRapportPrets,
  getRapportReunions, getRapportTontines, getArchives, archiverRapport, recalculerSoldeCaisse, telechargerCsv, imprimerRapport
} from '../lib/rapports';

type Onglet = 'financier' | 'coherence' | 'cotisations' | 'prets' | 'reunions' | 'tontines' | 'interets' | 'archives';
type ModePeriode = 'exercice' | 'mois' | 'libre';

const inputClass = 'px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm';

const typeLabels: Record<string, string> = {
  cotisation: 'Cotisations', epargne: 'Épargne', depense: 'Dépenses', penalite: 'Amendes', don: 'Dons',
  remboursement: 'Remboursements', pret: 'Prêts', distribution: 'Distributions', interet: 'Intérêts'
};
const statutPretLabels: Record<string, string> = { en_attente: 'En attente', approuve: 'Approuvé', en_cours: 'En cours', rembourse: 'Remboursé', rejete: 'Rejeté' };
const statutTontineLabels: Record<string, string> = { inscriptions: 'Inscriptions', planifiee: 'Inscriptions', en_cours: 'En cours', terminee: 'Terminée', suspendue: 'Suspendue' };

const pad = (n: number) => String(n).padStart(2, '0');
const isoJour = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateFr = (s: string) => new Date(s).toLocaleDateString('fr-FR');

// ===== Construction des tableaux (utilisés pour l'affichage, le CSV et le PDF) =====

function sectionsFinancier(r: RapportFinancier): SectionRapport[] {
  const sections: SectionRapport[] = [
    {
      titre: 'Soldes par caisse',
      colonnes: ['Caisse', 'Solde d\'ouverture', 'Entrées', 'Sorties', 'Solde de clôture'],
      lignes: [
        ...r.caisses.map(c => [c.nom, c.solde_ouverture, c.entrees, c.sorties, c.solde_cloture]),
        ['TOTAL', r.solde_ouverture, r.total_entrees, r.total_sorties, r.solde_cloture]
      ]
    },
    {
      titre: 'Mouvements par type',
      colonnes: ['Catégorie', 'Type', 'Nombre', 'Total'],
      lignes: r.par_type.map(t => [t.categorie === 'entree' ? 'Entrée' : 'Sortie', typeLabels[t.type] || t.type, t.nb, t.total])
    },
    {
      titre: 'Évolution mensuelle',
      colonnes: ['Mois', 'Entrées', 'Sorties', 'Solde en fin de mois'],
      lignes: r.mensuel.map(m => [m.mois, m.entrees, m.sorties, m.solde_fin])
    }
  ];
  if (r.coherence) sections.push(sectionCoherence(r.coherence));
  return sections;
}

function sectionCoherence(c: Coherence[]): SectionRapport {
  return {
    titre: 'Contrôle de cohérence des caisses',
    colonnes: ['Caisse', 'Solde enregistré', 'Solde recalculé', 'Écart', 'Mouvements en attente'],
    lignes: c.map(x => [x.nom, x.solde_enregistre, x.solde_calcule, x.ecart, x.nb_en_attente])
  };
}

function sectionsCotisations(r: RapportCotisations): SectionRapport[] {
  const lignes = r.membres.map(m => {
    const versements = r.caisses.map(c => Number(m.versements?.[c.caisse_id] || 0));
    const du = r.caisses.reduce((s, c) => s + c.montant_annuel, 0);
    const verse = r.caisses.reduce((s, c, i) => s + Math.min(versements[i], c.montant_annuel), 0);
    return [m.nom, ...versements, du, verse, du - verse];
  });
  return [{
    titre: `Cotisations obligatoires${r.exercice.annee ? ` - exercice ${r.exercice.annee}` : ''}`,
    colonnes: ['Membre', ...r.caisses.map(c => `${c.nom} (${c.montant_annuel.toLocaleString('fr-FR')})`), 'Total dû', 'Total versé', 'Reste à payer'],
    lignes
  }];
}

function sectionsPrets(r: RapportPrets): SectionRapport[] {
  return [
    {
      titre: 'Indicateurs',
      colonnes: ['Indicateur', 'Valeur'],
      lignes: [
        ['Total prêté sur la période', r.total_prete], ['Total remboursé', r.total_rembourse], ['Intérêts générés', r.interets_percus],
        ['Encours actuel', r.encours], ['Prêts en retard', r.nb_en_retard], ['Montant en retard', r.montant_en_retard]
      ]
    },
    {
      titre: 'Détail des prêts',
      colonnes: ['Membre', 'Motif', 'Montant', 'Remboursé', 'Reste dû', 'Taux %', 'Échéance', 'Statut', 'En retard'],
      lignes: r.details.map(p => [p.membre, p.motif, p.montant, p.rembourse, p.montant_restant, p.taux_interet, dateFr(p.date_echeance), statutPretLabels[p.statut] || p.statut, p.en_retard ? 'Oui' : 'Non'])
    }
  ];
}

function sectionsReunions(r: RapportReunions): SectionRapport[] {
  return [
    {
      titre: 'Réunions',
      colonnes: ['Date', 'Titre', 'Lieu', 'Présents', 'Absents', 'Retards', 'Cotisations', 'Amendes', 'Dépenses', 'Décisions', 'PV'],
      lignes: r.reunions.map(x => [dateFr(x.date), x.titre, x.lieu, x.presents, x.absents, x.retards, x.total_cotisations, x.total_amendes, x.total_depenses, x.nb_decisions,
        x.statut_pv === 'valide' ? 'Validé' : x.statut_pv === 'redige' ? 'Rédigé' : 'Non rédigé'])
    },
    {
      titre: 'Assiduité par membre',
      colonnes: ['Membre', 'Réunions', 'Présences', 'Retards', 'Taux de présence %'],
      lignes: r.membres.map(m => [m.nom, m.reunions, m.presences, m.retards, m.reunions > 0 ? Math.round((m.presences / m.reunions) * 100) : 0])
    }
  ];
}

function sectionsTontines(t: RapportTontine[]): SectionRapport[] {
  return [{
    titre: 'Jeux de tontine',
    colonnes: ['Jeu', 'Statut', 'Mise', 'Participants', 'Parts', 'Tours versés', 'Total versé', 'Solde du jeu', 'Mises en retard'],
    lignes: t.map(x => [x.nom, statutTontineLabels[x.statut] || x.statut, x.mise, x.nb_participants, x.nb_parts, `${x.tours_verses}/${x.tours_total}`, x.total_verse, x.solde_jeu, x.mises_en_retard])
  }];
}

function sectionsArchive(a: RapportArchive): SectionRapport[] {
  switch (a.type) {
    case 'financier': return sectionsFinancier(a.contenu);
    case 'cotisations': return sectionsCotisations(a.contenu);
    case 'prets': return sectionsPrets(a.contenu);
    case 'reunions': return sectionsReunions(a.contenu);
    case 'tontines': return sectionsTontines(a.contenu);
  }
}

export default function Reports({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [confirmer, fenetreConfirmation] = useConfirmation();
  const { exercices, currentUser, parametres, getDistributionsInterets, users } = useApp();
  const [onglet, setOnglet] = useState<Onglet>('financier');
  const [mode, setMode] = useState<ModePeriode>('exercice');
  const exerciceOuvert = exercices.find(e => e.statut === 'ouvert') || exercices[0];
  const [exerciceId, setExerciceId] = useState(exerciceOuvert?.id || '');
  const [mois, setMois] = useState(isoJour(new Date()).slice(0, 7));
  const [libreDebut, setLibreDebut] = useState(`${new Date().getFullYear()}-01-01`);
  const [libreFin, setLibreFin] = useState(isoJour(new Date()));

  const [financier, setFinancier] = useState<RapportFinancier>();
  const [coherence, setCoherence] = useState<Coherence[]>();
  const [cotisations, setCotisations] = useState<RapportCotisations>();
  const [prets, setPrets] = useState<RapportPrets>();
  const [reunions, setReunions] = useState<RapportReunions>();
  const [tontines, setTontines] = useState<RapportTontine[]>();
  const [interets, setInterets] = useState<SectionRapport[]>();
  const [archives, setArchives] = useState<RapportArchive[]>();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const [message, setMessage] = useState<string>();

  const role = currentUser?.role;
  const acces = ['admin', 'presidente', 'tresoriere', 'commissaire', 'secretaire'].includes(role || '');
  const peutArchiver = role === 'admin' || role === 'presidente' || role === 'tresoriere';
  const formatMontant = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' ' + parametres.devise;

  const periode: Periode = useMemo(() => {
    if (mode === 'exercice') {
      const ex = exercices.find(e => e.id === exerciceId) || exerciceOuvert;
      return { debut: ex?.dateOuverture?.slice(0, 10) || `${new Date().getFullYear()}-01-01`, fin: ex?.dateCloture?.slice(0, 10) || isoJour(new Date()) };
    }
    if (mode === 'mois') {
      const [a, m] = mois.split('-').map(Number);
      return { debut: `${a}-${pad(m)}-01`, fin: isoJour(new Date(a, m, 0)) };
    }
    return { debut: libreDebut, fin: libreFin };
  }, [mode, exerciceId, mois, libreDebut, libreFin, exercices, exerciceOuvert]);

  const periodeValide = periode.debut && periode.fin && periode.fin >= periode.debut;
  const exerciceCible = mode === 'exercice' ? exerciceId || undefined : undefined;

  const charger = useCallback(async () => {
    if (!acces) return;
    setChargement(true);
    setErreur(undefined);
    try {
      if (onglet === 'financier' && periodeValide) setFinancier(await getRapportFinancier(periode));
      if (onglet === 'coherence') setCoherence(await getCoherence());
      if (onglet === 'cotisations') setCotisations(await getRapportCotisations(exerciceCible));
      if (onglet === 'prets' && periodeValide) setPrets(await getRapportPrets(periode));
      if (onglet === 'reunions' && periodeValide) setReunions(await getRapportReunions(periode));
      if (onglet === 'tontines') setTontines(await getRapportTontines());
      if (onglet === 'archives') setArchives(await getArchives());
      if (onglet === 'interets') {
        const liste = (await getDistributionsInterets()).filter(d => d.statut === 'executee');
        const nom = (id: string) => { const u = users.find(x => x.id === id); return u ? `${u.prenom} ${u.nom}` : '—'; };
        setInterets(liste.map(d => ({
          titre: `Distribution du ${dateFr(d.dateDistribution)} (période depuis le ${dateFr(d.periodeDebut)}) - ${Math.round(d.montantTotal).toLocaleString('fr-FR')} ${parametres.devise}`,
          colonnes: ['Membre', 'Solde moyen', 'Part %', 'Montant reçu'],
          lignes: d.lignes.map(l => [nom(l.membreId), l.soldeMoyen, Math.round(l.partPct * 100) / 100, l.montant])
        })));
      }
    } catch (e: any) {
      setErreur(`${e.message} (migration update-rapports.sql exécutée ?)`);
    }
    setChargement(false);
  }, [onglet, periode, periodeValide, exerciceCible, acces]);

  useEffect(() => { charger(); }, [charger]);

  if (!acces) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
        <p className="text-gray-700 mb-3">Les rapports sont réservés au bureau.</p>
        {onNavigate && <button onClick={() => onNavigate('myspace')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Voir mon espace personnel</button>}
      </div>
    );
  }

  const sectionsActuelles = (): SectionRapport[] => {
    switch (onglet) {
      case 'financier': return financier ? sectionsFinancier(financier) : [];
      case 'coherence': return coherence ? [sectionCoherence(coherence)] : [];
      case 'cotisations': return cotisations ? sectionsCotisations(cotisations) : [];
      case 'prets': return prets ? sectionsPrets(prets) : [];
      case 'reunions': return reunions ? sectionsReunions(reunions) : [];
      case 'tontines': return tontines ? sectionsTontines(tontines) : [];
      case 'interets': return interets || [];
      default: return [];
    }
  };

  const titresOnglets: Record<Onglet, string> = {
    financier: 'Rapport financier', coherence: 'Cohérence des caisses', cotisations: 'Cotisations et retardataires', prets: 'Rapport des prêts',
    reunions: 'Réunions et assiduité', tontines: 'Rapport des tontines', interets: 'Intérêts distribués', archives: 'Archives'
  };
  const sousTitre = ['coherence', 'tontines', 'interets'].includes(onglet) ? 'Situation à ce jour' : `Période du ${dateFr(periode.debut)} au ${dateFr(periode.fin)}`;
  const nomFichier = `${onglet}-${isoJour(new Date())}`;

  const exporterCsv = () => telechargerCsv(nomFichier, sectionsActuelles());
  const exporterPdf = () => imprimerRapport(titresOnglets[onglet], sousTitre, sectionsActuelles());

  const archivable: TypeRapportArchive | null = ['financier', 'cotisations', 'prets', 'reunions', 'tontines'].includes(onglet) ? (onglet as TypeRapportArchive) : null;
  const archiver = async () => {
    if (!archivable || !currentUser) return;
    if (!(await confirmer({ titre: 'Archiver le rapport', message: 'Archiver ce rapport ? Une copie figée sera conservée et ne pourra plus être modifiée.', action: 'Archiver' }))) return;
    try {
      await archiverRapport(archivable, `${titresOnglets[onglet]} - ${sousTitre}`, periode, currentUser.id, exerciceCible);
      setMessage('Rapport archivé');
      setTimeout(() => setMessage(undefined), 4000);
    } catch (e: any) {
      setErreur(e.message);
    }
  };

  const recalculer = async (c: Coherence) => {
    if (!(await confirmer({ titre: 'Recalculer le solde', message: `Remettre le solde de « ${c.nom} » à ${formatMontant(c.solde_calcule)} (somme de ses mouvements validés) ?`, action: 'Recalculer' }))) return;
    try {
      await recalculerSoldeCaisse(c.caisse_id);
      await charger();
    } catch (e: any) {
      setErreur(e.message);
    }
  };

  const onglets: { id: Onglet; label: string }[] = [
    { id: 'financier', label: 'Financier' }, { id: 'coherence', label: 'Cohérence' }, { id: 'cotisations', label: 'Cotisations' },
    { id: 'prets', label: 'Prêts' }, { id: 'reunions', label: 'Réunions' }, { id: 'tontines', label: 'Tontines' },
    { id: 'interets', label: 'Intérêts' }, { id: 'archives', label: 'Archives' }
  ];
  const avecPeriode = ['financier', 'prets', 'reunions'].includes(onglet) || (onglet === 'cotisations');

  const Tableau = ({ section }: { section: SectionRapport }) => (
    <div className="zoom zoom-lg bg-white rounded-2xl p-6 border border-sable">
      <h3 className="text-base font-bold text-gray-800 mb-3">{section.titre}</h3>
      {section.lignes.length === 0 ? <p className="text-sm text-gray-500">Aucune donnée</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
              {section.colonnes.map((c, i) => <th key={i} className={`py-2 pr-3 ${i > 0 ? 'text-right' : ''}`}>{c}</th>)}
            </tr></thead>
            <tbody>
              {section.lignes.map((l, i) => (
                <tr key={i} className={`border-b border-gray-50 ${l[0] === 'TOTAL' ? 'font-bold bg-gray-50' : ''}`}>
                  {l.map((c, j) => <td key={j} className={`py-2 pr-3 ${j > 0 ? 'text-right' : ''} text-gray-700`}>{typeof c === 'number' ? Math.round(c * 100) / 100 === Math.round(c) ? Math.round(c).toLocaleString('fr-FR') : c.toLocaleString('fr-FR') : c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const Kpi = ({ label, valeur, couleur = 'text-encre' }: { label: string; valeur: string; couleur?: string }) => (
    <div className="zoom bg-white rounded-2xl p-4 border border-sable"><p className="text-sm text-gray-500">{label}</p><p className={`text-2xl font-bold ${couleur}`} style={{ fontFamily: 'var(--font-display)' }}>{valeur}</p></div>
  );

  const entreesParType = (financier?.par_type || []).filter(t => t.categorie === 'entree').map(t => ({ name: typeLabels[t.type] || t.type, value: t.total }));
  const sections = sectionsActuelles();

  return (
    <div className="space-y-6">
      {fenetreConfirmation}
      <div className="flex flex-wrap gap-2">
        {onglets.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${onglet === o.id ? 'bg-encre text-creme' : 'bg-white border border-sable text-gray-600 hover:bg-gray-50'}`}>{o.label}</button>
        ))}
      </div>

      {avecPeriode && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Période</label>
            <select value={mode} onChange={e => setMode(e.target.value as ModePeriode)} className={inputClass}>
              <option value="exercice">Exercice</option><option value="mois">Mois</option><option value="libre">Dates libres</option>
            </select>
          </div>
          {mode === 'exercice' && (
            <select value={exerciceId} onChange={e => setExerciceId(e.target.value)} className={inputClass}>
              {exercices.map(e => <option key={e.id} value={e.id}>Exercice {e.annee}{e.statut === 'ouvert' ? ' (ouvert)' : ''}</option>)}
            </select>
          )}
          {mode === 'mois' && <input type="month" value={mois} onChange={e => setMois(e.target.value)} className={inputClass} />}
          {mode === 'libre' && (
            <>
              <input type="date" value={libreDebut} onChange={e => setLibreDebut(e.target.value)} className={inputClass} />
              <input type="date" value={libreFin} onChange={e => setLibreFin(e.target.value)} className={inputClass} />
            </>
          )}
          {onglet === 'cotisations' && mode !== 'exercice' && <p className="text-xs text-gray-500">Les cotisations se calculent par exercice (exercice ouvert).</p>}
          {!periodeValide && <p className="text-sm text-red-600">La date de fin doit être postérieure à la date de début.</p>}
        </div>
      )}

      {onglet !== 'archives' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">{titresOnglets[onglet]} · {sousTitre}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={charger} className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"><RefreshCw size={14} /> Actualiser</button>
            <button disabled={sections.length === 0} onClick={exporterCsv} className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-40"><Download size={14} /> CSV</button>
            <button disabled={sections.length === 0} onClick={exporterPdf} className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-40"><Printer size={14} /> PDF</button>
            {archivable && peutArchiver && <button disabled={sections.length === 0} onClick={archiver} className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"><Archive size={14} /> Archiver</button>}
          </div>
        </div>
      )}

      {message && <p className="text-sm text-green-700 bg-green-50 rounded-xl p-3">{message}</p>}
      {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{erreur}</p>}
      {chargement && <PageSkeleton cartes={3} />}

      {/* Rapport financier */}
      {onglet === 'financier' && financier && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Solde d'ouverture" valeur={formatMontant(financier.solde_ouverture)} />
            <Kpi label="Entrées" valeur={formatMontant(financier.total_entrees)} couleur="text-green-700" />
            <Kpi label="Sorties" valeur={formatMontant(financier.total_sorties)} couleur="text-terre" />
            <Kpi label="Solde de clôture" valeur={formatMontant(financier.solde_cloture)} couleur="text-encre" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CarteGraphique titre="Évolution du solde" sousTitre="Solde de fin de mois">
              <GraphSolde data={financier.mensuel} formatMontant={formatMontant} />
            </CarteGraphique>
            <CarteGraphique titre="Entrées et sorties" sousTitre="Flux validés, mois par mois">
              <GraphFlux data={financier.mensuel} formatMontant={formatMontant} />
            </CarteGraphique>
          </div>
          {entreesParType.length > 0 && (
            <CarteGraphique titre="Répartition des entrées" sousTitre="D'où vient l'argent de l'exercice">
              <GraphRepartition data={entreesParType} formatMontant={formatMontant} />
            </CarteGraphique>
          )}
        </>
      )}

      {/* Cohérence */}
      {onglet === 'coherence' && coherence && (
        <>
          {coherence.every(c => Math.abs(c.ecart) < 1)
            ? <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3"><CheckCircle2 size={16} /> Tous les soldes correspondent à la somme des mouvements validés.</p>
            : <p className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl p-3"><AlertTriangle size={16} /> Des soldes ne correspondent pas aux mouvements validés.</p>}
          <div className="bg-white rounded-2xl p-6 border border-sable overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                <th className="py-2 pr-3">Caisse</th><th className="py-2 pr-3 text-right">Solde enregistré</th><th className="py-2 pr-3 text-right">Solde recalculé</th><th className="py-2 pr-3 text-right">Écart</th><th className="py-2 pr-3 text-right">En attente</th><th />
              </tr></thead>
              <tbody>
                {coherence.map(c => (
                  <tr key={c.caisse_id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-800">{c.nom}</td>
                    <td className="py-2 pr-3 text-right">{formatMontant(c.solde_enregistre)}</td>
                    <td className="py-2 pr-3 text-right">{formatMontant(c.solde_calcule)}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${Math.abs(c.ecart) < 1 ? 'text-green-600' : 'text-red-600'}`}>{Math.abs(c.ecart) < 1 ? '0' : formatMontant(c.ecart)}</td>
                    <td className="py-2 pr-3 text-right text-gray-500">{c.nb_en_attente}</td>
                    <td className="py-2 text-right">{role === 'admin' && Math.abs(c.ecart) >= 1 && <button onClick={() => recalculer(c)} className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">Recalculer</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-3">Un écart peut venir d'un solde initial saisi sans mouvement. Il n'est jamais corrigé automatiquement.</p>
          </div>
        </>
      )}

      {/* Indicateurs prêts */}
      {onglet === 'prets' && prets && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Prêté sur la période" valeur={formatMontant(prets.total_prete)} />
          <Kpi label="Remboursé" valeur={formatMontant(prets.total_rembourse)} couleur="text-green-700" />
          <Kpi label="Intérêts générés" valeur={formatMontant(prets.interets_percus)} couleur="text-green-700" />
          <Kpi label="Encours" valeur={formatMontant(prets.encours)} couleur="text-terre" />
          <Kpi label="Prêts en retard" valeur={String(prets.nb_en_retard)} couleur={prets.nb_en_retard > 0 ? 'text-red-600' : 'text-gray-800'} />
          <Kpi label="Montant en retard" valeur={formatMontant(prets.montant_en_retard)} couleur={prets.montant_en_retard > 0 ? 'text-red-600' : 'text-gray-800'} />
        </div>
      )}

      {/* Tableaux des rapports */}
      {onglet !== 'archives' && onglet !== 'coherence' && !(onglet === 'prets' && prets) && sections.map((s, i) => <Tableau key={i} section={s} />)}
      {onglet === 'prets' && prets && sections.slice(1).map((s, i) => <Tableau key={i} section={s} />)}
      {onglet === 'interets' && interets && interets.length === 0 && <p className="text-sm text-gray-500">Aucune distribution exécutée</p>}

      {/* Archives */}
      {onglet === 'archives' && (
        <div className="bg-white rounded-2xl border border-sable overflow-hidden">
          {(archives || []).length === 0 && !chargement && <p className="p-6 text-sm text-gray-500">Aucun rapport archivé</p>}
          {(archives || []).map(a => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-gray-50">
              <div>
                <p className="font-medium text-gray-800">{a.titre}</p>
                <p className="text-xs text-gray-500">Archivé le {new Date(a.dateCreation).toLocaleDateString('fr-FR')}{a.creePar ? ` par ${users.find(u => u.id === a.creePar)?.prenom || ''} ${users.find(u => u.id === a.creePar)?.nom || ''}` : ' (automatique)'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => telechargerCsv(`${a.type}-archive-${a.dateCreation.slice(0, 10)}`, sectionsArchive(a))} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-50"><Download size={12} /> CSV</button>
                <button onClick={() => imprimerRapport(a.titre, a.periodeDebut ? `Période du ${dateFr(a.periodeDebut)} au ${dateFr(a.periodeFin || a.periodeDebut)}` : 'Rapport archivé', sectionsArchive(a))} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-50"><Printer size={12} /> PDF</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
