import { useState } from 'react';
import { useConfirmation } from '../components/ui';
import { KenteBand, SunDisc } from '../components/Motifs';
import { useApp } from '../context/AppContextSupabase';
import { Plus, CircleDot, X, Play, Pause, Users, Wallet, Check, ArrowUp, ArrowDown, Trash2, RefreshCw, Gift } from 'lucide-react';
import { StatutTontine, Tontine as TontineType } from '../types';

const statutLabels: Record<StatutTontine, string> = {
  inscriptions: 'Inscriptions ouvertes', planifiee: 'Inscriptions ouvertes', en_cours: 'En cours',
  terminee: 'Terminée', suspendue: 'Suspendue', annulee: 'Annulée'
};
const statutColors: Record<StatutTontine, string> = {
  inscriptions: 'bg-blue-100 text-blue-700', planifiee: 'bg-blue-100 text-blue-700', en_cours: 'bg-green-100 text-green-700',
  terminee: 'bg-gray-100 text-gray-700', suspendue: 'bg-amber-100 text-amber-700', annulee: 'bg-red-100 text-red-700'
};
const frequenceLabels = { hebdomadaire: 'Hebdomadaire', bimensuel: 'Bimensuel', mensuel: 'Mensuel' };

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500';

type Onglet = 'participants' | 'tours' | 'collecte' | 'historique';

