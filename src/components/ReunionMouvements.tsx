import { notifier } from '../lib/notifier';
import { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Plus, Wallet, Calendar, CircleDot, X } from 'lucide-react';
import { EVENEMENTS, typesDe, resume, verifierEligibilite, nomCaisse } from '../lib/evenements';
import { TypeMouvement, TypeEvenement, CategorieEvenement } from '../types';

// Saisie des mouvements pendant une réunion (mêmes règles que la page Mouvements)

const typeLabels: Partial<Record<TypeMouvement, string>> = {
  cotisation: 'Cotisation',
  epargne: 'Épargne',
  depense: 'Dépense',
  don: 'Don'
};

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500';

type Modal = 'mouvement' | 'evenement' | 'sortie' | 'tontine' | null;

export default function ReunionMouvements({ reunionId }: { reunionId: string }) {
  const { caisses, users, tontines, mouvements, addMouvement, enregistrerCotisationTontine, parametres } = useApp();
  const [modal, setModal] = useState<Modal>(null);
  const membres = users.filter(u => u.actif);
  const formatMontant = (n: number) => n.toLocaleString('fr-FR') + ' ' + parametres.devise;

  // Nouveau mouvement
  const [type, setType] = useState<TypeMouvement>('cotisation');
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [caisseId, setCaisseId] = useState('');
  const [membreId, setMembreId] = useState('');

  // Événement
  const [evCategorie, setEvCategorie] = useState<CategorieEvenement>('heureux');
  const [evType, setEvType] = useState<TypeEvenement>('naissance');
  const [evMembreId, setEvMembreId] = useState('');

  // Sortie physique
  const [sortieType, setSortieType] = useState<'retrait_epargne' | 'utilisation_amendes'>('retrait_epargne');
  const [sortieMembreId, setSortieMembreId] = useState('');
  const [sortieMontant, setSortieMontant] = useState('');
  const [sortieDescription, setSortieDescription] = useState('');

  // Cotisation tontine : mises du tour en cours des jeux actifs
  const tontinesActives = tontines.filter(t => t.statut === 'en_cours' && t.tours?.some(tr => tr.statut === 'en_cours'));
  const [tontineId, setTontineId] = useState('');
  const tontineChoisie = tontinesActives.find(t => t.id === tontineId);
  const tourChoisi = tontineChoisie?.tours?.find(tr => tr.statut === 'en_cours');
  const misesDues = tourChoisi?.cotisations.filter(c =>
    c.statut !== 'paye' && !(c.mouvementId && mouvementsEnCours(c.mouvementId))
  ) || [];

  function mouvementsEnCours(id: string) {
    return mouvements.some(m => m.id === id && m.statut !== 'rejete');
  }

  const fermer = () => {
    setModal(null);
    setMontant(''); setDescription(''); setMembreId('');
    setEvMembreId('');
    setSortieMontant(''); setSortieDescription(''); setSortieMembreId('');
  };

  const handleMouvement = () => {
    const m = parseInt(montant);
    if (!m || m <= 0 || !caisseId) return;
    const caisse = caisses.find(c => c.id === caisseId);
    if (caisse?.type === 'interets') {
      notifier('Les mouvements de la caisse Intérêts sont calculés automatiquement à partir des prêts remboursés.');
      return;
    }
    addMouvement({
      type,
      categorie: type === 'depense' ? 'sortie' : 'entree',
      montant: m,
      description: description || typeLabels[type] || type,
      caisseId,
      membreId: membreId || undefined,
      reunionId
    });
    fermer();
  };

  const handleEvenement = async () => {
    const beneficiaire = users.find(u => u.id === evMembreId);
    if (!beneficiaire) return;
    const spec = EVENEMENTS[evType];
    const mainLeveeTexte = spec.mainLevee > 0
      ? `\nMain levée : ${formatMontant(spec.mainLevee)} × ${membres.length} membres = ${formatMontant(spec.mainLevee * membres.length)}, remise en main propre (non enregistrée en caisse).`
      : '';

    if (!spec.prestation) {
      notifier(`${spec.label} — ${beneficiaire.prenom} ${beneficiaire.nom}${mainLeveeTexte}`, 'info', { persistant: true });
      fermer();
      return;
    }
    const caisse = caisses.find(c => c.type === spec.prestation!.caisse);
    if (!caisse) { notifier(`Caisse ${nomCaisse(spec.prestation.caisse)} introuvable`); return; }
    if (spec.prestation.caisse === 'secours') {
      const refus = await verifierEligibilite(evMembreId, caisses);
      if (refus) { notifier(refus, 'error'); return; }
    }
    if (caisse.solde < spec.prestation.montant) {
      notifier(`Le solde de la caisse ${nomCaisse(spec.prestation.caisse)} (${formatMontant(caisse.solde)}) est insuffisant pour cette prestation.`, 'error');
      return;
    }

    addMouvement({
      type: 'distribution',
      categorie: 'sortie',
      montant: spec.prestation.montant,
      description: `Prestation - ${spec.label} - Bénéficiaire: ${beneficiaire.prenom} ${beneficiaire.nom}`,
      caisseId: caisse.id,
      membreId: evMembreId,
      evenementType: evType,
      reunionId
    });
    notifier(`Prestation enregistrée : ${formatMontant(spec.prestation.montant)} (caisse ${nomCaisse(spec.prestation.caisse)}). En attente de validation.${mainLeveeTexte}`, 'success', { persistant: true });
    fermer();
  };

  const handleSortie = () => {
    const m = parseInt(sortieMontant);
    if (!m || m <= 0) { notifier('Veuillez entrer un montant valide'); return; }

    let cId: string;
    let desc: string;
    let mId: string | undefined;

    if (sortieType === 'retrait_epargne') {
      const caisseEpargne = caisses.find(c => c.type === 'epargne');
      const membre = users.find(u => u.id === sortieMembreId);
      if (!sortieMembreId || !membre) { notifier('Veuillez sélectionner un membre'); return; }
      if (!caisseEpargne) { notifier('Caisse Épargne introuvable'); return; }
      cId = caisseEpargne.id;
      mId = sortieMembreId;
      desc = `Retrait épargne - ${sortieDescription || 'Clôture exercice'} - ${membre.prenom} ${membre.nom}`;
    } else {
      const caisseAmendes = caisses.find(c => c.type === 'amendes');
      if (!caisseAmendes) { notifier('Caisse Amendes introuvable'); return; }
      cId = caisseAmendes.id;
      desc = `Utilisation amendes - ${sortieDescription || 'Dépense physique'}`;
    }

    addMouvement({ type: 'depense', categorie: 'sortie', montant: m, description: desc, caisseId: cId, membreId: mId, reunionId });
    fermer();
  };

  const evTypes = typesDe(evCategorie);
  const choisirCategorie = (c: CategorieEvenement) => {
    setEvCategorie(c);
    setEvType(typesDe(c)[0]);
  };

  const ouvrirMouvement = () => {
    setCaisseId(caisses.find(c => c.type === 'cassation')?.id || caisses.find(c => c.type !== 'interets')?.id || '');
    setMontant(String(parametres.montantCotisation || ''));
    setModal('mouvement');
  };

  const Entete = ({ titre }: { titre: string }) => (
    <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-gray-800">{titre}</h3><button onClick={fermer} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
  );
  const Membre = ({ value, onChange, optionnel }: { value: string; onChange: (v: string) => void; optionnel?: boolean }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputClass}>
      <option value="">{optionnel ? 'Aucun membre' : 'Choisir le membre...'}</option>
      {membres.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
    </select>
  );

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={ouvrirMouvement} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"><Plus size={14} /> Nouveau mouvement</button>
        <button onClick={() => setModal('evenement')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"><Calendar size={14} /> Événement</button>
        <button onClick={() => { setTontineId(tontinesActives[0]?.id || ''); setModal('tontine'); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"><CircleDot size={14} /> Cotisation tontine</button>
        <button onClick={() => setModal('sortie')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700"><Wallet size={14} /> Sortie physique</button>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            {modal === 'mouvement' && (
              <>
                <Entete titre="Nouveau mouvement" />
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={type} onChange={e => setType(e.target.value as TypeMouvement)} className={inputClass}>
                      {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Caisse</label>
                    <select value={caisseId} onChange={e => setCaisseId(e.target.value)} className={inputClass}>
                      {caisses.filter(c => c.actif && c.type !== 'interets').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Membre</label><Membre value={membreId} onChange={setMembreId} optionnel /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant ({parametres.devise})</label><input type="number" value={montant} onChange={e => setMontant(e.target.value)} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} /></div>
                  <button onClick={handleMouvement} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">Enregistrer</button>
                </div>
              </>
            )}

            {modal === 'evenement' && (
              <>
                <Entete titre="Événement" />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {(['heureux', 'triste'] as const).map(c => (
                      <button key={c} onClick={() => choisirCategorie(c)} className={`py-2 rounded-xl text-sm font-medium ${evCategorie === c ? (c === 'heureux' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white') : 'bg-gray-100 text-gray-600'}`}>{c === 'heureux' ? 'Heureux' : 'Triste'}</button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type d'événement</label>
                    <select value={evType} onChange={e => setEvType(e.target.value as TypeEvenement)} className={inputClass}>
                      {evTypes.map(t => <option key={t} value={t}>{resume(t, parametres.devise)}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Bénéficiaire</label><Membre value={evMembreId} onChange={setEvMembreId} /></div>
                  <div className="text-sm text-encre bg-safran/15 border border-safran/50 rounded-xl p-3 space-y-1">
                    {EVENEMENTS[evType].prestation
                      ? <p><strong>Prestation :</strong> {formatMontant(EVENEMENTS[evType].prestation!.montant)} (caisse {nomCaisse(EVENEMENTS[evType].prestation!.caisse)})</p>
                      : <p>Aucune prestation de caisse.</p>}
                    {EVENEMENTS[evType].mainLevee > 0 && <p><strong>Main levée :</strong> {formatMontant(EVENEMENTS[evType].mainLevee)} × {membres.length} membres = {formatMontant(EVENEMENTS[evType].mainLevee * membres.length)}</p>}
                    <p className="text-xs text-gray-600">La main levée est remise en main propre : elle n'est pas enregistrée en caisse.</p>
                  </div>
                  <button disabled={!evMembreId} onClick={handleEvenement} className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-40">{EVENEMENTS[evType].prestation ? 'Enregistrer la prestation' : 'Voir le détail'}</button>
                </div>
              </>
            )}

            {modal === 'tontine' && (
              <>
                <Entete titre="Cotisation tontine" />
                {tontinesActives.length === 0 ? <p className="text-sm text-gray-500">Aucun jeu de tontine en cours.</p> : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jeu de tontine</label>
                      <select value={tontineId} onChange={e => setTontineId(e.target.value)} className={inputClass}>
                        {tontinesActives.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                      </select>
                    </div>
                    {tourChoisi && <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">Tour {tourChoisi.numero} — bénéficiaire : {(() => { const u = users.find(x => x.id === tourChoisi.membreId); return u ? `${u.prenom} ${u.nom}` : '—'; })()}</p>}
                    {misesDues.length === 0 ? <p className="text-sm text-green-700">Toutes les mises de ce tour sont enregistrées.</p> : (
                      <div className="space-y-2">
                        {misesDues.map(c => {
                          const u = users.find(x => x.id === c.membreId);
                          return (
                            <div key={c.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-800">{u ? `${u.prenom} ${u.nom}` : '—'} <span className="text-gray-500">· {formatMontant(c.montant)}</span></span>
                              <button onClick={() => enregistrerCotisationTontine(tourChoisi!.id, c.participantId, reunionId)} className="px-3 py-1 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700">Enregistrer</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {modal === 'sortie' && (
              <>
                <Entete titre="Sortie physique" />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setSortieType('retrait_epargne')} className={`py-2 rounded-xl text-sm font-medium ${sortieType === 'retrait_epargne' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Retrait épargne</button>
                    <button onClick={() => setSortieType('utilisation_amendes')} className={`py-2 rounded-xl text-sm font-medium ${sortieType === 'utilisation_amendes' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Utilisation amendes</button>
                  </div>
                  {sortieType === 'retrait_epargne' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Membre</label><Membre value={sortieMembreId} onChange={setSortieMembreId} /></div>}
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant ({parametres.devise})</label><input type="number" value={sortieMontant} onChange={e => setSortieMontant(e.target.value)} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Motif</label><input type="text" value={sortieDescription} onChange={e => setSortieDescription(e.target.value)} className={inputClass} /></div>
                  <button onClick={handleSortie} className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700">Enregistrer la sortie</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
