import { notifier } from '../lib/notifier';
import { KenteBand, SunDisc } from '../components/Motifs';
import { Fenetre, Champ, Info, saisie, saisieZone, boutonPrincipal, boutonSecondaire } from '../components/ui';
import { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Plus, Check, Clock, X, XCircle, DollarSign, Calendar, TrendingUp, AlertCircle, ChevronDown, Eye } from 'lucide-react';
import { Pret, StatutPret } from '../types';
import { calculerInterets as calculerInteretsPret, dateEcheance, dureeMois, resteDu, totalDu, verifierDemande } from '../lib/prets';

export default function Loans() {
  const { prets, users, caisses, addPret, approuverPret, rejeterPret, addRemboursement, currentUser, parametres } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRembModal, setShowRembModal] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [deroules, setDeroules] = useState<Set<string>>(new Set());
  const basculer = (id: string) => setDeroules(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Form state pour nouveau prêt
  const [formMembreId, setFormMembreId] = useState('');
  const [formMontant, setFormMontant] = useState('');
  const [formMotif, setFormMotif] = useState('');
  const [formDuree, setFormDuree] = useState('3');
  const [formGarantMembreId, setFormGarantMembreId] = useState('');
  const [formGarantDescription, setFormGarantDescription] = useState('');

  // Form state pour remboursement
  const [rembMontant, setRembMontant] = useState('');
  const [rembNote, setRembNote] = useState('');

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'presidente';
  const canCreate = true; // Tout le monde peut demander un prêt
  const peutRembourser = currentUser?.role === 'admin' || currentUser?.role === 'presidente' || currentUser?.role === 'tresoriere';

  const statutLabels: Record<StatutPret, string> = {
    en_attente: 'En attente',
    approuve: 'Approuvé',
    en_cours: 'En cours',
    rembourse: 'Remboursé',
    rejete: 'Rejeté'
  };

  const statutColors: Record<StatutPret, string> = {
    en_attente: 'bg-amber-100 text-amber-800',
    approuve: 'bg-safran/30 text-encre',
    en_cours: 'bg-encre text-creme',
    rembourse: 'bg-green-100 text-green-700',
    rejete: 'bg-red-100 text-red-700'
  };

  // Un membre ordinaire ne voit que ses propres prêts
  const mesPrets = prets.filter(p => currentUser?.role !== 'membre' || p.membreId === currentUser.id);

  const filteredPrets = prets
    .filter(p => filterStatut === 'all' || p.statut === filterStatut)
    .filter(p => {
      // Si membre simple, ne voir que ses propres prêts
      if (currentUser?.role === 'membre') {
        return p.membreId === currentUser.id;
      }
      return true;
    })
    .sort((a, b) => b.dateDemande.localeCompare(a.dateDemande));

  // Règles de calcul : voir src/lib/prets.ts (testées)
  const calculerInterets = (montant: number, duree: number, tauxInteret = parametres.tauxInteretPret) => calculerInteretsPret(montant, duree, tauxInteret);
  const calculerDureeMois = dureeMois;
  const calculerTotalDu = totalDu;
  const calculerRestant = (pret: Pret) => resteDu(pret, pret.remboursements.reduce((sum, r) => sum + r.montant, 0));

  const handleAdd = () => {
    // Une membre ordinaire ne demande un prêt que pour elle-même
    const membreDemandeur = currentUser?.role === 'membre' ? currentUser.id : formMembreId;
    if (!membreDemandeur || !formMontant || !formMotif || !formDuree) {
      notifier('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const montant = parseInt(formMontant);
    const duree = parseInt(formDuree);

    const erreur = verifierDemande(montant, duree, parametres);
    if (erreur) {
      notifier(erreur);
      return;
    }

    addPret({
      membreId: membreDemandeur,
      montant,
      motif: formMotif,
      tauxInteret: parametres.tauxInteretPret,
      dateEcheance: dateEcheance(duree),
      // Garanties
      garantMembreId: formGarantMembreId || undefined,
      garantDescription: formGarantDescription || undefined
    });

    setFormMembreId('');
    setFormMontant('');
    setFormMotif('');
    setFormDuree('3');
    setFormGarantMembreId('');
    setFormGarantDescription('');
    setShowAddModal(false);
  };

  const handleRemboursement = async (pretId: string) => {
    if (!rembMontant || parseInt(rembMontant) <= 0) {
      notifier('Veuillez entrer un montant valide');
      return;
    }

    const pret = prets.find(p => p.id === pretId);
    if (!pret) return;

    const montant = parseInt(rembMontant);
    const restant = calculerRestant(pret);

    // Vérifier qu'on ne rembourse pas plus que le montant dû
    if (montant > restant) {
      notifier(`❌ Le montant de remboursement (${formatMontant(montant)}) dépasse le montant restant dû (${formatMontant(restant)}).`);
      return;
    }

    // Logique de remboursement : intérêts d'abord, puis capital
    const remboursementEnregistre = await addRemboursement(pretId, montant, rembNote || undefined);
    if (!remboursementEnregistre) return;

    setRembMontant('');
    setRembNote('');
    setShowRembModal(null);
  };

  const formatMontant = (n: number) => n.toLocaleString('fr-FR') + ' ' + parametres.devise;

  // Statistiques
  const pretsEnAttente = mesPrets.filter(p => p.statut === 'en_attente').length;
  const pretsEnCours = mesPrets.filter(p => p.statut === 'en_cours' || p.statut === 'approuve').length;
  const pretsRembourses = mesPrets.filter(p => p.statut === 'rembourse').length;
  const totalInterets = mesPrets.reduce((sum, p) => sum + p.interetsGeneres, 0);

  return (
    <div className="space-y-6">
      {/* Bandeau */}
      <section className="relative overflow-hidden bg-encre text-creme rounded-3xl">
        <SunDisc className="-top-20 -right-12 w-64 h-64" />
        <div className="relative px-6 py-6 lg:px-8 lg:py-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-sable mb-1">Intérêt de {parametres.tauxInteretPret} % par mois · {parametres.dureeMaxPretMois} mois maximum</p>
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">Les prêts</h1>
            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4">
              <div><p className="text-3xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{pretsEnCours}</p><p className="text-xs text-sable">en cours</p></div>
              <div><p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{pretsEnAttente}</p><p className="text-xs text-sable">en attente</p></div>
              <div><p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{pretsRembourses}</p><p className="text-xs text-sable">remboursés</p></div>
              <div><p className="text-3xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(totalInterets)}</p><p className="text-xs text-sable">d'intérêts générés</p></div>
            </div>
          </div>
          {canCreate && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 px-6 h-12 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12] hover:brightness-105 transition">
              <Plus size={18} /> Demander un prêt
            </button>
          )}
        </div>
        <KenteBand height={10} />
      </section>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {[['all', 'Tous'], ...Object.entries(statutLabels)].map(([key, label]) => {
          const n = key === 'all' ? mesPrets.length : mesPrets.filter(p => p.statut === key).length;
          if (key !== 'all' && n === 0 && filterStatut !== key) return null;
          return (
            <button key={key} onClick={() => setFilterStatut(key)} aria-pressed={filterStatut === key}
              className={`px-4 h-10 rounded-full text-sm font-medium transition ${filterStatut === key ? 'bg-encre text-creme' : 'bg-white border border-sable text-gray-700 hover:border-encre'}`}>
              {label} <span className={filterStatut === key ? 'text-safran' : 'text-gray-500'}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Liste des prêts */}
      <div className="space-y-4">
        {filteredPrets.map(pret => {
          const membre = users.find(u => u.id === pret.membreId);
          const garant = pret.garantMembreId ? users.find(u => u.id === pret.garantMembreId) : null;

          const interets = calculerInterets(pret.montant, calculerDureeMois(pret), pret.tauxInteret);
          const totalDu = interets.totalARembourser;
          const restant = calculerRestant(pret);
          const totalRembourse = pret.remboursements.reduce((sum, remboursement) => sum + remboursement.montant, 0);
          const progress = totalDu > 0 ? Math.min(100, (totalRembourse / totalDu) * 100) : 0;
          const suivi = pret.statut === 'en_cours' || pret.statut === 'rembourse' || pret.statut === 'approuve';
          const ouvert = deroules.has(pret.id);

          return (
            <article key={pret.id} className="bg-white rounded-2xl border border-sable overflow-hidden">
              {/* Ligne compacte : toujours visible */}
              <button
                type="button"
                onClick={() => basculer(pret.id)}
                aria-expanded={ouvert}
                className="w-full text-left px-4 py-3 sm:px-5 flex items-center gap-4 hover:bg-creme/60 transition"
              >
                <div className="w-10 h-10 shrink-0 rounded-full bg-safran text-encre flex items-center justify-center text-sm font-bold">
                  {membre?.prenom?.[0]}{membre?.nom?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <h4 className="font-bold text-encre truncate">{membre?.prenom} {membre?.nom}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statutColors[pret.statut]}`}>{statutLabels[pret.statut]}</span>
                  </div>
                  {suivi ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2 flex-1 max-w-xs rounded-full bg-gray-200 overflow-hidden" role="img" aria-label={`Remboursé à ${progress.toFixed(0)} %`}>
                        <div className="barre-pousse h-full bg-soleil rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-bold text-encre w-10">{progress.toFixed(0)}%</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{pret.motif}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-encre leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(pret.montant)}</p>
                  {suivi && <p className="text-xs text-gray-500">Reste {formatMontant(restant)}</p>}
                </div>
                <ChevronDown size={20} className={`shrink-0 text-gray-500 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
              </button>

              {/* Partie dépliée */}
              {ouvert && (
                <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-sable bg-creme/40 space-y-4">
                  <p className="text-sm text-gray-700">{pret.motif}</p>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><dt className="text-xs text-gray-500">Demandé le</dt><dd className="font-bold text-encre">{new Date(pret.dateDemande).toLocaleDateString('fr-FR')}</dd></div>
                    <div><dt className="text-xs text-gray-500">Échéance</dt><dd className="font-bold text-encre">{new Date(pret.dateEcheance).toLocaleDateString('fr-FR')}</dd></div>
                    <div><dt className="text-xs text-gray-500">Intérêts totaux</dt><dd className="font-bold text-encre">{formatMontant(interets.interetsTotaux)}</dd></div>
                    <div><dt className="text-xs text-gray-500">Déjà remboursé</dt><dd className="font-bold text-encre">{formatMontant(totalRembourse)}</dd></div>
                  </dl>

                  {(garant || pret.garantDescription) && (
                    <p className="text-sm text-gray-700">
                      <span className="font-bold text-encre">Garantie : </span>
                      {[garant ? `${garant.prenom} ${garant.nom}` : null, pret.garantDescription].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {pret.remboursements.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-1.5">Derniers remboursements</p>
                      <div className="space-y-1">
                        {pret.remboursements.slice(-3).map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between text-xs bg-white border border-sable rounded-lg px-3 py-2">
                            <span className="text-gray-600">{new Date(r.date).toLocaleDateString('fr-FR')}</span>
                            <span className="font-bold text-green-700">{formatMontant(r.montant)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {pret.statut === 'en_attente' && canManage && (
                      <>
                        <button onClick={() => approuverPret(pret.id)} className="flex items-center gap-1.5 px-4 h-11 bg-green-700 text-white text-sm font-bold rounded-xl hover:bg-green-800">
                          <Check size={16} /> Approuver
                        </button>
                        <button onClick={() => rejeterPret(pret.id)} className="flex items-center gap-1.5 px-4 h-11 bg-red-700 text-white text-sm font-bold rounded-xl hover:bg-red-800">
                          <X size={16} /> Rejeter
                        </button>
                      </>
                    )}
                    {peutRembourser && (pret.statut === 'en_cours' || pret.statut === 'approuve') && (
                      <button onClick={() => setShowRembModal(pret.id)} className="flex items-center gap-1.5 px-4 h-11 bg-safran text-encre text-sm font-bold rounded-xl shadow-[0_3px_0_#C47F12] hover:brightness-105">
                        <DollarSign size={16} /> Remboursement
                      </button>
                    )}
                    <button onClick={() => setShowDetailModal(pret.id)} className="flex items-center gap-1.5 px-4 h-11 bg-encre text-creme text-sm font-bold rounded-xl hover:bg-gray-800">
                      <Eye size={16} /> Voir détail
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {filteredPrets.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
            <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
            <p>Aucun prêt trouvé</p>
          </div>
        )}
      </div>

      {/* Demande de prêt */}
      {showAddModal && (
        <Fenetre titre="Demander un prêt" onClose={() => setShowAddModal(false)}>
          {currentUser?.role !== 'membre' && (
            <Champ id="p-membre" label="Pour quelle membre ?">
              <select id="p-membre" value={formMembreId} onChange={e => setFormMembreId(e.target.value)} className={saisie}>
                <option value="">Sélectionner</option>
                {users.filter(u => u.actif).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </Champ>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Champ id="p-montant" label={`Montant (${parametres.devise})`} aide={parametres.montantMaxPret > 0 ? `Maximum ${formatMontant(parametres.montantMaxPret)}` : undefined}>
              <input id="p-montant" type="number" inputMode="numeric" value={formMontant} onChange={e => setFormMontant(e.target.value)} placeholder="100000" className={saisie} />
            </Champ>
            <Champ id="p-duree" label="Durée">
              <select id="p-duree" value={formDuree} onChange={e => setFormDuree(e.target.value)} className={saisie}>
                {Array.from({ length: Math.max(1, parametres.dureeMaxPretMois || 3) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} mois</option>)}
              </select>
            </Champ>
          </div>
          <Champ id="p-motif" label="Motif">
            <textarea id="p-motif" value={formMotif} onChange={e => setFormMotif(e.target.value)} rows={2} placeholder="Raison du prêt" className={saisieZone} />
          </Champ>
          <Champ id="p-garant" label="Membre garante (facultatif)">
            <select id="p-garant" value={formGarantMembreId} onChange={e => setFormGarantMembreId(e.target.value)} className={saisie}>
              <option value="">Aucune</option>
              {users.filter(u => u.actif && u.id !== formMembreId).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
          </Champ>
          <Champ id="p-gage" label="Gage (facultatif)" aide="Les prêts sont accordés moyennant des avals en gage (statuts, art. 24).">
            <input id="p-gage" value={formGarantDescription} onChange={e => setFormGarantDescription(e.target.value)} placeholder="Ex : titre de propriété, bijoux…" className={saisie} />
          </Champ>
          {formMontant && formDuree && parseInt(formMontant) > 0 && (
            <Info>
              <p><strong>Intérêts estimés :</strong> {formatMontant(calculerInterets(parseInt(formMontant), parseInt(formDuree)).interetsTotaux)} ({parametres.tauxInteretPret} % par mois)</p>
              <p><strong>Total à rembourser :</strong> {formatMontant(calculerInterets(parseInt(formMontant), parseInt(formDuree)).totalARembourser)}</p>
            </Info>
          )}
          <button onClick={handleAdd} className={boutonPrincipal}>Envoyer la demande</button>
        </Fenetre>
      )}

      {/* Remboursement */}
      {showRembModal && (
        <Fenetre titre="Enregistrer un remboursement" onClose={() => setShowRembModal(null)}>
          <Info><p>Les intérêts sont remboursés en premier, puis le capital.</p></Info>
          <Champ id="r-montant" label={`Montant (${parametres.devise})`}>
            <input id="r-montant" type="number" inputMode="numeric" value={rembMontant} onChange={e => setRembMontant(e.target.value)} placeholder="50000" className={saisie} />
          </Champ>
          <Champ id="r-note" label="Note (facultatif)">
            <input id="r-note" value={rembNote} onChange={e => setRembNote(e.target.value)} className={saisie} />
          </Champ>
          <div className="flex gap-2">
            <button onClick={() => setShowRembModal(null)} className={boutonSecondaire}>Annuler</button>
            <button onClick={() => void handleRemboursement(showRembModal)} className={`${boutonPrincipal} flex-1`}>Confirmer</button>
          </div>
        </Fenetre>
      )}

      {/* Modal Détails */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-creme rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            {(() => {
              const pret = prets.find(p => p.id === showDetailModal);
              if (!pret) return null;
              const membre = users.find(u => u.id === pret.membreId);

              // Calculer la durée réelle du prêt en mois
              const interets = calculerInterets(pret.montant, calculerDureeMois(pret), pret.tauxInteret);

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-encre">Détail du prêt</h3>
                      <p className="text-sm text-gray-500">{membre?.prenom} {membre?.nom}</p>
                    </div>
                    <button onClick={() => setShowDetailModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-white border border-sable rounded-xl">
                      <p className="text-xs text-gray-600">Montant emprunté</p>
                      <p className="text-lg font-bold text-encre">{formatMontant(pret.montant)}</p>
                    </div>
                    <div className="p-3 bg-white border border-sable rounded-xl">
                      <p className="text-xs text-gray-600">Intérêts totaux</p>
                      <p className="text-lg font-bold text-encre">{formatMontant(interets.interetsTotaux)}</p>
                    </div>
                    <div className="p-3 bg-white border border-sable rounded-xl">
                      <p className="text-xs text-gray-600">Total à rembourser</p>
                      <p className="text-lg font-bold text-encre">{formatMontant(interets.totalARembourser)}</p>
                    </div>
                    <div className="p-3 bg-white border border-sable rounded-xl">
                      <p className="text-xs text-gray-600">Déjà remboursé</p>
                      <p className="text-lg font-bold text-encre">{formatMontant(pret.remboursements.reduce((s, r) => s + r.montant, 0))}</p>
                    </div>
                    <div className="p-3 bg-white border border-sable rounded-xl">
                      <p className="text-xs text-gray-600">Reste à rembourser</p>
                      <p className="text-lg font-bold text-encre">{formatMontant(Math.max(0, interets.totalARembourser - pret.remboursements.reduce((s, r) => s + r.montant, 0)))}</p>
                    </div>
                    <div className="p-3 bg-white border border-sable rounded-xl">
                      <p className="text-xs text-gray-600">Progression</p>
                      <p className="text-lg font-bold text-encre">
                        {interets.totalARembourser > 0
                          ? `${Math.min(100, (pret.remboursements.reduce((s, r) => s + r.montant, 0) / interets.totalARembourser) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                    </div>
                  </div>

                  <h4 className="text-lg font-bold text-encre mb-3">Historique des remboursements</h4>
                  <div className="space-y-2">
                    {pret.remboursements.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-sable rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{new Date(r.date).toLocaleDateString('fr-FR')}</p>
                          {r.note && <p className="text-xs text-gray-500">{r.note}</p>}
                        </div>
                        <span className="text-sm font-bold text-green-700">{formatMontant(r.montant)}</span>
                      </div>
                    ))}
                    {pret.remboursements.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">Aucun remboursement enregistré</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