export default function Tontine() {
  const [confirmer, fenetreConfirmation] = useConfirmation();
  const {
    tontines, users, caisses, mouvements, addTontine, updateTontine, annulerTontine, inscrireParticipant,
    modifierPartsParticipant, retirerParticipant, definirOrdreParticipants, demarrerTontine,
    enregistrerCotisationTontine, signalerRetardTontine, verserTour, relancerCycle, getSoldeTontine,
    getExerciceActuel, currentUser, parametres
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<Onglet>('participants');
  const [filtre, setFiltre] = useState<'all' | StatutTontine>('all');
  const [nouveauMembre, setNouveauMembre] = useState('');
  const [nouvellesParts, setNouvellesParts] = useState('1');

  const [formNom, setFormNom] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMontant, setFormMontant] = useState('');
  const [formFrequence, setFormFrequence] = useState<'hebdomadaire' | 'mensuel' | 'bimensuel'>('mensuel');
  const [formDateDebut, setFormDateDebut] = useState('');
  const [formPlaces, setFormPlaces] = useState('');
  const [formOrdre, setFormOrdre] = useState<'tirage' | 'manuel'>('tirage');

  const role = currentUser?.role;
  const canManage = role === 'admin' || role === 'presidente';
  const canCollect = role === 'admin' || role === 'presidente' || role === 'secretaire' || role === 'tresoriere';
  const canRetard = role === 'admin' || role === 'secretaire';
  const canVerser = role === 'admin' || role === 'tresoriere' || role === 'presidente';

  const formatMontant = (n: number) => n.toLocaleString('fr-FR') + ' ' + parametres.devise;
  const nomMembre = (id?: string) => {
    const u = users.find(x => x.id === id);
    return u ? `${u.prenom} ${u.nom}` : '—';
  };
  const caisseTontine = caisses.find(c => c.type === 'tontine');
  const ouvert = (t: TontineType) => t.statut === 'inscriptions' || t.statut === 'planifiee';
  const nbParts = (t: TontineType) => (t.participants || []).reduce((s, p) => s + p.nbParts, 0);

  const selected = selectedId ? tontines.find(t => t.id === selectedId) : null;
  const filtrees = tontines.filter(t => filtre === 'all' || t.statut === filtre || (filtre === 'inscriptions' && t.statut === 'planifiee'));

  const handleAdd = () => {
    if (!formNom || !formMontant || !formDateDebut) return;
    addTontine({
      nom: formNom, description: formDescription, montantParRang: parseInt(formMontant), frequence: formFrequence,
      dateDebut: formDateDebut, exerciceId: getExerciceActuel()?.id || '',
      nbPlacesMax: formPlaces ? parseInt(formPlaces) : undefined, modeOrdre: formOrdre
    });
    setFormNom(''); setFormDescription(''); setFormMontant(''); setFormFrequence('mensuel'); setFormDateDebut(''); setFormPlaces(''); setFormOrdre('tirage');
    setShowAddModal(false);
  };

  const ouvrir = (t: TontineType) => {
    setSelectedId(t.id);
    setOnglet(t.statut === 'en_cours' ? 'collecte' : 'participants');
  };

  const ajouterParticipant = async (membreId: string) => {
    if (!selected || !membreId) return;
    const ok = await inscrireParticipant(selected.id, membreId, parseInt(nouvellesParts) || 1);
    if (ok) { setNouveauMembre(''); setNouvellesParts('1'); }
  };

  const deplacer = (index: number, delta: number) => {
    if (!selected) return;
    const ordonnes = [...(selected.participants || [])].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));
    const cible = index + delta;
    if (cible < 0 || cible >= ordonnes.length) return;
    [ordonnes[index], ordonnes[cible]] = [ordonnes[cible], ordonnes[index]];
    definirOrdreParticipants(selected.id, ordonnes.map(p => p.id));
  };

  const demarrer = async () => {
    if (!selected) return;
    const msg = selected.modeOrdre === 'manuel'
      ? 'Démarrer la tontine avec l’ordre défini ? Les inscriptions seront closes.'
      : 'Tirer au sort l’ordre de passage et démarrer ? Les inscriptions seront closes.';
    if (!(await confirmer({ titre: 'Démarrer la tontine', message: msg, action: 'Démarrer' }))) return;
    if (await demarrerTontine(selected.id)) setOnglet('tours');
  };

  const totalSolde = caisseTontine?.solde ?? 0;
  const tourEnCours = selected?.tours?.find(t => t.statut === 'en_cours');
  const mouvementsJeu = selected ? mouvements.filter(m => m.tontineId === selected.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const versementEnAttente = tourEnCours ? mouvements.some(m => m.tontineTourId === tourEnCours.id && m.type === 'distribution' && m.statut === 'en_attente') : false;
  const dejaInscrit = selected && currentUser ? (selected.participants || []).some(p => p.membreId === currentUser.id) : false;

  return (
    <div className="space-y-6">
      {fenetreConfirmation}
      <section className="relative overflow-hidden bg-encre text-creme rounded-3xl">
        <SunDisc className="-top-20 -right-12 w-64 h-64" />
        <div className="relative px-6 py-6 lg:px-8 lg:py-7 grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div><p className="text-xs uppercase tracking-widest text-sable">Jeux en cours</p><p className="text-3xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{tontines.filter(t => t.statut === 'en_cours').length}</p></div>
          <div><p className="text-xs uppercase tracking-widest text-sable">Inscriptions ouvertes</p><p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{tontines.filter(ouvert).length}</p></div>
          <div><p className="text-xs uppercase tracking-widest text-sable">Terminés</p><p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{tontines.filter(t => t.statut === 'terminee').length}</p></div>
          <div><p className="text-xs uppercase tracking-widest text-sable flex items-center gap-1"><Wallet size={12} /> Caisse tontine</p><p className="text-2xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(totalSolde)}</p></div>
        </div>
        <KenteBand height={10} />
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'inscriptions', 'en_cours', 'suspendue', 'terminee', 'annulee'] as const).map(f => (
            <button key={f} onClick={() => setFiltre(f)} className={`px-4 h-10 rounded-full text-sm font-medium transition ${filtre === f ? 'bg-encre text-creme' : 'bg-white border border-sable text-gray-600 hover:bg-gray-50'}`}>
              {f === 'all' ? 'Tous' : statutLabels[f]}
            </button>
          ))}
        </div>
        {canManage && (
          <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 px-5 h-12 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12] hover:brightness-105 transition">
            <Plus size={18} /> Nouveau jeu de tontine
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filtrees.map(tontine => {
          const tours = tontine.tours || [];
          const verses = tours.filter(t => t.statut === 'verse').length;
          const progress = tours.length ? (verses / tours.length) * 100 : 0;
          const courant = tours.find(t => t.statut === 'en_cours');
          const monInscription = currentUser ? (tontine.participants || []).find(p => p.membreId === currentUser.id) : undefined;
          return (
            <div key={tontine.id} onClick={() => ouvrir(tontine)} className="bg-white rounded-2xl p-6 border border-sable cursor-pointer transition hover:border-encre">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${tontine.statut === 'en_cours' ? 'bg-safran' : ouvert(tontine) ? 'bg-safran/25' : 'bg-gray-100'}`}>
                    <CircleDot className={tontine.statut === 'en_cours' ? 'text-encre' : ouvert(tontine) ? 'text-terre' : 'text-gray-600'} size={28} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-800">{tontine.nom}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[tontine.statut]}`}>{statutLabels[tontine.statut]}</span>
                      {monInscription && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Je participe ({monInscription.nbParts} part{monInscription.nbParts > 1 ? 's' : ''})</span>}
                    </div>
                    {tontine.description && <p className="text-sm text-gray-600 mb-2">{tontine.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={12} /> {(tontine.participants || []).length} participants · {nbParts(tontine)}{tontine.nbPlacesMax ? `/${tontine.nbPlacesMax}` : ''} parts</span>
                      <span>{frequenceLabels[tontine.frequence]}</span>
                      <span>Début : {new Date(tontine.dateDebut).toLocaleDateString('fr-FR')}</span>
                      <span>Cycle {tontine.cycleActuel}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(tontine.montantParRang)}</p>
                  <p className="text-xs text-gray-500">mise par part</p>
                  <p className="text-xs text-indigo-600 mt-1">Pot : {formatMontant(tontine.montantParRang * nbParts(tontine))}</p>
                </div>
              </div>
              {tours.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Tours versés : {verses}/{tours.length}</span>
                    <span>Solde du jeu : {formatMontant(getSoldeTontine(tontine.id))}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2"><div className="barre-pousse bg-soleil h-2 rounded-full" style={{ width: `${progress}%` }} /></div>
                  {courant && <p className="text-xs text-gray-500 mt-1">Tour {courant.numero} : {nomMembre(courant.membreId)} · collecté {formatMontant(courant.montantCollecte)} / {formatMontant(courant.montantAttendu)}</p>}
                </div>
              )}
            </div>
          );
        })}
        {filtrees.length === 0 && <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100"><CircleDot size={48} className="mx-auto mb-3 text-gray-300" /><p>Aucun jeu de tontine</p></div>}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-gray-800">Nouveau jeu de tontine</h3><button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input type="text" value={formNom} onChange={e => setFormNom(e.target.value)} className={inputClass} placeholder="Tontine 10 000" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className={`${inputClass} resize-none`} rows={2} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mise par part et par tour ({parametres.devise})</label><input type="number" value={formMontant} onChange={e => setFormMontant(e.target.value)} className={inputClass} placeholder="10000" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
                  <select value={formFrequence} onChange={e => setFormFrequence(e.target.value as any)} className={inputClass}>
                    <option value="hebdomadaire">Hebdomadaire</option><option value="bimensuel">Bimensuel</option><option value="mensuel">Mensuel</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date du 1er tour</label><input type="date" value={formDateDebut} onChange={e => setFormDateDebut(e.target.value)} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Places (parts) max</label><input type="number" value={formPlaces} onChange={e => setFormPlaces(e.target.value)} className={inputClass} placeholder="Illimité" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ordre de passage</label>
                  <select value={formOrdre} onChange={e => setFormOrdre(e.target.value as any)} className={inputClass}>
                    <option value="tirage">Tirage au sort</option><option value="manuel">Défini à la main</option>
                  </select>
                </div>
              </div>
              <button onClick={handleAdd} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">Créer et ouvrir les inscriptions</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selected.nom}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[selected.statut]}`}>{statutLabels[selected.statut]}</span>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-safran/20 rounded-xl text-center"><p className="text-xs text-gray-600">Mise / part</p><p className="font-bold text-encre text-sm">{formatMontant(selected.montantParRang)}</p></div>
              <div className="p-3 bg-safran/20 rounded-xl text-center"><p className="text-xs text-gray-600">Pot par tour</p><p className="font-bold text-encre text-sm">{formatMontant(selected.montantParRang * nbParts(selected))}</p></div>
              <div className="p-3 bg-safran/20 rounded-xl text-center"><p className="text-xs text-gray-600">Parts</p><p className="font-bold text-encre text-sm">{nbParts(selected)}{selected.nbPlacesMax ? `/${selected.nbPlacesMax}` : ''}</p></div>
              <div className="p-3 bg-safran/20 rounded-xl text-center"><p className="text-xs text-gray-600">Solde du jeu</p><p className="font-bold text-encre text-sm">{formatMontant(getSoldeTontine(selected.id))}</p></div>
            </div>

            <div className="flex gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
              {([['participants', 'Participants'], ['tours', 'Tours'], ['collecte', 'Collecte'], ['historique', 'Historique']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setOnglet(k)} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${onglet === k ? 'border-soleil text-encre font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
              ))}
            </div>

            {/* Participants */}
            {onglet === 'participants' && (
              <div className="space-y-3">
                {(selected.participants || []).length === 0 && <p className="text-sm text-gray-500">Aucun participant pour le moment</p>}
                {[...(selected.participants || [])].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999)).map((p, i, liste) => {
                  const editable = ouvert(selected) && (canCollect || p.membreId === currentUser?.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {ouvert(selected) && selected.modeOrdre === 'manuel' && <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>}
                        <span className="text-sm font-medium text-gray-800 truncate">{nomMembre(p.membreId)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {editable ? (
                          <select value={p.nbParts} onChange={e => modifierPartsParticipant(selected.id, p.id, parseInt(e.target.value))} className="px-2 py-1 border border-gray-200 rounded-lg text-sm">
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} part{n > 1 ? 's' : ''}</option>)}
                          </select>
                        ) : <span className="text-sm text-gray-600">{p.nbParts} part{p.nbParts > 1 ? 's' : ''}</span>}
                        {ouvert(selected) && selected.modeOrdre === 'manuel' && canManage && (
                          <>
                            <button disabled={i === 0} onClick={() => deplacer(i, -1)} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowUp size={14} /></button>
                            <button disabled={i === liste.length - 1} onClick={() => deplacer(i, 1)} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowDown size={14} /></button>
                          </>
                        )}
                        {editable && <button onClick={() => retirerParticipant(selected.id, p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>}
                      </div>
                    </div>
                  );
                })}

                {ouvert(selected) && (
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    {currentUser && !dejaInscrit && (
                      <button onClick={() => ajouterParticipant(currentUser.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Je m'inscris</button>
                    )}
                    {canCollect && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select value={nouveauMembre} onChange={e => setNouveauMembre(e.target.value)} className={inputClass}>
                          <option value="">Inscrire un membre...</option>
                          {users.filter(u => u.actif && !(selected.participants || []).some(p => p.membreId === u.id)).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                        </select>
                        <select value={nouvellesParts} onChange={e => setNouvellesParts(e.target.value)} className={`${inputClass} sm:w-32`}>
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} part{n > 1 ? 's' : ''}</option>)}
                        </select>
                        <button disabled={!nouveauMembre} onClick={() => ajouterParticipant(nouveauMembre)} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40"><Plus size={18} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tours */}
            {onglet === 'tours' && (
              <div className="space-y-2">
                {(selected.tours || []).length === 0 && <p className="text-sm text-gray-500">L'ordre de passage sera fixé au démarrage ({selected.modeOrdre === 'manuel' ? 'ordre défini à la main' : 'tirage au sort'}).</p>}
                {(selected.tours || []).map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl ${t.statut === 'verse' ? 'bg-green-50' : t.statut === 'en_cours' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${t.statut === 'verse' ? 'bg-green-500 text-white' : t.statut === 'en_cours' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>#{t.numero}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{nomMembre(t.membreId)}</p>
                        <p className="text-xs text-gray-500">Prévu le {new Date(t.datePrevue).toLocaleDateString('fr-FR')}{t.dateEffective ? ` · versé le ${new Date(t.dateEffective).toLocaleDateString('fr-FR')}` : ''}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.statut === 'verse' ? 'bg-green-100 text-green-700' : t.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t.statut === 'verse' ? `Versé (${formatMontant(t.montantVerse)})` : t.statut === 'en_cours' ? 'En cours' : t.statut === 'reporte' ? 'Reporté' : 'À venir'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Collecte du tour en cours */}
            {onglet === 'collecte' && (
              !tourEnCours ? <p className="text-sm text-gray-500">{selected.statut === 'en_cours' ? 'Aucun tour en cours' : 'La collecte commence quand la tontine est démarrée.'}</p> : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800 flex items-center gap-2"><Gift size={18} /> Tour {tourEnCours.numero} — bénéficiaire : {nomMembre(tourEnCours.membreId)}</p>
                      <p className="text-xs text-gray-500">Prévu le {new Date(tourEnCours.datePrevue).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <p className="text-sm text-gray-700">Collecté (validé) : <span className="font-bold text-green-600">{formatMontant(tourEnCours.montantCollecte)}</span> / {formatMontant(tourEnCours.montantAttendu)}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (tourEnCours.montantCollecte / tourEnCours.montantAttendu) * 100)}%` }} /></div>

                  <div className="space-y-2">
                    {tourEnCours.cotisations.map(c => {
                      const mvt = c.mouvementId ? mouvements.find(m => m.id === c.mouvementId && m.statut !== 'rejete') : undefined;
                      const etat = c.statut === 'paye' ? 'paye' : mvt ? 'a_valider' : c.statut === 'en_retard' ? 'retard' : 'du';
                      return (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{nomMembre(c.membreId)}</p>
                            <p className="text-xs text-gray-500">{formatMontant(c.montant)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {etat === 'paye' && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><Check size={12} /> Payée</span>}
                            {etat === 'a_valider' && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">À valider</span>}
                            {etat === 'retard' && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">En retard</span>}
                            {(etat === 'du' || etat === 'retard') && canCollect && (
                              <button onClick={() => enregistrerCotisationTontine(tourEnCours.id, c.participantId)} className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700">Enregistrer la mise</button>
                            )}
                            {etat === 'du' && canRetard && (
                              <button onClick={() => signalerRetardTontine(tourEnCours.id, c.participantId)} className="px-3 py-1 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200">Retard + amende</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {canVerser && (
                    <div className="pt-3 border-t border-gray-100">
                      {versementEnAttente ? (
                        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">Versement de {formatMontant(tourEnCours.montantAttendu)} à {nomMembre(tourEnCours.membreId)} en attente de validation dans Mouvements.</p>
                      ) : (
                        <button disabled={tourEnCours.montantCollecte < tourEnCours.montantAttendu} onClick={() => verserTour(tourEnCours.id)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
                          <Gift size={16} /> Verser le pot à {nomMembre(tourEnCours.membreId)}
                        </button>
                      )}
                      {tourEnCours.montantCollecte < tourEnCours.montantAttendu && !versementEnAttente && <p className="text-xs text-gray-500 mt-2">Le versement est possible quand toutes les mises sont validées.</p>}
                    </div>
                  )}
                </div>
              )
            )}

            {/* Historique */}
            {onglet === 'historique' && (
              <div className="space-y-1">
                {mouvementsJeu.length === 0 && <p className="text-sm text-gray-500">Aucun mouvement</p>}
                {mouvementsJeu.map(m => (
                  <div key={m.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded-lg gap-2">
                    <span className="text-gray-700 truncate">{new Date(m.date).toLocaleDateString('fr-FR')} · {m.description}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span className={m.categorie === 'entree' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{m.categorie === 'entree' ? '+' : '-'}{formatMontant(m.montant)}</span>
                      <span className={`text-xs px-1.5 rounded ${m.statut === 'valide' ? 'bg-green-100 text-green-700' : m.statut === 'rejete' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{m.statut === 'valide' ? 'validé' : m.statut === 'rejete' ? 'rejeté' : 'en attente'}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {canManage && (
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-100">
                {ouvert(selected) && <button onClick={demarrer} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 text-sm"><Play size={14} /> Démarrer la tontine</button>}
                {ouvert(selected) && <button onClick={() => { annulerTontine(selected.id); setSelectedId(null); }} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 text-sm">Annuler le jeu</button>}
                {selected.statut === 'en_cours' && <button onClick={() => updateTontine(selected.id, { statut: 'suspendue' })} className="flex items-center gap-1 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 text-sm"><Pause size={14} /> Suspendre</button>}
                {selected.statut === 'suspendue' && <button onClick={() => updateTontine(selected.id, { statut: 'en_cours' })} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 text-sm"><Play size={14} /> Reprendre</button>}
                {selected.statut === 'terminee' && <button onClick={async () => { if (await relancerCycle(selected.id)) setSelectedId(null); }} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 text-sm"><RefreshCw size={14} /> Relancer un nouveau cycle</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
