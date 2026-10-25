import { notifier } from '../lib/notifier';
import { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Wallet, TrendingUp, TrendingDown, X, Users, Lock, Unlock, Info, Plus } from 'lucide-react';
import { TypeCaisse } from '../types';
import { Fenetre, Champ, saisie, saisieZone, boutonPrincipal, boutonSecondaire } from '../components/ui';

export default function Caisse() {
  const { caisses, mouvements, users, currentUser, parametres, addCaisse } = useApp();
  const [selectedCaisse, setSelectedCaisse] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCaisse, setNewCaisse] = useState({
    nom: '',
    description: '',
    type: 'autre' as TypeCaisse,
    montantAnnuel: '',
    actif: true
  });

  const canViewDetails = currentUser?.role === 'admin' || currentUser?.role === 'presidente';
  const canCreate = currentUser?.role === 'admin' || currentUser?.role === 'presidente' || currentUser?.role === 'tresoriere';

  const typeCaisseLabels: Record<TypeCaisse, string> = {
    cassation: 'Cassation',
    charite: 'Charité',
    secours: 'Secours',
    epargne: 'Épargne',
    scolaire: 'Scolaire',
    amendes: 'Amendes',
    tontine: 'Tontine',
    interets: 'Intérêts',
    autre: 'Autre'
  };

  // Trois familles de couleur, pour que la palette reste lisible :
  // solidarité (terre cuite), épargne (safran), recettes (soleil), autre (encre).
  type Famille = { label: string; bar: string; chip: string; chipText: string };
  const familles: Record<'solidarite' | 'epargne' | 'recettes' | 'autre', Famille> = {
    solidarite: { label: 'Solidarité', bar: 'bg-terre', chip: 'bg-terre/10', chipText: 'text-terre' },
    epargne: { label: 'Épargne', bar: 'bg-safran', chip: 'bg-safran/25', chipText: 'text-encre' },
    recettes: { label: 'Recettes', bar: 'bg-soleil', chip: 'bg-soleil/15', chipText: 'text-terre' },
    autre: { label: 'Autre', bar: 'bg-encre', chip: 'bg-encre/10', chipText: 'text-encre' },
  };
  const familleDe: Record<TypeCaisse, keyof typeof familles> = {
    cassation: 'solidarite', charite: 'solidarite', secours: 'solidarite',
    epargne: 'epargne', scolaire: 'epargne', tontine: 'epargne',
    interets: 'recettes', amendes: 'recettes', autre: 'autre',
  };

  // Caisses obligatoires selon les statuts
  const caissesObligatoires: TypeCaisse[] = ['cassation', 'charite', 'secours'];

  const getCaisseStats = (caisseId: string) => {
    const caisseMvts = mouvements.filter(m => m.caisseId === caisseId && m.statut === 'valide');
    const entrees = caisseMvts
      .filter(m => ['cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet'].includes(m.type))
      .reduce((sum, m) => sum + m.montant, 0);
    const sorties = caisseMvts
      .filter(m => ['depense', 'distribution', 'pret'].includes(m.type))
      .reduce((sum, m) => sum + m.montant, 0);
    return { entrees, sorties, nb: caisseMvts.length };
  };

  const getMembresByCaisse = (caisseId: string) => {
    const caisseMvts = mouvements.filter(m => m.caisseId === caisseId && m.statut === 'valide' && m.membreId);
    const membresMap = new Map<string, { membre: any; total: number; nbMouvements: number }>();

    caisseMvts.forEach(mvt => {
      if (!mvt.membreId) return;
      const membre = users.find(u => u.id === mvt.membreId);
      if (!membre) return;

      const isCredit = ['cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet'].includes(mvt.type);
      const montant = isCredit ? mvt.montant : -mvt.montant;

      const existing = membresMap.get(mvt.membreId);
      if (existing) {
        existing.total += montant;
        existing.nbMouvements += 1;
      } else {
        membresMap.set(mvt.membreId, { membre, total: montant, nbMouvements: 1 });
      }
    });

    return Array.from(membresMap.values()).sort((a, b) => b.total - a.total);
  };

  const handleCreateCaisse = () => {
    if (!newCaisse.nom.trim()) {
      notifier('Veuillez entrer un nom pour la caisse');
      return;
    }

    addCaisse({
      nom: newCaisse.nom,
      description: newCaisse.description,
      type: newCaisse.type,
      montantAnnuel: newCaisse.montantAnnuel ? parseInt(newCaisse.montantAnnuel) : undefined,
      actif: newCaisse.actif
    });

    setNewCaisse({
      nom: '',
      description: '',
      type: 'autre',
      montantAnnuel: '',
      actif: true
    });
    setShowAddModal(false);
  };

  const filteredCaisses = filterType === 'all' ? caisses : caisses.filter(c => c.type === filterType);

  // Calculs globaux
  const patrimoineTotal = caisses.reduce((sum, c) => sum + c.solde, 0);
  const nombreCaisses = caisses.filter(c => c.actif).length;
  const nombreCaissesObligatoires = caisses.filter(c => c.actif && caissesObligatoires.includes(c.type)).length;

  const formatMontant = (n: number) => n.toLocaleString('fr-FR') + ' ' + parametres.devise;

  const selected = selectedCaisse ? caisses.find(c => c.id === selectedCaisse) : null;
  const selectedMembres = selectedCaisse ? getMembresByCaisse(selectedCaisse) : [];

  return (
    <div className="space-y-6">
      {/* Header avec statistiques globales */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-encre">Gestion des caisses</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble des finances de l'association</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg"
          >
            <Plus size={20} />
            Nouvelle Caisse
          </button>
        )}
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-encre text-creme rounded-2xl p-6">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-soleil/30" aria-hidden="true" />
          <div className="relative flex items-center gap-2 mb-2 text-sable">
            <Wallet size={18} />
            <span className="text-sm font-medium">Patrimoine total</span>
          </div>
          <p className="relative text-3xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(patrimoineTotal)}</p>
          <p className="relative text-xs text-sable mt-1">{nombreCaisses} caisse(s) active(s)</p>
        </div>

        <div className="bg-white border border-sable rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2 text-green-700">
            <TrendingUp size={18} />
            <span className="text-sm font-bold">Total entrées</span>
          </div>
          <p className="text-3xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>
            {formatMontant(caisses.reduce((sum, c) => sum + getCaisseStats(c.id).entrees, 0))}
          </p>
          <p className="text-xs text-gray-500 mt-1">Toutes caisses confondues</p>
        </div>

        <div className="bg-white border border-sable rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2 text-terre">
            <TrendingDown size={18} />
            <span className="text-sm font-bold">Total sorties</span>
          </div>
          <p className="text-3xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>
            {formatMontant(caisses.reduce((sum, c) => sum + getCaisseStats(c.id).sorties, 0))}
          </p>
          <p className="text-xs text-gray-500 mt-1">{nombreCaissesObligatoires} caisse(s) obligatoire(s)</p>
        </div>
      </div>

      {/* Filtres par type */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filterType === 'all' ? 'bg-encre text-creme' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes ({caisses.length})
          </button>
          {Object.entries(typeCaisseLabels).map(([key, label]) => {
            const count = caisses.filter(c => c.type === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filterType === key ? 'bg-encre text-creme' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grille des caisses */}
      {filteredCaisses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCaisses.map(caisse => {
            const stats = getCaisseStats(caisse.id);
            const isObligatoire = caissesObligatoires.includes(caisse.type);
            const f = familles[familleDe[caisse.type]];
            const total = stats.entrees + stats.sorties;
            const partEntrees = total > 0 ? Math.round((stats.entrees / total) * 100) : 0;
            const ouvrir = () => canViewDetails && setSelectedCaisse(caisse.id);

            return (
              <article
                key={caisse.id}
                role={canViewDetails ? 'button' : undefined}
                tabIndex={canViewDetails ? 0 : undefined}
                onClick={ouvrir}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } }}
                className={`relative zoom flex flex-col bg-white border border-sable rounded-2xl overflow-hidden ${
                  canViewDetails ? 'cursor-pointer' : ''
                } ${caisse.actif ? '' : 'opacity-60'}`}
              >
                <div className={`h-1.5 ${f.bar}`} />
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${f.chip} ${f.chipText}`}>
                      <Wallet size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-encre leading-tight truncate">{caisse.nom}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{typeCaisseLabels[caisse.type]}</p>
                    </div>
                    {isObligatoire && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-encre text-creme rounded-full text-[11px] font-bold shrink-0">
                        <Lock size={10} /> Obligatoire
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Solde actuel</p>
                    <p className="text-3xl font-bold text-encre leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                      {formatMontant(caisse.solde)}
                    </p>
                    {caisse.montantAnnuel ? (
                      <p className="text-xs text-gray-500 mt-1">Cotisation annuelle : <strong className="text-encre">{formatMontant(caisse.montantAnnuel)}</strong></p>
                    ) : null}
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2">{caisse.description || 'Aucune description'}</p>

                  <div className="mt-auto">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-green-700">+ {formatMontant(stats.entrees)}</span>
                      <span className="font-bold text-terre">− {formatMontant(stats.sorties)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-terre/25 overflow-hidden" role="img" aria-label={`Entrées ${partEntrees} % des flux`}>
                      <div className="h-full bg-green-600" style={{ width: `${partEntrees}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                      <span>{stats.nb} mouvement(s)</span>
                      {canViewDetails && (
                        <span className="flex items-center gap-1 text-terre font-bold">
                          <Info size={12} /> Détails
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <Wallet size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucune caisse trouvée</h3>
          <p className="text-gray-500 mb-6">
            {filterType === 'all'
              ? 'Commencez par créer votre première caisse'
              : `Aucune caisse de type "${typeCaisseLabels[filterType as TypeCaisse]}" n'existe`
            }
          </p>
          {canCreate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg"
            >
              <Plus size={20} />
              Créer une caisse
            </button>
          )}
        </div>
      )}

      {/* Création de caisse */}
      {showAddModal && (
        <Fenetre titre="Nouvelle caisse" onClose={() => setShowAddModal(false)}>
          <Champ id="c-nom" label="Nom de la caisse *">
            <input id="c-nom" value={newCaisse.nom} onChange={e => setNewCaisse({ ...newCaisse, nom: e.target.value })} placeholder="Ex : Caisse de solidarité" className={saisie} />
          </Champ>
          <Champ id="c-type" label="Type de caisse *">
            <select id="c-type" value={newCaisse.type} onChange={e => setNewCaisse({ ...newCaisse, type: e.target.value as TypeCaisse })} className={saisie}>
              {Object.entries(typeCaisseLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Champ>
          <Champ id="c-desc" label="Description">
            <textarea id="c-desc" value={newCaisse.description} onChange={e => setNewCaisse({ ...newCaisse, description: e.target.value })} rows={3} placeholder="À quoi sert cette caisse ?" className={saisieZone} />
          </Champ>
          <Champ id="c-montant" label={`Cotisation annuelle (${parametres.devise})`} aide="Laissez vide si le montant est variable.">
            <input id="c-montant" type="number" inputMode="numeric" value={newCaisse.montantAnnuel} onChange={e => setNewCaisse({ ...newCaisse, montantAnnuel: e.target.value })} placeholder="Ex : 10000" className={saisie} />
          </Champ>
          <label className="flex items-center gap-3 text-sm text-encre font-medium cursor-pointer">
            <input type="checkbox" checked={newCaisse.actif} onChange={e => setNewCaisse({ ...newCaisse, actif: e.target.checked })} className="w-5 h-5 accent-[#A5410E]" />
            Caisse active
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowAddModal(false)} className={boutonSecondaire}>Annuler</button>
            <button onClick={handleCreateCaisse} className={`${boutonPrincipal} flex-1`}>Créer la caisse</button>
          </div>
        </Fenetre>
      )}

      {/* Modal de détails (accessible uniquement à admin/presidente) */}
      {selected && canViewDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-creme rounded-3xl w-full max-w-4xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-3xl font-bold text-encre">{selected.nom}</h3>
                <p className="text-sm text-gray-500">{selected.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    caissesObligatoires.includes(selected.type)
                      ? 'bg-encre text-creme'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {caissesObligatoires.includes(selected.type) ? 'Obligatoire' : 'Facultative'}
                  </span>
                  <span className="px-3 py-1 bg-safran/30 text-encre rounded-full text-xs font-bold">
                    {typeCaisseLabels[selected.type]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCaisse(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} />
              </button>
            </div>

            {/* Statistiques de la caisse */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-sable rounded-xl p-4 text-center">
                <p className="text-xs text-gray-600 font-medium mb-1">Solde</p>
                <p className="text-xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(selected.solde)}</p>
              </div>
              <div className="bg-white border border-sable rounded-xl p-4 text-center">
                <p className="text-xs text-gray-600 font-medium mb-1">Total Entrées</p>
                <p className="text-xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(getCaisseStats(selected.id).entrees)}</p>
              </div>
              <div className="bg-white border border-sable rounded-xl p-4 text-center">
                <p className="text-xs text-gray-600 font-medium mb-1">Total Sorties</p>
                <p className="text-xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(getCaisseStats(selected.id).sorties)}</p>
              </div>
              <div className="bg-white border border-sable rounded-xl p-4 text-center">
                <p className="text-xs text-gray-600 font-medium mb-1">Mouvements</p>
                <p className="text-xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{getCaisseStats(selected.id).nb}</p>
              </div>
            </div>

            {/* Caractéristiques de la caisse */}
            <div className="bg-white border border-sable rounded-xl p-4 mb-6">
              <h4 className="text-lg font-bold text-encre mb-3 flex items-center gap-2">
                <Info size={18} />
                Caractéristiques
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium text-gray-800">{typeCaisseLabels[selected.type]}</span>
                </div>
                <div>
                  <span className="text-gray-500">Statut:</span>
                  <span className="ml-2 font-medium text-gray-800">{selected.actif ? '✅ Active' : '❌ Inactive'}</span>
                </div>
                {selected.montantAnnuel && (
                  <div>
                    <span className="text-gray-500">Montant annuel:</span>
                    <span className="ml-2 font-medium text-gray-800">{formatMontant(selected.montantAnnuel)}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Date création:</span>
                  <span className="ml-2 font-medium text-gray-800">
                    {new Date(selected.dateCreation).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Liste des membres et leurs apports */}
            <div>
              <h4 className="text-lg font-bold text-encre mb-3 flex items-center gap-2">
                <Users size={18} />
                Membres et leurs apports ({selectedMembres.length})
              </h4>

              {selectedMembres.length > 0 ? (
                <div className="bg-white border border-sable rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-creme border-b border-sable">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Membre</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Téléphone</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Apport Total</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nb Mouvements</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedMembres.map(({ membre, total, nbMouvements }) => (
                        <tr key={membre.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-safran rounded-full flex items-center justify-center">
                                <span className="text-encre font-bold text-xs">
                                  {membre.prenom[0]}{membre.nom[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{membre.prenom} {membre.nom}</p>
                                <p className="text-xs text-gray-500">{membre.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{membre.telephone}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-bold ${total >= 0 ? 'text-green-700' : 'text-terre'}`}>
                              {formatMontant(total)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{nbMouvements}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-white border border-sable rounded-xl">
                  <Users size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>Aucun membre n'a encore contribué à cette caisse</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
