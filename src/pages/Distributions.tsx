import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Wallet, Calculator, Check, Trash2, Play, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { DistributionInterets, LigneDistributionInterets } from '../types';
import { joursEntre } from '../lib/prorata';
import { useConfirmation } from '../components/ui';

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500';
const statutLabels = { brouillon: 'Brouillon', validee: 'Validée', executee: 'Exécutée' };
const statutColors = { brouillon: 'bg-amber-100 text-amber-700', validee: 'bg-blue-100 text-blue-700', executee: 'bg-green-100 text-green-700' };

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export default function Distributions() {
  const {
    caisses, users, exercices, simulerDistributionInterets, getDistributionsInterets, creerDistributionInterets,
    supprimerDistributionInterets, validerDistributionInterets, executerDistributionInterets, currentUser, parametres
  } = useApp();

  const [confirmer, fenetreConfirmation] = useConfirmation();
  const [historique, setHistorique] = useState<DistributionInterets[]>([]);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState(aujourdhui());
  const [reserve, setReserve] = useState('0');
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const role = currentUser?.role;
  const canCalculer = role === 'admin' || role === 'tresoriere' || role === 'presidente';
  const canValider = role === 'admin' || role === 'presidente';

  const formatMontant = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' ' + parametres.devise;
  const nomMembre = (id: string) => {
    const u = users.find(x => x.id === id);
    return u ? `${u.prenom} ${u.nom}` : '—';
  };

  const caisseInterets = caisses.find(c => c.type === 'interets' && c.actif);
  const caissesBase = caisses.filter(c => c.type === 'epargne' || c.type === 'scolaire');
  const epargneTotale = caissesBase.reduce((s, c) => s + c.solde, 0);

  const recharger = useCallback(async () => {
    const liste = await getDistributionsInterets();
    setHistorique(liste);
    return liste;
  }, [getDistributionsInterets]);

  // Début de période par défaut : dernière distribution exécutée, sinon ouverture de l'exercice
  useEffect(() => {
    recharger().then(liste => {
      const derniere = liste.find(d => d.statut === 'executee');
      const exercice = exercices.find(e => e.statut === 'ouvert');
      setDebut(derniere?.dateDistribution || exercice?.dateOuverture?.slice(0, 10) || `${new Date().getFullYear()}-01-01`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enAttente = historique.find(d => d.statut !== 'executee');
  const executees = historique.filter(d => d.statut === 'executee');

  const reservePct = Math.min(99, Math.max(0, parseFloat(reserve) || 0));
  const simulation = useMemo(
    () => (debut && fin && fin >= debut ? simulerDistributionInterets(debut, fin, reservePct) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debut, fin, reservePct, caisses, users]
  );

  const enregistrer = async () => {
    setEnCours(true);
    if (await creerDistributionInterets(debut, fin, reservePct)) await recharger();
    setEnCours(false);
  };

  const valider = async (id: string) => {
    setEnCours(true);
    await validerDistributionInterets(id);
    await recharger();
    setEnCours(false);
  };

  const executer = async (d: DistributionInterets) => {
    if (!(await confirmer({ titre: 'Exécuter la distribution', message: `Exécuter la distribution de ${formatMontant(d.montantTotal)} ? Les montants seront crédités sur l'Épargne Individuelle des membres. Cette action est définitive.`, action: 'Exécuter' }))) return;
    setEnCours(true);
    await executerDistributionInterets(d.id);
    await recharger();
    setEnCours(false);
  };

  const supprimer = async (id: string) => {
    if (!(await confirmer({ titre: 'Supprimer le brouillon', message: 'Supprimer ce brouillon ?', action: 'Supprimer' }))) return;
    await supprimerDistributionInterets(id);
    await recharger();
  };

  const Tableau = ({ lignes, total }: { lignes: LigneDistributionInterets[]; total: number }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
            <th className="py-2 pr-3">Membre</th>
            <th className="py-2 pr-3 text-right">Solde moyen</th>
            <th className="py-2 pr-3 text-right">Part</th>
            <th className="py-2 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.membreId} className="border-b border-gray-50">
              <td className="py-2 pr-3 text-gray-800">{nomMembre(l.membreId)}</td>
              <td className="py-2 pr-3 text-right text-gray-600">{formatMontant(l.soldeMoyen)}</td>
              <td className="py-2 pr-3 text-right text-gray-600">{l.partPct.toFixed(2)} %</td>
              <td className="py-2 text-right font-semibold text-emerald-600">{formatMontant(l.montant)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3} className="pt-3 font-bold text-gray-800">Total distribué</td><td className="pt-3 text-right font-bold text-gray-800">{formatMontant(total)}</td></tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {fenetreConfirmation}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-encre rounded-2xl p-5 text-creme">
          <p className="text-sm text-sable">Caisse Intérêts (à distribuer)</p>
          <p className="text-3xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(caisseInterets?.solde ?? 0)}</p>
        </div>
        <div className="bg-white border border-sable rounded-2xl p-5 text-encre">
          <p className="text-sm text-gray-500">Épargne + scolaire (base de calcul)</p>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(epargneTotale)}</p>
        </div>
        <div className="bg-white border border-sable rounded-2xl p-5 text-encre">
          <p className="text-sm text-gray-500">Dernière distribution</p>
          <p className="text-2xl font-bold">{executees[0] ? new Date(executees[0].dateDistribution).toLocaleDateString('fr-FR') : 'Aucune'}</p>
        </div>
      </div>

      <div className="flex gap-2 text-sm text-gray-600 bg-safran/15 border border-safran/40 rounded-xl p-4">
        <Info size={18} className="text-terre flex-shrink-0 mt-0.5" />
        <p>Les intérêts sont répartis <b>au prorata temporis</b> : chaque dépôt compte pour son montant multiplié par le nombre de jours passés dans la caisse jusqu'à la date de distribution, et chaque retrait en négatif. Les parts sont créditées sur l'Épargne Individuelle de chaque membre et la Caisse Intérêts est vidée.</p>
      </div>

      {/* Distribution en attente (brouillon ou validée) */}
      {enAttente && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">Distribution en cours <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[enAttente.statut]}`}>{statutLabels[enAttente.statut]}</span></h3>
              <p className="text-sm text-gray-500">Du {new Date(enAttente.periodeDebut).toLocaleDateString('fr-FR')} au {new Date(enAttente.dateDistribution).toLocaleDateString('fr-FR')} ({joursEntre(enAttente.periodeDebut, enAttente.dateDistribution)} jours) · {formatMontant(enAttente.montantTotal)}{enAttente.reservePct > 0 ? ` (réserve ${enAttente.reservePct} %)` : ''}</p>
            </div>
            <div className="flex gap-2">
              {canValider && enAttente.statut === 'brouillon' && <button disabled={enCours} onClick={() => valider(enAttente.id)} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"><Check size={16} /> Valider</button>}
              {canValider && enAttente.statut === 'validee' && <button disabled={enCours} onClick={() => executer(enAttente)} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"><Play size={16} /> Exécuter</button>}
              {canCalculer && <button disabled={enCours} onClick={() => supprimer(enAttente.id)} className="flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200 disabled:opacity-50"><Trash2 size={16} /> Supprimer</button>}
            </div>
          </div>
          <Tableau lignes={enAttente.lignes} total={enAttente.montantTotal} />
        </div>
      )}

      {/* Simulation */}
      {canCalculer && !enAttente && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Calculator size={20} /> Simuler une distribution</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Début de la période</label><input type="date" value={debut} onChange={e => setDebut(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date de distribution</label><input type="date" value={fin} onChange={e => setFin(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Réserve conservée (%)</label><input type="number" min="0" max="99" value={reserve} onChange={e => setReserve(e.target.value)} className={inputClass} /></div>
          </div>

          {!simulation ? (
            <p className="text-sm text-red-600">La date de distribution doit être postérieure au début de la période.</p>
          ) : simulation.lignes.length === 0 ? (
            <p className="text-sm text-gray-500">Rien à répartir : la Caisse Intérêts est vide ou aucun membre n'a d'épargne validée sur cette période.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">Montant distribué : <b>{formatMontant(simulation.montantTotal)}</b> sur {simulation.lignes.length} membres ({joursEntre(debut, fin)} jours)</p>
              <Tableau lignes={simulation.lignes} total={simulation.montantTotal} />
              <button disabled={enCours} onClick={enregistrer} className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"><Wallet size={18} /> Enregistrer en brouillon</button>
            </>
          )}
        </div>
      )}

      {/* Historique */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 pb-3"><h3 className="text-lg font-bold text-gray-800">Historique des distributions</h3></div>
        {executees.length === 0 && <p className="px-6 pb-6 text-sm text-gray-500">Aucune distribution exécutée</p>}
        {executees.map(d => (
          <div key={d.id} className="border-t border-gray-100">
            <button onClick={() => setOuverte(ouverte === d.id ? null : d.id)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 text-left">
              <div>
                <p className="font-medium text-gray-800">Distribution du {new Date(d.dateDistribution).toLocaleDateString('fr-FR')}</p>
                <p className="text-xs text-gray-500">Période depuis le {new Date(d.periodeDebut).toLocaleDateString('fr-FR')} · {d.lignes.length} membres</p>
              </div>
              <div className="flex items-center gap-3"><span className="font-bold text-emerald-600">{formatMontant(d.montantTotal)}</span>{ouverte === d.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
            </button>
            {ouverte === d.id && <div className="px-6 pb-4"><Tableau lignes={d.lignes} total={d.montantTotal} /></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
