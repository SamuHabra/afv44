import { notifier } from '../lib/notifier';
import { KenteBand, SunDisc } from '../components/Motifs';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Plus, Calendar, MapPin, Clock, Users, X, Check, Play, Square, UserCheck, Gavel, FileText, Wallet, ListChecks, Home } from 'lucide-react';
import ReunionMouvements from '../components/ReunionMouvements';
import { useBaremeAmendes } from '../hooks/useBaremeAmendes';
import { StatutReunion, TypeAmende, AmendeReunion } from '../types';

const amendeLabels: Record<TypeAmende, string> = {
  retard: 'Retard',
  bavardage: 'Bavardage',
  querelle: 'Querelle',
  dresscode: 'Dress code',
  cotisation: 'Échec cotisation'
};

const statutLabels: Record<StatutReunion, string> = { planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' };
const statutColors: Record<StatutReunion, string> = { planifiee: 'bg-blue-100 text-blue-700', en_cours: 'bg-amber-100 text-amber-700', terminee: 'bg-green-100 text-green-700', annulee: 'bg-red-100 text-red-700' };
const pvLabels = { non_redige: 'PV non rédigé', redige: 'PV rédigé', valide: 'PV validé' };
const pvColors = { non_redige: 'bg-gray-100 text-gray-600', redige: 'bg-amber-100 text-amber-700', valide: 'bg-green-100 text-green-700' };

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500';

export default function Meetings() {
  const {
    reunions, users, mouvements, addReunion, updateReunion, togglePresence, toggleCotisation, marquerRetard,
    demarrerReunion, terminerReunion, addAmende, getAmendesReunion, addDecision, addAction, toggleAction,
    genererRapportFinancier, redigerPV, validerPV, getProchainHote, getStatsReunion, getStatsReunions,
    getExerciceActuel, currentUser, parametres
  } = useApp();

  const bareme = useBaremeAmendes();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<'all' | StatutReunion>('all');
  const [amendes, setAmendes] = useState<AmendeReunion[]>([]);
  const [amendeMembre, setAmendeMembre] = useState('');
  const [pvTexte, setPvTexte] = useState('');
  const [decisionTexte, setDecisionTexte] = useState('');
  const [actionTexte, setActionTexte] = useState('');
  const [actionResponsable, setActionResponsable] = useState('');

  const [formTitre, setFormTitre] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formHeure, setFormHeure] = useState('15:00');
  const [formHote, setFormHote] = useState('');
  const [formLieu, setFormLieu] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrdreDuJour, setFormOrdreDuJour] = useState('');
  const [formDistribution, setFormDistribution] = useState('');

  const role = currentUser?.role;
  const canManage = role === 'admin' || role === 'presidente' || role === 'secretaire';
  const canAmende = role === 'admin' || role === 'secretaire';
  const canSaisir = role === 'admin' || role === 'presidente' || role === 'tresoriere' || role === 'secretaire';
  const canRapport = role === 'admin' || role === 'tresoriere';
  const canRedigerPV = role === 'admin' || role === 'secretaire';
  const canValiderPV = role === 'admin' || role === 'presidente';

  const formatMontant = (n: number) => n.toLocaleString('fr-FR') + ' ' + parametres.devise;
  const nomMembre = (id?: string) => {
    const u = users.find(x => x.id === id);
    return u ? `${u.prenom} ${u.nom}` : '—';
  };

  const stats = getStatsReunions();
  const selected = selectedId ? reunions.find(r => r.id === selectedId) : null;

  // Charge les amendes de la réunion ouverte (et les recharge quand son total change)
  useEffect(() => {
    if (!selected) { setAmendes([]); return; }
    getAmendesReunion(selected.id).then(setAmendes);
    setPvTexte(selected.compteRendu || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.totalAmendes]);

  const ouvrirAjout = () => {
    const hote = getProchainHote();
    setFormHote(hote?.id || '');
    setFormLieu(hote ? `Chez ${hote.prenom} ${hote.nom}` : '');
    setShowAddModal(true);
  };

  const changerHote = (id: string) => {
    setFormHote(id);
    const u = users.find(x => x.id === id);
    if (u) setFormLieu(`Chez ${u.prenom} ${u.nom}`);
  };

  const handleAdd = () => {
    if (!formTitre || !formDate || !formHeure || !formLieu) return;
    addReunion({
      titre: formTitre, date: formDate, heure: formHeure, lieu: formLieu, description: formDescription,
      ordreDuJour: formOrdreDuJour.split('\n').filter(x => x.trim()), decisions: [], compteRendu: '',
      statut: 'planifiee', distributionMontant: formDistribution ? parseInt(formDistribution) : undefined,
      exerciceId: getExerciceActuel()?.id || '', hoteId: formHote || undefined
    });
    setFormTitre(''); setFormDate(''); setFormHeure('15:00'); setFormLieu(''); setFormDescription(''); setFormOrdreDuJour(''); setFormDistribution('');
    setShowAddModal(false);
  };

  const handleAmende = async (type: TypeAmende) => {
    if (!selected || !amendeMembre) return;
    const ok = await addAmende(selected.id, amendeMembre, type);
    if (!ok) notifier('Amende non enregistrée (migration SQL exécutée ?)');
  };

  const sorted = reunions
    .filter(r => filtre === 'all' || r.statut === filtre)
    .sort((a, b) => {
      const order = { en_cours: 0, planifiee: 1, terminee: 2, annulee: 3 };
      if (order[a.statut] !== order[b.statut]) return order[a.statut] - order[b.statut];
      return b.date.localeCompare(a.date);
    });

  const mouvementsReunion = selected ? mouvements.filter(m => m.reunionId === selected.id) : [];
  const pvVerrouille = selected?.statutPV === 'valide';
  const enSeance = selected?.statut === 'en_cours';
  const historique = selected && (selected.statut === 'en_cours' || selected.statut === 'terminee');

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden bg-encre text-creme rounded-3xl">
        <SunDisc className="-top-20 -right-12 w-64 h-64" />
        <div className="relative px-6 py-6 lg:px-8 lg:py-7 grid grid-cols-2 lg:grid-cols-5 gap-5">
          <div><p className="text-xs uppercase tracking-widest text-sable">Réunions</p><p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{stats.total}</p></div>
          <div><p className="text-xs uppercase tracking-widest text-sable">Présence moyenne</p><p className="text-3xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{stats.tauxPresenceMoyen}%</p></div>
          <div><p className="text-xs uppercase tracking-widest text-sable">Cotisations</p><p className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(stats.totalCotisations)}</p></div>
          <div><p className="text-xs uppercase tracking-widest text-sable">Amendes</p><p className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(stats.totalAmendes)}</p></div>
          <div className="col-span-2 lg:col-span-1">
            <p className="text-xs uppercase tracking-widest text-sable">Prochaine réunion</p>
            <p className="text-sm font-bold text-safran mt-1">{stats.prochaine ? `${new Date(stats.prochaine.date).toLocaleDateString('fr-FR')} · ${stats.prochaine.titre}` : 'Aucune'}</p>
          </div>
        </div>
        <KenteBand height={10} />
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'planifiee', 'en_cours', 'terminee', 'annulee'] as const).map(f => (
            <button key={f} onClick={() => setFiltre(f)} className={`px-4 h-10 rounded-full text-sm font-medium transition ${filtre === f ? 'bg-encre text-creme' : 'bg-white border border-sable text-gray-600 hover:bg-gray-50'}`}>
              {f === 'all' ? 'Toutes' : statutLabels[f]}
            </button>
          ))}
        </div>
        {canManage && (
          <button onClick={ouvrirAjout} className="flex items-center justify-center gap-2 px-5 h-12 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12] hover:brightness-105 transition">
            <Plus size={18} /> Planifier une réunion
          </button>
        )}
      </div>

      <div className="space-y-4">
        {sorted.map(reunion => {
          const st = getStatsReunion(reunion.id)!;
          return (
            <div key={reunion.id} onClick={() => setSelectedId(reunion.id)} className="bg-white rounded-2xl p-6 border border-sable cursor-pointer transition hover:border-encre">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center bg-safran flex-shrink-0">
                    <span className="text-xs font-bold uppercase text-encre">{new Date(reunion.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                    <span className="text-xl font-bold text-encre">{new Date(reunion.date).getDate()}</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-800">{reunion.titre}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[reunion.statut]}`}>{statutLabels[reunion.statut]}</span>
                      {reunion.statut === 'terminee' && <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${pvColors[st.statutPV as keyof typeof pvColors]}`}>{pvLabels[st.statutPV as keyof typeof pvLabels]}</span>}
                    </div>
                    {reunion.description && <p className="text-sm text-gray-600 mb-2">{reunion.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={12} /> {reunion.heure}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {reunion.lieu}</span>
                      {(reunion.statut === 'en_cours' || reunion.statut === 'terminee') && (
                        <span className="flex items-center gap-1"><Users size={12} /> {st.presents} présents · {st.absents} absents · {st.retards} retards</span>
                      )}
                      {reunion.statut === 'terminee' && <span className="flex items-center gap-1"><Gavel size={12} /> {st.nbDecisions} décisions</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1 text-sm">
                  {reunion.totalCotisations > 0 && <p><span className="text-gray-500">Cotisations : </span><span className="font-bold text-green-600">{formatMontant(reunion.totalCotisations)}</span></p>}
                  {(reunion.totalAmendes || 0) > 0 && <p><span className="text-gray-500">Amendes : </span><span className="font-bold text-orange-600">{formatMontant(reunion.totalAmendes || 0)}</span></p>}
                  {reunion.distributionMontant && <p><span className="text-gray-500">Distribution : </span><span className="font-bold text-indigo-600">{formatMontant(reunion.distributionMontant)}</span></p>}
                </div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100"><Calendar size={48} className="mx-auto mb-3 text-gray-300" /><p>Aucune réunion</p></div>}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-gray-800">Planifier une réunion</h3><button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Titre</label><input type="text" value={formTitre} onChange={e => setFormTitre(e.target.value)} className={inputClass} placeholder="Réunion ordinaire..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Heure</label><input type="time" value={formHeure} onChange={e => setFormHeure(e.target.value)} className={inputClass} /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reçoit (rotation)</label>
                <select value={formHote} onChange={e => changerHote(e.target.value)} className={inputClass}>
                  <option value="">— Autre lieu —</option>
                  {users.filter(u => u.actif).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label><input type="text" value={formLieu} onChange={e => setFormLieu(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className={`${inputClass} resize-none`} rows={2} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ordre du jour (1 par ligne)</label><textarea value={formOrdreDuJour} onChange={e => setFormOrdreDuJour(e.target.value)} className={`${inputClass} resize-none`} rows={3} placeholder="Point 1&#10;Point 2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Distribution prévue ({parametres.devise})</label><input type="number" value={formDistribution} onChange={e => setFormDistribution(e.target.value)} className={inputClass} /></div>
              <p className="text-xs text-gray-500">Une convocation est envoyée à tous les membres actifs dans l'application.</p>
              <button onClick={handleAdd} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">Planifier</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selected.titre}</h3>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[selected.statut]}`}>{statutLabels[selected.statut]}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Présentielle</span>
                  {historique && <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${pvColors[selected.statutPV || 'non_redige']}`}>{pvLabels[selected.statutPV || 'non_redige']}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-xs text-gray-500">Date</p><p className="font-bold text-gray-800 text-sm">{new Date(selected.date).toLocaleDateString('fr-FR')}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-xs text-gray-500">Heure</p><p className="font-bold text-gray-800 text-sm">{selected.heure}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-xs text-gray-500">Lieu</p><p className="font-bold text-gray-800 text-xs">{selected.lieu}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Home size={11} /> Reçoit</p><p className="font-bold text-gray-800 text-xs">{nomMembre(selected.hoteId)}</p></div>
            </div>

            {/* Présences */}
            {historique && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><UserCheck size={18} /> Présences & pointage cotisation</h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selected.presences.map(p => {
                      const membre = users.find(u => u.id === p.membreId);
                      if (!membre) return null;
                      return (
                        <div key={p.membreId} className="flex items-center justify-between p-2 bg-white rounded-lg gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              disabled={pvVerrouille}
                              onClick={() => togglePresence(selected.id, p.membreId)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${p.present ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                            >
                              {p.present && <Check size={14} className="text-white" />}
                            </button>
                            <span className={`text-sm truncate ${p.present ? 'text-gray-800' : 'text-gray-400'}`}>{membre.prenom} {membre.nom}</span>
                          </div>
                          {enSeance && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => marquerRetard(selected.id, p.membreId)} className={`px-2 py-0.5 rounded text-xs font-medium ${p.retard ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>Retard</button>
                              <button onClick={() => toggleCotisation(selected.id, p.membreId)} className={`px-2 py-0.5 rounded text-xs font-medium ${p.cotisationPayee ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.cotisationPayee ? 'Cotisé ✓' : 'Cotisation'}</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                    Présents : {selected.presences.filter(p => p.present).length}/{selected.presences.length} · Retards : {selected.presences.filter(p => p.retard).length}
                  </p>
                </div>
              </div>
            )}

            {/* Finances de la séance */}
            {historique && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Wallet size={18} /> Finances de la séance</h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="p-3 bg-green-50 rounded-xl text-center"><p className="text-xs text-gray-500">Cotisations</p><p className="font-bold text-green-700 text-sm">{formatMontant(selected.totalCotisations)}</p></div>
                  <div className="p-3 bg-orange-50 rounded-xl text-center"><p className="text-xs text-gray-500">Amendes</p><p className="font-bold text-orange-700 text-sm">{formatMontant(selected.totalAmendes || 0)}</p></div>
                  <div className="p-3 bg-red-50 rounded-xl text-center"><p className="text-xs text-gray-500">Sorties</p><p className="font-bold text-red-700 text-sm">{formatMontant(selected.totalDepenses)}</p></div>
                </div>
                {enSeance && canSaisir && <ReunionMouvements reunionId={selected.id} />}
                {enSeance && <p className="text-xs text-gray-500 mb-2">Les mouvements saisis ici sont en attente de validation et rattachés à cette réunion.</p>}
                {mouvementsReunion.length > 0 && (
                  <div className="space-y-1">
                    {mouvementsReunion.map(m => (
                      <div key={m.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 truncate">{m.description}</span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className={m.categorie === 'entree' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{m.categorie === 'entree' ? '+' : '-'}{formatMontant(m.montant)}</span>
                          <span className={`text-xs px-1.5 rounded ${m.statut === 'valide' ? 'bg-green-100 text-green-700' : m.statut === 'rejete' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{m.statut === 'valide' ? 'validé' : m.statut === 'rejete' ? 'rejeté' : 'en attente'}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Amendes */}
            {historique && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Amendes</h4>
                {enSeance && canAmende && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-3">
                    <select value={amendeMembre} onChange={e => setAmendeMembre(e.target.value)} className={inputClass}>
                      <option value="">Choisir le membre...</option>
                      {users.filter(u => u.actif).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(amendeLabels) as TypeAmende[]).map(t => (
                        <button key={t} disabled={!amendeMembre} onClick={() => handleAmende(t)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed">{bareme[t]?.label ?? amendeLabels[t]}{bareme[t] ? ` · ${formatMontant(bareme[t].montant)}` : ''}</button>
                      ))}
                    </div>
                  </div>
                )}
                {amendes.length === 0 ? <p className="text-sm text-gray-500">Aucune amende</p> : (
                  <div className="space-y-1">
                    {amendes.map(a => (
                      <div key={a.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{nomMembre(a.membreId)} — {bareme[a.typeAmende]?.label ?? amendeLabels[a.typeAmende]}</span>
                        <span className="font-medium text-orange-600">{formatMontant(a.montant)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rapport financier */}
            {historique && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2"><Wallet size={18} /> Rapport financier de la trésorière</h4>
                  {canRapport && !pvVerrouille && (
                    <button onClick={() => genererRapportFinancier(selected.id)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200">{selected.rapportFinancier ? 'Actualiser' : 'Présenter le rapport'}</button>
                  )}
                </div>
                {selected.rapportFinancier ? (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <p className="text-xs text-gray-500">Présenté par {nomMembre(selected.rapportFinancier.presentePar)} le {new Date(selected.rapportFinancier.date).toLocaleString('fr-FR')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {selected.rapportFinancier.caisses.map(c => <div key={c.caisseId} className="flex justify-between"><span className="text-gray-600">{c.nom}</span><span className="font-medium">{formatMontant(c.solde)}</span></div>)}
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex flex-wrap justify-between gap-2">
                      <span className="font-bold text-gray-800">Total : {formatMontant(selected.rapportFinancier.soldeTotal)}</span>
                      <span className="text-gray-600">Mois : <span className="text-green-600">+{formatMontant(selected.rapportFinancier.entreesMois)}</span> / <span className="text-red-600">-{formatMontant(selected.rapportFinancier.sortiesMois)}</span> ({selected.rapportFinancier.nbMouvementsMois} mouvements)</span>
                    </div>
                  </div>
                ) : <p className="text-sm text-gray-500">Pas encore présenté</p>}
              </div>
            )}

            {/* Ordre du jour */}
            {selected.ordreDuJour.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Ordre du jour</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">{selected.ordreDuJour.map((item, i) => <li key={i}>{item}</li>)}</ol>
              </div>
            )}

            {/* Décisions */}
            {(historique || selected.decisions.length > 0) && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Gavel size={18} /> Décisions</h4>
                <ul className="space-y-1 mb-2">{selected.decisions.map((d, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-600"><Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />{d}</li>)}</ul>
                {canManage && historique && !pvVerrouille && (
                  <div className="flex gap-2">
                    <input value={decisionTexte} onChange={e => setDecisionTexte(e.target.value)} className={inputClass} placeholder="Nouvelle décision..." />
                    <button onClick={() => { addDecision(selected.id, decisionTexte); setDecisionTexte(''); }} className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"><Plus size={18} /></button>
                  </div>
                )}
              </div>
            )}

            {/* Actions à mener */}
            {(historique || (selected.actions || []).length > 0) && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><ListChecks size={18} /> Actions à mener</h4>
                <ul className="space-y-1 mb-2">
                  {(selected.actions || []).map(a => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <button disabled={!canManage} onClick={() => toggleAction(selected.id, a.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${a.fait ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>{a.fait && <Check size={12} className="text-white" />}</button>
                      <span className={a.fait ? 'line-through text-gray-400' : 'text-gray-700'}>{a.description}</span>
                      {a.responsableId && <span className="text-xs text-gray-500">({nomMembre(a.responsableId)})</span>}
                    </li>
                  ))}
                </ul>
                {canManage && historique && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={actionTexte} onChange={e => setActionTexte(e.target.value)} className={inputClass} placeholder="Nouvelle action..." />
                    <select value={actionResponsable} onChange={e => setActionResponsable(e.target.value)} className={`${inputClass} sm:w-48`}>
                      <option value="">Responsable</option>
                      {users.filter(u => u.actif).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                    </select>
                    <button onClick={() => { addAction(selected.id, { description: actionTexte, responsableId: actionResponsable || undefined }); setActionTexte(''); setActionResponsable(''); }} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"><Plus size={18} /></button>
                  </div>
                )}
              </div>
            )}

            {/* PV */}
            {historique && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><FileText size={18} /> Procès-verbal</h4>
                {canRedigerPV && !pvVerrouille ? (
                  <>
                    <textarea value={pvTexte} onChange={e => setPvTexte(e.target.value)} className={`${inputClass} resize-none mb-2`} rows={5} placeholder="Rédigez le compte rendu..." />
                    <button onClick={() => redigerPV(selected.id, pvTexte)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Enregistrer le PV</button>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl whitespace-pre-wrap">{selected.compteRendu || 'PV non rédigé'}</p>
                )}
                {selected.statutPV === 'redige' && canValiderPV && (
                  <button onClick={() => validerPV(selected.id)} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">Valider le PV</button>
                )}
                {pvVerrouille && <p className="text-xs text-gray-500 mt-2">Validé par {nomMembre(selected.pvValidePar)}{selected.datePVValidation ? ` le ${new Date(selected.datePVValidation).toLocaleDateString('fr-FR')}` : ''}</p>}
              </div>
            )}

            {/* Actions */}
            {canManage && (selected.statut === 'planifiee' || enSeance) && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                {selected.statut === 'planifiee' && (
                  <>
                    <button onClick={() => demarrerReunion(selected.id)} className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 text-sm"><Play size={14} /> Démarrer</button>
                    <button onClick={() => { updateReunion(selected.id, { statut: 'annulee' }); setSelectedId(null); }} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 text-sm">Annuler</button>
                  </>
                )}
                {enSeance && (
                  <button onClick={() => { terminerReunion(selected.id, pvTexte); setSelectedId(null); }} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 text-sm"><Square size={14} /> Terminer et archiver</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
