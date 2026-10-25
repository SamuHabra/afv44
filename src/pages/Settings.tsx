import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Settings as SettingsIcon, DollarSign, Users, Calendar, Lock, AlertTriangle, Check, X, ScrollText, Gavel, RotateCcw, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SecurityCheck from '../components/SecurityCheck';
import { Exercice, Parametres } from '../types';
import { ControleCloture, EntreeJournal, SoldeExercice, getControleCloture, getJournal, getSoldesExercices } from '../lib/parametres';

type Onglet = 'financier' | 'baremes' | 'exercice' | 'roles' | 'journal';

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500';
const roleLabels: Record<string, string> = {
  admin: 'Administratrice', presidente: 'Présidente', secretaire: 'Secrétaire', tresoriere: 'Trésorière',
  commissaire: 'Commissaire aux comptes', animatrice: 'Animatrice', conseillere: 'Conseillère', membre: 'Membre'
};
const rolePermissions: Record<string, string[]> = {
  admin: ['Tout gérer', 'Clôturer l\'exercice', 'Gérer les rôles', 'Modifier les paramètres'],
  presidente: ['Valider les mouvements', 'Approuver les prêts', 'Gérer les réunions', 'Gérer les tontines', 'Valider le PV', 'Valider les distributions'],
  tresoriere: ['Gérer les caisses', 'Présenter le rapport financier', 'Verser les pots de tontine', 'Voir les rapports'],
  secretaire: ['Gérer les réunions', 'Rédiger le PV', 'Saisir les amendes', 'Voir les rapports'],
  commissaire: ['Valider les mouvements', 'Contrôler la cohérence des caisses', 'Voir les rapports'],
  animatrice: ['Voir mon espace', 'Participer aux réunions'],
  conseillere: ['Voir mon espace', 'Participer aux réunions'],
  membre: ['Voir mon espace', 'Demander un prêt', 'S\'inscrire aux tontines']
};
const actionLabels: Record<string, string> = {
  parametres_modifies: 'Paramètres modifiés', exercice_ouvert: 'Exercice ouvert', exercice_cloture: 'Exercice clôturé',
  exercice_rouvert: 'Exercice rouvert', role_modifie: 'Rôle modifié', bareme_amende_modifie: 'Barème d\'amende modifié'
};

interface LigneBareme { code: string; libelle: string; montant: number }

