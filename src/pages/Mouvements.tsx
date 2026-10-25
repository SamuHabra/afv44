import { notifier } from '../lib/notifier';
import { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Plus, Check, Clock, Filter, XCircle, TrendingUp, TrendingDown, Calendar, Wallet, Heart, Gavel } from 'lucide-react';
import { KenteBand, SunDisc } from '../components/Motifs';
import { Fenetre, Champ, Info, saisie, saisieZone, boutonPrincipal, boutonSecondaire } from '../components/ui';
import { EVENEMENTS, typesDe, resume, verifierEligibilite, nomCaisse } from '../lib/evenements';
import { useBaremeAmendes } from '../hooks/useBaremeAmendes';
import { TypeMouvement, CategorieMouvement, TypeEvenement, CategorieEvenement } from '../types';

export default function Mouvements() {
  const { mouvements, caisses, users, addMouvement, validerMouvement, rejeterMouvement, currentUser, parametres } = useApp();
  const amendeMontants = useBaremeAmendes();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEvenementModal, setShowEvenementModal] = useState(false);
  const [showSortiePhysiqueModal, setShowSortiePhysiqueModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCaisse, setFilterCaisse] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterCategorie, setFilterCategorie] = useState<string>('all');

  // Form state for mouvement
  const [formType, setFormType] = useState<TypeMouvement>('cotisation');
  const [formMontant, setFormMontant] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCaisseId, setFormCaisseId] = useState(caisses[0]?.id || '');
  const [formMembreId, setFormMembreId] = useState('');

  // Form state for événement
  const [eventCategorie, setEventCategorie] = useState<CategorieEvenement>('heureux');
  const [eventSousType, setEventSousType] = useState<TypeEvenement>('naissance');
  const [eventMembreId, setEventMembreId] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  // Form state for amende (Bug #1)
  const [amendeMembreId, setAmendeMembreId] = useState('');
  const [amendeType, setAmendeType] = useState('retard');
  const [showAmendeModal, setShowAmendeModal] = useState(false);

  // Form state for sortie physique (Bug #2 & #3)
  const [sortieType, setSortieType] = useState<'retrait_epargne' | 'utilisation_amendes'>('retrait_epargne');
  const [sortieMembreId, setSortieMembreId] = useState('');
  const [sortieMontant, setSortieMontant] = useState('');
  const [sortieDescription, setSortieDescription] = useState('');

  const canCreate = currentUser?.role === 'admin' || currentUser?.role === 'presidente' || currentUser?.role === 'tresoriere';
  const canValidate = currentUser?.role === 'admin' || currentUser?.role === 'presidente' || currentUser?.role === 'commissaire';

  const typeLabels: Record<TypeMouvement, string> = {
    cotisation: 'Cotisation',
    epargne: 'Épargne',
    depense: 'Dépense',
    penalite: 'Pénalité',
    don: 'Don',
    remboursement: 'Remboursement',
    pret: 'Prêt',
    distribution: 'Distribution',
    interet: 'Intérêt'
  };

  // Un membre ordinaire ne voit que ses propres mouvements
  const visibles = mouvements.filter(m => currentUser?.role !== 'membre' || m.membreId === currentUser.id);
  const [limite, setLimite] = useState(25);

  const filteredMouvements = mouvements
    .filter(m => {
      const matchType = filterType === 'all' || m.type === filterType;
      const matchCaisse = filterCaisse === 'all' || m.caisseId === filterCaisse;
      const matchStatut = filterStatut === 'all' || m.statut === filterStatut;
      const matchCategorie = filterCategorie === 'all' || m.categorie === filterCategorie;

      // Si membre simple, ne voir que ses propres mouvements
      if (currentUser?.role === 'membre') {
        return matchType && matchCaisse && matchStatut && matchCategorie && m.membreId === currentUser.id;
      }

      return matchType && matchCaisse && matchStatut && matchCategorie;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = () => {
    if (!formMontant || !formCaisseId) return;

    // Bug #1 : Bloquer les mouvements manuels dans la caisse Intérêts
    const caisse = caisses.find(c => c.id === formCaisseId);
    if (caisse?.type === 'interets') {
      notifier('⚠️ Les mouvements dans la caisse Intérêts sont calculés automatiquement à partir des prêts remboursés. Vous ne pouvez pas créer de mouvement manuel dans cette caisse.');
      return;
    }

    const categorie: CategorieMouvement = ['cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet'].includes(formType) ? 'entree' : 'sortie';
    addMouvement({
      type: formType,
      categorie,
      montant: parseInt(formMontant),
      description: formDescription || typeLabels[formType],
      caisseId: formCaisseId,
      membreId: formMembreId || undefined
    });
    setFormMontant('');
    setFormDescription('');
    setFormMembreId('');
    setShowAddModal(false);
  };

  const handleEvenement = async () => {
    if (!eventMembreId || !eventDate) return;

    const spec = EVENEMENTS[eventSousType];
    const beneficiaire = users.find(u => u.id === eventMembreId);
    if (!beneficiaire) {
      notifier('Bénéficiaire introuvable');
      return;
    }
    const nombreMembres = users.filter(u => u.actif).length;
    const mainLeveeTotale = spec.mainLevee * nombreMembres;
    const mainLeveeTexte = spec.mainLevee > 0
      ? `\n\nMain levée : ${formatMontant(spec.mainLevee)} × ${nombreMembres} membres = ${formatMontant(mainLeveeTotale)}, remise en main propre (non enregistrée en caisse).`
      : '';

    // Pas de prestation de caisse : seule la main levée est à collecter
    if (!spec.prestation) {
      notifier(`Événement : ${spec.label}\nBénéficiaire : ${beneficiaire.prenom} ${beneficiaire.nom}${mainLeveeTexte}`, 'info', { persistant: true });
      setEventMembreId('');
      setEventDate('');
      setShowEvenementModal(false);
      return;
    }

    const caisse = caisses.find(c => c.type === spec.prestation!.caisse);
    if (!caisse) {
      notifier(`Caisse ${nomCaisse(spec.prestation.caisse)} introuvable`);
      return;
    }
    if (spec.prestation.caisse === 'secours') {
      const refus = await verifierEligibilite(eventMembreId, caisses);
      if (refus) {
        notifier(refus, 'error');
        return;
      }
    }
    if (caisse.solde < spec.prestation.montant) {
      notifier(`Le solde de la caisse ${nomCaisse(spec.prestation.caisse)} (${formatMontant(caisse.solde)}) est insuffisant pour cette prestation.`, 'error');
      return;
    }

    // Un seul mouvement : la prestation fixe prévue par les statuts, versée par la caisse
    addMouvement({
      type: 'distribution',
      categorie: 'sortie',
      montant: spec.prestation.montant,
      description: `Prestation - ${spec.label} - Bénéficiaire: ${beneficiaire.prenom} ${beneficiaire.nom}`,
      caisseId: caisse.id,
      membreId: eventMembreId,
      evenementType: eventSousType
    });

    // Valider automatiquement le mouvement (il est créé avec statut "en_attente")
    setTimeout(async () => {
      const nouveauxMouvements = mouvements.filter(m =>
        m.evenementType === eventSousType &&
        m.statut === 'en_attente' &&
        new Date(m.date).toDateString() === new Date().toDateString()
      );

      for (const mvt of nouveauxMouvements) {
        await validerMouvement(mvt.id);
      }
    }, 500);

    setEventMembreId('');
    setEventDate('');
    setShowEvenementModal(false);

    notifier(`✅ ${spec.label} enregistré\n\nPrestation : ${formatMontant(spec.prestation.montant)} (caisse ${nomCaisse(spec.prestation.caisse)})\nBénéficiaire : ${beneficiaire.prenom} ${beneficiaire.nom}${mainLeveeTexte}`, 'success', { persistant: true });
  };

  const handleReject = () => {
    if (showRejectModal && rejectMotif) {
      rejeterMouvement(showRejectModal, rejectMotif);
      setShowRejectModal(null);
      setRejectMotif('');
    }
  };

  // Bug #1 : Handler pour amende automatisée
  const handleAmende = () => {
    if (!amendeMembreId) return;

    const caisseAmendes = caisses.find(c => c.type === 'amendes');
    if (!caisseAmendes) {
      notifier('Caisse Amendes introuvable');
      return;
    }

    const membre = users.find(u => u.id === amendeMembreId);
    if (!membre) {
      notifier('Membre introuvable');
      return;
    }

    const amendeInfo = amendeMontants[amendeType];
    const description = `Amende ${amendeInfo.label} - ${membre.prenom} ${membre.nom}`;

    addMouvement({
      type: 'penalite',
      categorie: 'entree',
      montant: amendeInfo.montant,
      description,
      caisseId: caisseAmendes.id,
      membreId: amendeMembreId
    });

    setAmendeMembreId('');
    setAmendeType('retard');
    setShowAmendeModal(false);

    notifier(`✅ Amende enregistrée avec succès !\n\nMembre : ${membre.prenom} ${membre.nom}\nType : ${amendeInfo.label}\nMontant : ${formatMontant(amendeInfo.montant)}\n\n💡 Le mouvement est en attente de validation`);
  };

  // Bug #2 & #3 : Handler pour sortie physique
  const handleSortiePhysique = () => {
    if (!sortieMontant || parseInt(sortieMontant) <= 0) {
      notifier('Veuillez entrer un montant valide');
      return;
    }

    let caisseId = '';
    let description = '';
    let membreId: string | undefined = undefined;

    if (sortieType === 'retrait_epargne') {
      // Retrait épargne
      if (!sortieMembreId) {
        notifier('Veuillez sélectionner un membre');
        return;
      }

      const caisseEpargne = caisses.find(c => c.type === 'epargne');
      if (!caisseEpargne) {
        notifier('Caisse Épargne introuvable');
        return;
      }

      const membre = users.find(u => u.id === sortieMembreId);
      if (!membre) {
        notifier('Membre introuvable');
        return;
      }

      caisseId = caisseEpargne.id;
      membreId = sortieMembreId;
      description = `Retrait épargne - ${sortieDescription || 'Clôture exercice'} - ${membre.prenom} ${membre.nom}`;
    } else {
      // Utilisation amendes
      const caisseAmendes = caisses.find(c => c.type === 'amendes');
      if (!caisseAmendes) {
        notifier('Caisse Amendes introuvable');
        return;
      }

      caisseId = caisseAmendes.id;
      description = `Utilisation amendes - ${sortieDescription || 'Dépense physique'}`;
    }

    addMouvement({
      type: 'depense',
      categorie: 'sortie',
      montant: parseInt(sortieMontant),
      description,
      caisseId,
      membreId
    });

    setSortieMontant('');
    setSortieDescription('');
    setSortieMembreId('');
    setShowSortiePhysiqueModal(false);

    notifier(`✅ Sortie physique enregistrée avec succès !\n\nType : ${sortieType === 'retrait_epargne' ? 'Retrait épargne' : 'Utilisation amendes'}\nMontant : ${formatMontant(parseInt(sortieMontant))}\n\n💡 Le mouvement est en attente de validation`);
  };

  const formatMontant = (n: number) => n.toLocaleString('fr-FR') + ' ' + parametres.devise;

  // Statistiques
  const totalEntrees = mouvements.filter(m => m.statut === 'valide' && m.categorie === 'entree').reduce((sum, m) => sum + m.montant, 0);
  const totalSorties = mouvements.filter(m => m.statut === 'valide' && m.categorie === 'sortie').reduce((sum, m) => sum + m.montant, 0);
  const enAttente = mouvements.filter(m => m.statut === 'en_attente').length;
  const valides = mouvements.filter(m => m.statut === 'valide').length;

  const nbParStatut = (st: string) => visibles.filter(m => st === 'all' || m.statut === st).length;
  const net = totalEntrees - totalSorties;
  const aAfficher = filteredMouvements.slice(0, limite);

  const badgeStatut = (mvt: (typeof mouvements)[number]) => {
    if (mvt.statut === 'valide') return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold"><Check size={12} /> Validé</span>;
    if (mvt.statut === 'en_attente') return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-safran/30 text-encre rounded-full text-xs font-bold"><Clock size={12} /> À valider</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold" title={mvt.motifRejet}><XCircle size={12} /> Rejeté</span>;
  };

  const actionsValidation = (id: string) => (
    <div className="flex gap-2">
      <button onClick={() => validerMouvement(id)} className="px-4 h-10 bg-green-700 text-white text-sm font-bold rounded-xl hover:bg-green-800">Valider</button>
      <button onClick={() => setShowRejectModal(id)} className="px-4 h-10 bg-white border-2 border-red-300 text-red-700 text-sm font-bold rounded-xl hover:bg-red-50">Rejeter</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Bandeau */}
      <section className="relative overflow-hidden bg-encre text-creme rounded-3xl">
        <SunDisc className="-top-20 -right-12 w-64 h-64" />
        <div className="relative px-6 py-6 lg:px-8 lg:py-7 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-sable mb-1">Entrées et sorties d'argent</p>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight">Les mouvements</h1>
            </div>
            {canCreate && (
              <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 px-6 h-12 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12] hover:brightness-105 transition">
                <Plus size={18} /> Nouveau mouvement
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
            <div><p className="text-xs uppercase tracking-widest text-sable flex items-center gap-1"><TrendingUp size={12} /> Entrées</p><p className="text-2xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(totalEntrees)}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-sable flex items-center gap-1"><TrendingDown size={12} /> Sorties</p><p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(totalSorties)}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-sable">Solde net</p><p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{net >= 0 ? '+' : '−'}{formatMontant(Math.abs(net))}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-sable flex items-center gap-1"><Clock size={12} /> À valider</p><p className="text-2xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{enAttente}</p></div>
          </div>
          {canCreate && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs uppercase tracking-widest text-sable self-center mr-1">Saisies rapides</span>
              <button onClick={() => setShowAmendeModal(true)} className="flex items-center gap-2 px-4 h-10 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold"><Gavel size={16} /> Amende</button>
              <button onClick={() => setShowEvenementModal(true)} className="flex items-center gap-2 px-4 h-10 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold"><Heart size={16} /> Événement</button>
              <button onClick={() => setShowSortiePhysiqueModal(true)} className="flex items-center gap-2 px-4 h-10 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold"><Wallet size={16} /> Sortie physique</button>
            </div>
          )}
        </div>
        <KenteBand height={10} />
      </section>

      {/* À valider : mis en avant pour celles qui valident */}
      {canValidate && enAttente > 0 && filterStatut !== 'en_attente' && (
        <button onClick={() => setFilterStatut('en_attente')} className="w-full text-left flex items-center gap-3 p-4 bg-safran/20 border-2 border-safran rounded-2xl hover:bg-safran/30 transition">
          <Clock size={22} className="text-terre shrink-0" />
          <span className="flex-1 font-bold text-encre">{enAttente} mouvement(s) attendent votre validation</span>
          <span className="text-sm font-bold text-terre">Voir →</span>
        </button>
      )}

      {/* Filtres */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
          {[['all', 'Tous'], ['en_attente', 'À valider'], ['valide', 'Validés'], ['rejete', 'Rejetés']].map(([key, label]) => (
            <button key={key} onClick={() => setFilterStatut(key)} aria-pressed={filterStatut === key}
              className={`px-4 h-10 rounded-full text-sm font-medium transition ${filterStatut === key ? 'bg-encre text-creme' : 'bg-white border border-sable text-gray-700 hover:border-encre'}`}>
              {label} <span className={filterStatut === key ? 'text-safran' : 'text-gray-500'}>{nbParStatut(key)}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-xl bg-white border border-sable p-1" role="group" aria-label="Sens du mouvement">
            {[['all', 'Tout'], ['entree', 'Entrées'], ['sortie', 'Sorties']].map(([key, label]) => (
              <button key={key} onClick={() => setFilterCategorie(key)} aria-pressed={filterCategorie === key}
                className={`px-3 h-9 rounded-lg text-sm font-bold ${filterCategorie === key ? 'bg-creme text-encre' : 'text-gray-600 hover:text-encre'}`}>{label}</button>
            ))}
          </div>
          <label className="sr-only" htmlFor="f-type">Type</label>
          <select id="f-type" value={filterType} onChange={e => setFilterType(e.target.value)} className="h-11 px-3 bg-white border border-sable rounded-xl text-sm outline-none focus:border-safran">
            <option value="all">Tous les types</option>
            {Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-caisse">Caisse</label>
          <select id="f-caisse" value={filterCaisse} onChange={e => setFilterCaisse(e.target.value)} className="h-11 px-3 bg-white border border-sable rounded-xl text-sm outline-none focus:border-safran">
            <option value="all">Toutes les caisses</option>
            {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Liste : tableau sur grand écran, cartes sur téléphone */}
      <div className="hidden md:block bg-white rounded-2xl border border-sable overflow-hidden">
        <table className="w-full">
          <thead className="bg-creme border-b border-sable">
            <tr>
              {['Date', 'Mouvement', 'Caisse', 'Membre'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">{h}</th>)}
              <th className="text-right px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Montant</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Statut</th>
              {canValidate && <th className="px-5 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-sable/60">
            {aAfficher.map(mvt => {
              const caisse = caisses.find(c => c.id === mvt.caisseId);
              const membre = mvt.membreId ? users.find(u => u.id === mvt.membreId) : null;
              const credit = mvt.categorie === 'entree';
              return (
                <tr key={mvt.id} className="hover:bg-creme/50 transition">
                  <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{new Date(mvt.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-4 max-w-[280px]">
                    <p className="text-sm font-bold text-encre">{typeLabels[mvt.type]}</p>
                    <p className="text-xs text-gray-600 truncate" title={mvt.description}>{mvt.description}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">{caisse?.nom}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{membre ? `${membre.prenom} ${membre.nom}` : '—'}</td>
                  <td className={`px-5 py-4 text-right text-sm font-bold whitespace-nowrap ${credit ? 'text-green-700' : 'text-terre'}`}>{credit ? '+' : '−'}{formatMontant(mvt.montant)}</td>
                  <td className="px-5 py-4">{badgeStatut(mvt)}</td>
                  {canValidate && <td className="px-5 py-4">{mvt.statut === 'en_attente' && actionsValidation(mvt.id)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {aAfficher.map(mvt => {
          const caisse = caisses.find(c => c.id === mvt.caisseId);
          const membre = mvt.membreId ? users.find(u => u.id === mvt.membreId) : null;
          const credit = mvt.categorie === 'entree';
          return (
            <article key={mvt.id} className="bg-white border border-sable rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-encre">{typeLabels[mvt.type]}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{mvt.description}</p>
                </div>
                <p className={`font-bold whitespace-nowrap ${credit ? 'text-green-700' : 'text-terre'}`} style={{ fontFamily: 'var(--font-display)' }}>{credit ? '+' : '−'}{formatMontant(mvt.montant)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                <span>{new Date(mvt.date).toLocaleDateString('fr-FR')}</span>
                <span>{caisse?.nom}</span>
                {membre && <span>{membre.prenom} {membre.nom}</span>}
                {badgeStatut(mvt)}
              </div>
              {canValidate && mvt.statut === 'en_attente' && actionsValidation(mvt.id)}
            </article>
          );
        })}
      </div>

      {filteredMouvements.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border-2 border-dashed border-sable">
          <Filter size={44} className="mx-auto mb-3 text-gray-300" />
          <p className="font-bold text-encre">Aucun mouvement trouvé</p>
          <p className="text-sm mt-1">Changez de filtre pour en voir davantage.</p>
        </div>
      )}
      {filteredMouvements.length > limite && (
        <div className="text-center">
          <button onClick={() => setLimite(l => l + 25)} className={boutonSecondaire}>Afficher plus ({filteredMouvements.length - limite} restants)</button>
        </div>
      )}

      {/* ───── Nouveau mouvement ───── */}
      {showAddModal && (
        <Fenetre titre="Nouveau mouvement" onClose={() => setShowAddModal(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Champ id="mv-type" label="Type">
              <select id="mv-type" value={formType} onChange={e => setFormType(e.target.value as TypeMouvement)} className={saisie}>
                {Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Champ>
            <Champ id="mv-montant" label={`Montant (${parametres.devise})`}>
              <input id="mv-montant" type="number" inputMode="numeric" value={formMontant} onChange={e => setFormMontant(e.target.value)} placeholder="2000" className={saisie} />
            </Champ>
          </div>
          <Champ id="mv-caisse" label="Caisse" aide="La caisse Intérêts est alimentée automatiquement.">
            <select id="mv-caisse" value={formCaisseId} onChange={e => setFormCaisseId(e.target.value)} className={saisie}>
              {caisses.filter(c => c.actif && c.type !== 'interets').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Champ>
          <Champ id="mv-membre" label="Membre concernée (facultatif)">
            <select id="mv-membre" value={formMembreId} onChange={e => setFormMembreId(e.target.value)} className={saisie}>
              <option value="">Aucune</option>
              {users.filter(u => u.actif).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
          </Champ>
          <Champ id="mv-desc" label="Description">
            <input id="mv-desc" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Ex : ration de novembre" className={saisie} />
          </Champ>
          <button onClick={handleAdd} disabled={!formMontant} className={boutonPrincipal}>Enregistrer le mouvement</button>
        </Fenetre>
      )}

      {/* ───── Événement ───── */}
      {showEvenementModal && (
        <Fenetre titre="Nouvel événement" sousTitre="Barème des statuts, article 25" onClose={() => setShowEvenementModal(false)}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Catégorie">
            {([['heureux', 'Heureux', 'naissance'], ['triste', 'Triste', 'deces_membre']] as const).map(([cat, label, premier]) => (
              <button key={cat} onClick={() => { setEventCategorie(cat); setEventSousType(premier); }} aria-pressed={eventCategorie === cat}
                className={`h-11 rounded-xl font-bold transition ${eventCategorie === cat ? 'bg-encre text-creme' : 'bg-white border-2 border-sable text-gray-700 hover:border-encre'}`}>{label}</button>
            ))}
          </div>
          <Champ id="ev-type" label="Type d'événement">
            <select id="ev-type" value={eventSousType} onChange={e => setEventSousType(e.target.value as TypeEvenement)} className={saisie}>
              {typesDe(eventCategorie).map(t => <option key={t} value={t}>{resume(t, parametres.devise)}</option>)}
            </select>
          </Champ>
          <Champ id="ev-membre" label="Bénéficiaire">
            <select id="ev-membre" value={eventMembreId} onChange={e => setEventMembreId(e.target.value)} className={saisie}>
              <option value="">Sélectionner</option>
              {users.filter(u => u.actif).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
          </Champ>
          <Champ id="ev-date" label="Date de l'événement">
            <input id="ev-date" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={saisie} />
          </Champ>
          <Info>
            {EVENEMENTS[eventSousType].prestation
              ? <p><strong>Prestation de la caisse {nomCaisse(EVENEMENTS[eventSousType].prestation!.caisse)} :</strong> {formatMontant(EVENEMENTS[eventSousType].prestation!.montant)}</p>
              : <p>Aucune prestation de caisse pour cet événement.</p>}
            {EVENEMENTS[eventSousType].mainLevee > 0 && (
              <p><strong>Main levée :</strong> {formatMontant(EVENEMENTS[eventSousType].mainLevee)} × {users.filter(u => u.actif).length} membres = {formatMontant(EVENEMENTS[eventSousType].mainLevee * users.filter(u => u.actif).length)}
                {EVENEMENTS[eventSousType].mainLeveeNote ? ` (${EVENEMENTS[eventSousType].mainLeveeNote})` : ''}</p>
            )}
            {EVENEMENTS[eventSousType].mainLeveeNote && EVENEMENTS[eventSousType].mainLevee === 0 && <p><strong>Main levée :</strong> {EVENEMENTS[eventSousType].mainLeveeNote}</p>}
            <p className="text-xs text-gray-600">La main levée est remise en main propre : elle n'est pas enregistrée en caisse.</p>
          </Info>
          <button onClick={handleEvenement} disabled={!eventMembreId || !eventDate} className={boutonPrincipal}>
            {EVENEMENTS[eventSousType].prestation ? 'Enregistrer la prestation' : 'Voir le détail de la collecte'}
          </button>
        </Fenetre>
      )}

      {/* ───── Rejet ───── */}
      {showRejectModal && (
        <Fenetre titre="Rejeter le mouvement" onClose={() => { setShowRejectModal(null); setRejectMotif(''); }}>
          <Champ id="rej-motif" label="Motif du rejet" aide="Le motif est visible par la personne qui a saisi le mouvement.">
            <textarea id="rej-motif" value={rejectMotif} onChange={e => setRejectMotif(e.target.value)} rows={3} placeholder="Pourquoi ce mouvement est-il refusé ?" className={saisieZone} />
          </Champ>
          <div className="flex gap-2">
            <button onClick={() => { setShowRejectModal(null); setRejectMotif(''); }} className={boutonSecondaire}>Annuler</button>
            <button onClick={handleReject} disabled={!rejectMotif.trim()} className="flex-1 h-12 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800 disabled:opacity-40">Confirmer le rejet</button>
          </div>
        </Fenetre>
      )}

      {/* ───── Amende ───── */}
      {showAmendeModal && (
        <Fenetre titre="Enregistrer une amende" sousTitre="Barème des statuts, article 23" onClose={() => setShowAmendeModal(false)}>
          <Champ id="am-membre" label="Membre">
            <select id="am-membre" value={amendeMembreId} onChange={e => setAmendeMembreId(e.target.value)} className={saisie}>
              <option value="">Sélectionner</option>
              {users.filter(u => u.actif).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
          </Champ>
          <Champ id="am-type" label="Motif de l'amende">
            <select id="am-type" value={amendeType} onChange={e => setAmendeType(e.target.value)} className={saisie}>
              {Object.entries(amendeMontants).map(([key, val]) => <option key={key} value={key}>{val.label} — {formatMontant(val.montant)}</option>)}
            </select>
          </Champ>
          <Info>
            <p><strong>Montant :</strong> {amendeMontants[amendeType] ? formatMontant(amendeMontants[amendeType].montant) : '—'}</p>
            <p className="text-xs text-gray-600">Versé à la caisse Amendes ; la description est générée automatiquement.</p>
          </Info>
          <button onClick={handleAmende} disabled={!amendeMembreId} className={boutonPrincipal}>Enregistrer l'amende</button>
        </Fenetre>
      )}

      {/* ───── Sortie physique ───── */}
      {showSortiePhysiqueModal && (
        <Fenetre titre="Sortie physique" sousTitre="Argent remis en main propre" onClose={() => setShowSortiePhysiqueModal(false)}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Type de sortie">
            {([['retrait_epargne', 'Retrait d\'épargne'], ['utilisation_amendes', 'Dépense (amendes)']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSortieType(key)} aria-pressed={sortieType === key}
                className={`h-11 rounded-xl font-bold text-sm transition ${sortieType === key ? 'bg-encre text-creme' : 'bg-white border-2 border-sable text-gray-700 hover:border-encre'}`}>{label}</button>
            ))}
          </div>
          {sortieType === 'retrait_epargne' && (
            <Champ id="sp-membre" label="Membre">
              <select id="sp-membre" value={sortieMembreId} onChange={e => setSortieMembreId(e.target.value)} className={saisie}>
                <option value="">Sélectionner</option>
                {users.filter(u => u.actif).map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </Champ>
          )}
          <Champ id="sp-desc" label={sortieType === 'retrait_epargne' ? 'Motif' : 'Description de la dépense'}>
            <input id="sp-desc" value={sortieDescription} onChange={e => setSortieDescription(e.target.value)} placeholder={sortieType === 'retrait_epargne' ? 'Ex : retrait partiel, clôture d\'exercice' : 'Ex : achat de fournitures, animation'} className={saisie} />
          </Champ>
          <Champ id="sp-montant" label={`Montant (${parametres.devise})`}>
            <input id="sp-montant" type="number" inputMode="numeric" value={sortieMontant} onChange={e => setSortieMontant(e.target.value)} placeholder="5000" className={saisie} />
          </Champ>
          <Info>
            <p>{sortieType === 'retrait_epargne' ? 'La membre récupère son épargne en main propre.' : 'Dépense physique prélevée sur la caisse Amendes.'}</p>
            <p className="text-xs text-gray-600">Le mouvement reste « À valider » jusqu'à la validation.</p>
          </Info>
          <button onClick={handleSortiePhysique} disabled={!sortieMontant || (sortieType === 'retrait_epargne' && !sortieMembreId)} className={boutonPrincipal}>Enregistrer la sortie</button>
        </Fenetre>
      )}
    </div>
  );
}