export default function SettingsPage() {
  const {
    parametres, updateParametres, exercices, cloturerExercice, ouvrirExercice, rouvrirExercice, changerRole,
    modifierBaremeAmende, users, currentUser
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';
  const peutVoirJournal = isAdmin || currentUser?.role === 'commissaire';

  const [onglet, setOnglet] = useState<Onglet>('financier');
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [localParams, setLocalParams] = useState<Parametres>(parametres);

  const [bareme, setBareme] = useState<LigneBareme[]>([]);
  const [soldes, setSoldes] = useState<SoldeExercice[]>([]);
  const [exerciceOuvert, setExerciceOuvert] = useState<string | null>(null);
  const [journal, setJournal] = useState<EntreeJournal[]>([]);

  const derniereAnnee = exercices.reduce((m, e) => Math.max(m, e.annee), 0);
  const [nouvelleAnnee, setNouvelleAnnee] = useState(derniereAnnee ? derniereAnnee + 1 : new Date().getFullYear());

  // Clôture / réouverture
  const [clotureCible, setClotureCible] = useState<Exercice | null>(null);
  const [controle, setControle] = useState<ControleCloture | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [reouvertureCible, setReouvertureCible] = useState<Exercice | null>(null);
  const [motif, setMotif] = useState('');
  const [erreurModal, setErreurModal] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => { setLocalParams(parametres); }, [parametres]);

  const afficher = (ok: boolean, texte: string) => {
    setMessage({ ok, texte });
    setTimeout(() => setMessage(null), 4000);
  };

  const nomMembre = (id?: string) => {
    const u = users.find(x => x.id === id);
    return u ? `${u.prenom} ${u.nom}` : '—';
  };

  const chargerBareme = useCallback(async () => {
    const { data } = await supabase.from('types_amende').select('*').order('montant');
    setBareme((data || []).map(t => ({ code: t.code, libelle: t.libelle, montant: Number(t.montant) })));
  }, []);

  const chargerSoldes = useCallback(async () => {
    try { setSoldes(await getSoldesExercices()); } catch { setSoldes([]); }
  }, []);

  useEffect(() => {
    if (onglet === 'baremes') chargerBareme();
    if (onglet === 'exercice') chargerSoldes();
    if (onglet === 'journal' && peutVoirJournal) getJournal().then(setJournal).catch(() => setJournal([]));
  }, [onglet, chargerBareme, chargerSoldes, peutVoirJournal]);

  const sauvegarderParametres = async () => {
    const res = await updateParametres(localParams);
    afficher(res.ok, res.ok ? (res.inchange ? 'Aucune modification' : 'Paramètres sauvegardés') : res.error || 'Erreur');
  };

  const sauvegarderBareme = async (l: LigneBareme) => {
    const res = await modifierBaremeAmende(l.code, l.libelle, l.montant);
    afficher(res.ok, res.ok ? 'Barème mis à jour' : res.error || 'Erreur');
  };

  const ouvrir = async () => {
    const res = await ouvrirExercice(nouvelleAnnee);
    afficher(res.ok, res.ok ? `Exercice ${nouvelleAnnee} ouvert` : res.error || 'Erreur');
  };

  const demarrerCloture = async (ex: Exercice) => {
    setClotureCible(ex);
    setControle(null);
    setConfirmation(''); setMotDePasse(''); setErreurModal(null);
    try { setControle(await getControleCloture(ex.id)); }
    catch (e: any) { setErreurModal(`${e.message} (migration update-parametres.sql exécutée ?)`); }
  };

  const validerCloture = async () => {
    if (!clotureCible) return;
    setEnCours(true);
    const res = await cloturerExercice(clotureCible.id, motDePasse, confirmation);
    setEnCours(false);
    if (res.ok) {
      setClotureCible(null);
      afficher(true, `Exercice ${clotureCible.annee} clôturé`);
      chargerSoldes();
    } else {
      setErreurModal(res.error || 'Erreur');
      if (res.bloquants) setControle(prev => prev ? { ...prev, bloquants: res.bloquants! } : prev);
    }
  };

  const validerReouverture = async () => {
    if (!reouvertureCible) return;
    setEnCours(true);
    const res = await rouvrirExercice(reouvertureCible.id, motDePasse, motif);
    setEnCours(false);
    if (res.ok) {
      setReouvertureCible(null);
      afficher(true, `Exercice ${reouvertureCible.annee} rouvert`);
      chargerSoldes();
    } else {
      setErreurModal(res.error || 'Erreur');
    }
  };

  const changerLeRole = async (membreId: string, role: string) => {
    const res = await changerRole(membreId, role);
    afficher(res.ok, res.ok ? 'Rôle modifié' : res.error || 'Erreur');
  };

  const detailsJournal = (j: EntreeJournal) => {
    const d = j.details || {};
    switch (j.action) {
      case 'parametres_modifies': return Object.entries(d).map(([k, v]: [string, any]) => `${k.replace(/_/g, ' ')} : ${v.ancien} → ${v.nouveau}`).join(' · ');
      case 'exercice_ouvert': return `Exercice ${d.annee}`;
      case 'exercice_cloture': return `Exercice ${d.annee} · solde ${Number(d.solde_cloture).toLocaleString('fr-FR')} ${parametres.devise}`;
      case 'exercice_rouvert': return `Exercice ${d.annee} · motif : ${d.motif}`;
      case 'role_modifie': return `${d.membre} : ${roleLabels[d.ancien] || d.ancien} → ${roleLabels[d.nouveau] || d.nouveau}`;
      case 'bareme_amende_modifie': return `${d.ancien?.libelle} ${d.ancien?.montant} → ${d.nouveau?.libelle} ${d.nouveau?.montant}`;
      default: return JSON.stringify(d);
    }
  };

  const tabs: { id: Onglet; label: string; icon: any }[] = [
    { id: 'financier', label: 'Configuration', icon: DollarSign },
    { id: 'baremes', label: 'Barème des amendes', icon: Gavel },
    { id: 'exercice', label: 'Exercice annuel', icon: Calendar },
    ...(isAdmin ? [{ id: 'roles' as Onglet, label: 'Rôles', icon: Users }] : []),
    ...(peutVoirJournal ? [{ id: 'journal' as Onglet, label: 'Journal', icon: ScrollText }] : [])
  ];

  const exerciceEnCours = exercices.find(e => e.statut === 'ouvert');
  const dernierCloture = [...exercices].filter(e => e.statut === 'cloture').sort((a, b) => b.annee - a.annee)[0];
  const attendu = exerciceEnCours ? `CLÔTURER ${exerciceEnCours.annee}` : '';
  const clotureBloquee = !controle || controle.bloquants.length > 0;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`fixed top-4 right-4 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 z-[70] ${message.ok ? 'bg-green-500' : 'bg-red-500'}`}>
          {message.ok ? <Check size={18} /> : <AlertTriangle size={18} />} {message.texte}
        </div>
      )}

      {!isAdmin && <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl p-3">Consultation seule : les paramètres sont modifiables par l'administratrice.</p>}

      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setOnglet(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${onglet === tab.id ? 'bg-encre text-creme' : 'bg-white border border-sable text-gray-600 hover:bg-gray-50'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {isAdmin && onglet === 'roles' && currentUser && <SecurityCheck userId={currentUser.id} />}

      {/* Configuration */}
      {onglet === 'financier' && (
        <div className="bg-white rounded-2xl p-6 border border-sable">
          <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2"><SettingsIcon size={20} /> Configuration financière</h3>
          <p className="text-xs text-gray-500 mb-6">Le taux d'intérêt s'applique aux nouveaux prêts ; les prêts déjà accordés gardent leur taux.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Cotisation mensuelle ({localParams.devise})</label><input type="number" min="0" disabled={!isAdmin} value={localParams.montantCotisation} onChange={e => setLocalParams({ ...localParams, montantCotisation: parseFloat(e.target.value) || 0 })} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Pénalité de retard ({localParams.devise})</label><input type="number" min="0" disabled={!isAdmin} value={localParams.penaliteRetard} onChange={e => setLocalParams({ ...localParams, penaliteRetard: parseFloat(e.target.value) || 0 })} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Taux d'intérêt des prêts (%)</label><input type="number" min="0" max="100" step="0.1" disabled={!isAdmin} value={localParams.tauxInteretPret} onChange={e => setLocalParams({ ...localParams, tauxInteretPret: parseFloat(e.target.value) || 0 })} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Durée maximale d'un prêt (mois)</label><input type="number" min="1" max="120" disabled={!isAdmin} value={localParams.dureeMaxPretMois} onChange={e => setLocalParams({ ...localParams, dureeMaxPretMois: parseInt(e.target.value) || 0 })} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant maximal d'un prêt ({localParams.devise})</label><input type="number" min="0" disabled={!isAdmin} value={localParams.montantMaxPret} onChange={e => setLocalParams({ ...localParams, montantMaxPret: parseFloat(e.target.value) || 0 })} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Devise</label><input type="text" maxLength={10} disabled={!isAdmin} value={localParams.devise} onChange={e => setLocalParams({ ...localParams, devise: e.target.value })} className={inputClass} /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence des réunions</label>
              <select disabled={!isAdmin} value={localParams.frequenceReunion} onChange={e => setLocalParams({ ...localParams, frequenceReunion: e.target.value as any })} className={inputClass}>
                <option value="hebdomadaire">Hebdomadaire</option><option value="bimensuel">Bimensuel</option><option value="mensuel">Mensuel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jour de réunion</label>
              <select disabled={!isAdmin} value={localParams.jourReunion} onChange={e => setLocalParams({ ...localParams, jourReunion: e.target.value })} className={inputClass}>
                {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map(j => <option key={j} value={j}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>)}
              </select>
            </div>
          </div>
          {isAdmin && <button onClick={sauvegarderParametres} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">Sauvegarder les paramètres</button>}
        </div>
      )}

      {/* Barème des amendes */}
      {onglet === 'baremes' && (
        <div className="bg-white rounded-2xl p-6 border border-sable">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Barème des amendes</h3>
          <p className="text-xs text-gray-500 mb-6">Ces montants sont utilisés automatiquement pour les amendes saisies en réunion et dans Mouvements.</p>
          <div className="space-y-3">
            {bareme.map((l, i) => (
              <div key={l.code} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
                <div><label className="block text-xs text-gray-500 mb-1">Libellé</label><input type="text" disabled={!isAdmin} value={l.libelle} onChange={e => setBareme(b => b.map((x, j) => j === i ? { ...x, libelle: e.target.value } : x))} className={inputClass} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Montant ({parametres.devise})</label><input type="number" min="0" disabled={!isAdmin} value={l.montant} onChange={e => setBareme(b => b.map((x, j) => j === i ? { ...x, montant: parseFloat(e.target.value) || 0 } : x))} className={inputClass} /></div>
                {isAdmin && <button onClick={() => sauvegarderBareme(l)} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Enregistrer</button>}
              </div>
            ))}
            {bareme.length === 0 && <p className="text-sm text-gray-500">Barème indisponible (migration update-reunions.sql exécutée ?)</p>}
          </div>
        </div>
      )}

      {/* Exercice */}
      {onglet === 'exercice' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-sable">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Exercices annuels</h3>
            <div className="space-y-3">
              {[...exercices].sort((a, b) => b.annee - a.annee).map(ex => {
                const ouvert = ex.statut === 'ouvert';
                const lignes = soldes.filter(s => s.exerciceId === ex.id);
                return (
                  <div key={ex.id} className={`p-4 rounded-xl border ${ouvert ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-gray-800">Exercice {ex.annee}</h4>
                        <p className="text-sm text-gray-500">Ouvert le {new Date(ex.dateOuverture).toLocaleDateString('fr-FR')}{ex.dateCloture ? ` • Clôturé le ${new Date(ex.dateCloture).toLocaleDateString('fr-FR')}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {ex.soldeCloture != null && <p className="text-sm font-bold text-gray-700">Solde : {ex.soldeCloture.toLocaleString('fr-FR')} {parametres.devise}</p>}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${ouvert ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{ouvert ? 'Ouvert' : 'Clôturé'}</span>
                        {lignes.length > 0 && <button onClick={() => setExerciceOuvert(exerciceOuvert === ex.id ? null : ex.id)} className="text-xs text-indigo-600 hover:underline">{exerciceOuvert === ex.id ? 'Masquer les soldes' : 'Voir les soldes'}</button>}
                      </div>
                    </div>
                    {exerciceOuvert === ex.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {(['ouverture', 'cloture'] as const).map(t => lignes.filter(l => l.type === t).length > 0 && (
                          <div key={t}>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Soldes à l'{t === 'ouverture' ? 'ouverture' : 'clôture'}</p>
                            {lignes.filter(l => l.type === t).map(l => <div key={l.caisseNom + t} className="flex justify-between text-sm py-0.5"><span className="text-gray-600">{l.caisseNom}</span><span className="font-medium">{l.solde.toLocaleString('fr-FR')}</span></div>)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {exercices.length === 0 && <p className="text-sm text-gray-500">Aucun exercice</p>}
            </div>
          </div>

          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-sable">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Clôturer l'exercice en cours</h4>
                {exerciceEnCours ? (
                  <>
                    <p className="text-sm text-gray-600 mb-4">Un contrôle vérifie que tout est en ordre, puis les soldes de toutes les caisses sont figés. Aucun mouvement ne pourra plus être daté dans cet exercice.</p>
                    <button onClick={() => demarrerCloture(exerciceEnCours)} className="px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700">Clôturer {exerciceEnCours.annee}</button>
                  </>
                ) : <p className="text-sm text-gray-500">Aucun exercice ouvert.</p>}
                {!exerciceEnCours && dernierCloture && (
                  <button onClick={() => { setReouvertureCible(dernierCloture); setMotif(''); setMotDePasse(''); setErreurModal(null); }} className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200"><RotateCcw size={16} /> Rouvrir l'exercice {dernierCloture.annee} (exceptionnel)</button>
                )}
              </div>
              <div className="bg-white rounded-2xl p-6 border border-sable">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-indigo-500" /> Ouvrir un nouvel exercice</h4>
                {exerciceEnCours ? <p className="text-sm text-gray-500">L'exercice {exerciceEnCours.annee} est ouvert : clôturez-le avant d'en ouvrir un autre.</p> : (
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                      <input type="number" value={nouvelleAnnee} onChange={e => setNouvelleAnnee(parseInt(e.target.value))} className={inputClass} />
                    </div>
                    <button onClick={ouvrir} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">Ouvrir</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rôles */}
      {onglet === 'roles' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-sable">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Rôles des membres</h3>
            <p className="text-xs text-gray-500 mb-4">Une seule personne active peut être présidente, secrétaire ou trésorière. Le dernier compte administrateur est protégé.</p>
            <div className="space-y-2">
              {users.filter(u => u.actif).map(u => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-800">{u.prenom} {u.nom}</span>
                  <select value={u.role} onChange={e => changerLeRole(u.id, e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                    {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-sable">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Droits par rôle</h3>
            <div className="space-y-3">
              {Object.entries(rolePermissions).map(([role, perms]) => (
                <div key={role} className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center"><Lock size={16} className="text-indigo-600" /></div>
                    <div><h4 className="font-bold text-gray-800">{roleLabels[role]}</h4><p className="text-xs text-gray-500">{users.filter(u => u.role === role && u.actif).length} membre(s)</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">{perms.map(p => <span key={p} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-lg">{p}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Journal */}
      {onglet === 'journal' && peutVoirJournal && (
        <div className="bg-white rounded-2xl border border-sable overflow-hidden">
          <div className="p-6 pb-3"><h3 className="text-lg font-bold text-gray-800">Journal des actions sensibles</h3></div>
          {journal.length === 0 && <p className="px-6 pb-6 text-sm text-gray-500">Aucune action enregistrée</p>}
          {journal.map(j => (
            <div key={j.id} className="px-6 py-3 border-t border-gray-50">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">{actionLabels[j.action] || j.action}</p>
                <p className="text-xs text-gray-500">{new Date(j.date).toLocaleString('fr-FR')} · {nomMembre(j.userId)}</p>
              </div>
              <p className="text-xs text-gray-600 break-words">{detailsJournal(j)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Assistant de clôture */}
      {clotureCible && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">Clôture de l'exercice {clotureCible.annee}</h3><button onClick={() => setClotureCible(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>

            {!controle && !erreurModal && <p className="text-sm text-gray-500">Contrôle en cours...</p>}
            {controle && (
              <div className="space-y-3 mb-5">
                {controle.bloquants.length === 0 && <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3"><Check size={16} /> Aucun point bloquant</p>}
                {controle.bloquants.map(b => <p key={b.code} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-xl p-3"><ShieldAlert size={16} className="mt-0.5 flex-shrink-0" /> {b.message}</p>)}
                {controle.avertissements.map(a => <p key={a.code} className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-xl p-3"><AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {a.message}</p>)}
              </div>
            )}

            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Pour confirmer, tapez <b>{attendu}</b></label><input value={confirmation} onChange={e => setConfirmation(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Votre mot de passe</label><input type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} className={inputClass} autoComplete="current-password" /></div>
              {erreurModal && <p className="text-sm text-red-600">{erreurModal}</p>}
              <button disabled={clotureBloquee || enCours || !confirmation || !motDePasse} onClick={validerCloture} className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed">{enCours ? 'Clôture en cours...' : 'Clôturer définitivement'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Réouverture exceptionnelle */}
      {reouvertureCible && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">Rouvrir l'exercice {reouvertureCible.annee}</h3><button onClick={() => setReouvertureCible(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3 mb-4">Opération exceptionnelle, enregistrée dans le journal. Elle n'est possible que tant qu'aucun exercice plus récent n'est ouvert.</p>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Motif (10 caractères minimum)</label><textarea value={motif} onChange={e => setMotif(e.target.value)} rows={3} className={`${inputClass} resize-none`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Votre mot de passe</label><input type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} className={inputClass} autoComplete="current-password" /></div>
              {erreurModal && <p className="text-sm text-red-600">{erreurModal}</p>}
              <button disabled={enCours || motif.trim().length < 10 || !motDePasse} onClick={validerReouverture} className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-40">Rouvrir l'exercice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
