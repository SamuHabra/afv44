import { Skeleton } from '../components/Skeleton';
import { KenteBand, SunDisc, ArchImage } from '../components/Motifs';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, Percent, PiggyBank, FileText, Pencil, X, AlertTriangle, Info, Lock } from 'lucide-react';
import { DistributionInterets, SituationMembre } from '../types';
import { ouvrirReleve } from '../lib/releve';

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500';
const roleLabels: Record<string, string> = { admin: 'Administratrice', presidente: 'Présidente', secretaire: 'Secrétaire', tresoriere: 'Trésorière', commissaire: 'Commissaire aux comptes', animatrice: 'Animatrice', conseillere: 'Conseillère', membre: 'Membre' };

export default function MySpace({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const {
    currentUser, mouvements, reunions, tontines, caisses, parametres, getDistributionsInterets, getSituationMembre,
    getRappels, modifierMonProfil, changerMonMotDePasse
  } = useApp();

  const [interetsRecus, setInteretsRecus] = useState<DistributionInterets[]>([]);
  const [situation, setSituation] = useState<SituationMembre | undefined>();
  const [erreurSituation, setErreurSituation] = useState<string | undefined>();
  const [chargement, setChargement] = useState(true);
  const [showProfil, setShowProfil] = useState(false);
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [messageProfil, setMessageProfil] = useState<{ ok: boolean; texte: string } | null>(null);
  const [messageMdp, setMessageMdp] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(async () => {
    const res = await getSituationMembre();
    setSituation(res.situation);
    setErreurSituation(res.erreur);
    setChargement(false);
  }, [getSituationMembre]);

  // La situation est recalculée quand les mouvements ou les prêts changent
  useEffect(() => {
    charger();
    getDistributionsInterets().then(liste => setInteretsRecus(liste.filter(d => d.statut === 'executee')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, mouvements.length]);

  if (!currentUser) return null;

  const formatMontant = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' ' + parametres.devise;
  const nomCaisse = (id: string) => caisses.find(c => c.id === id)?.nom || '—';

  const mesMouvements = mouvements.filter(m => m.membreId === currentUser.id && m.statut === 'valide').sort((a, b) => b.date.localeCompare(a.date));
  const mesReunions = reunions.filter(r => r.presences.some(p => p.membreId === currentUser.id)).sort((a, b) => b.date.localeCompare(a.date));
  const rappels = getRappels();

  const obligatoires = (situation?.caisses || []).filter(c => (c.montant_annuel ?? 0) > 0);
  const totalDu = obligatoires.reduce((s, c) => s + (c.montant_annuel || 0), 0);
  const totalVerse = obligatoires.reduce((s, c) => s + Math.min(c.verse_exercice, c.montant_annuel || 0), 0);
  const totalReste = obligatoires.reduce((s, c) => s + (c.reste_a_payer || 0), 0);
  const epargne = (situation?.caisses || []).filter(c => c.type === 'epargne' || c.type === 'scolaire').reduce((s, c) => s + c.solde_membre, 0);
  const tauxPresence = situation && situation.presence.reunions > 0 ? Math.round((situation.presence.presences / situation.presence.reunions) * 100) : null;

  const mesTontines = tontines
    .filter(t => (t.statut === 'en_cours' || t.statut === 'inscriptions' || t.statut === 'planifiee') && (t.participants || []).some(p => p.membreId === currentUser.id))
    .map(t => {
      const mesTours = (t.tours || []).filter(tr => tr.membreId === currentUser.id);
      const prochainTour = mesTours.find(tr => tr.statut !== 'verse');
      const tourCourant = (t.tours || []).find(tr => tr.statut === 'en_cours');
      const maMise = tourCourant?.cotisations.find(c => c.membreId === currentUser.id);
      return { t, prochainTour, tourCourant, maMise, nbTours: mesTours.length };
    });

  const ouvrirProfil = () => {
    setTelephone(currentUser.telephone);
    setEmail(currentUser.email || '');
    setAncienMdp(''); setNouveauMdp(''); setConfirmMdp('');
    setMessageProfil(null); setMessageMdp(null);
    setShowProfil(true);
  };

  const enregistrerProfil = async () => {
    const res = await modifierMonProfil(telephone, email);
    setMessageProfil(res.ok ? { ok: true, texte: 'Profil mis à jour' } : { ok: false, texte: res.error || 'Erreur' });
  };

  const enregistrerMdp = async () => {
    if (nouveauMdp !== confirmMdp) {
      setMessageMdp({ ok: false, texte: 'La confirmation ne correspond pas' });
      return;
    }
    const res = await changerMonMotDePasse(ancienMdp, nouveauMdp);
    setMessageMdp(res.ok ? { ok: true, texte: 'Mot de passe modifié' } : { ok: false, texte: res.error || 'Erreur' });
    if (res.ok) { setAncienMdp(''); setNouveauMdp(''); setConfirmMdp(''); }
  };

  const imprimerReleve = () => {
    if (!situation) return;
    ouvrirReleve({ membre: currentUser, situation, mouvements, devise: parametres.devise, getNomCaisse: nomCaisse });
  };

  return (
    <div className="space-y-6">
      {/* Profil */}
      <section className="relative overflow-hidden bg-encre text-creme rounded-3xl">
        <SunDisc className="-top-20 -right-16 w-64 h-64" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 px-6 pt-6 lg:px-8 lg:pt-8">
          <div className="flex items-center gap-4 pb-6 lg:pb-8">
            <div className="w-16 h-16 bg-safran text-encre rounded-full flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{currentUser.prenom[0]}{currentUser.nom[0]}</span>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">{currentUser.prenom} {currentUser.nom}</h2>
              <p className="text-sable">{roleLabels[currentUser.role]} • {currentUser.telephone}</p>
              {currentUser.email && <p className="text-sable text-sm">{currentUser.email}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={imprimerReleve} disabled={!situation} className="flex items-center gap-2 px-4 h-11 bg-safran text-encre hover:brightness-105 rounded-xl text-sm font-bold disabled:opacity-40"><FileText size={16} /> Mon relevé</button>
                <button onClick={ouvrirProfil} className="flex items-center gap-2 px-4 h-11 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold"><Pencil size={16} /> Mon profil</button>
              </div>
            </div>
          </div>
          <ArchImage className="hidden sm:block w-32 h-40 shrink-0" />
        </div>
        <KenteBand height={10} />
      </section>

      {/* Rappels */}
      {rappels.length > 0 && (
        <div className="space-y-2">
          {rappels.map(r => (
            <button key={r.id} onClick={() => onNavigate?.(r.page)} className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border ${r.niveau === 'alerte' ? 'bg-red-50 border-red-100' : 'bg-safran/15 border-safran/40'}`}>
              {r.niveau === 'alerte' ? <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" /> : <Info size={18} className="text-terre mt-0.5 flex-shrink-0" />}
              <div><p className={`text-sm font-semibold ${r.niveau === 'alerte' ? 'text-red-800' : 'text-encre'}`}>{r.titre}</p><p className="text-sm text-gray-700">{r.message}</p></div>
            </button>
          ))}
        </div>
      )}

      {/* Indicateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="zoom bg-white rounded-2xl p-4 border border-sable">
          <div className="flex items-center gap-2 mb-2"><Wallet size={18} className="text-terre" /><span className="text-sm text-gray-500">Cotisations de l'année</span></div>
          <p className="text-xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(totalVerse)} <span className="text-sm font-normal text-gray-400">/ {formatMontant(totalDu)}</span></p>
          <p className={`text-xs mt-1 ${totalReste > 0 ? 'text-red-600' : 'text-green-600'}`}>{totalReste > 0 ? `Reste à payer : ${formatMontant(totalReste)}` : 'À jour'}</p>
        </div>
        <div className="zoom bg-white rounded-2xl p-4 border border-sable">
          <div className="flex items-center gap-2 mb-2"><PiggyBank size={18} className="text-terre" /><span className="text-sm text-gray-500">Mon épargne</span></div>
          <p className="text-xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{formatMontant(epargne)}</p>
          <p className="text-xs mt-1 text-gray-500">Épargne + scolaire</p>
        </div>
        <div className="zoom bg-white rounded-2xl p-4 border border-sable">
          <div className="flex items-center gap-2 mb-2"><CreditCard size={18} className="text-terre" /><span className="text-sm text-gray-500">Prêt à rembourser</span></div>
          <p className="text-xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{situation && situation.total_pret_restant > 0 ? formatMontant(situation.total_pret_restant) : 'Aucun'}</p>
          {situation?.prets.some(p => p.en_retard) && <p className="text-xs mt-1 text-red-600">Échéance dépassée</p>}
        </div>
        <div className="zoom bg-white rounded-2xl p-4 border border-sable">
          <div className="flex items-center gap-2 mb-2"><Percent size={18} className="text-terre" /><span className="text-sm text-gray-500">Présence</span></div>
          <p className="text-xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{tauxPresence === null ? '—' : `${tauxPresence} %`}</p>
          <p className="text-xs mt-1 text-gray-500">{situation ? `${situation.presence.retards} retard(s) · amendes ${formatMontant(situation.amendes_exercice)}` : ''}</p>
        </div>
      </div>

      {/* Situation par caisse */}
      <div className="zoom zoom-lg bg-white rounded-2xl p-6 border border-sable">
        <h3 className="text-xl font-bold text-encre mb-4">Ma situation par caisse {situation?.exercice.annee ? <span className="text-sm font-normal text-gray-400">· exercice {situation.exercice.annee}</span> : null}</h3>
        {chargement ? <div role="status" className="space-y-3"><span className="sr-only">Chargement</span><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : !situation ? (
          <p className="text-sm text-red-600">Situation indisponible : {erreurSituation || 'erreur inconnue'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <th className="py-2 pr-3">Caisse</th><th className="py-2 pr-3 text-right">Obligation</th><th className="py-2 pr-3 text-right">Versé</th><th className="py-2 pr-3 text-right">Reste</th><th className="py-2 text-right">Mon solde</th>
                </tr>
              </thead>
              <tbody>
                {situation.caisses.map(c => (
                  <tr key={c.caisse_id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-800">
                      {c.nom}
                      {c.montant_annuel ? (
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-creme overflow-hidden" role="img" aria-label={`Versé à ${Math.min(100, Math.round((c.verse_exercice / c.montant_annuel) * 100))} %`}>
                          <div className="barre-pousse h-full rounded-full bg-soleil" style={{ width: `${Math.min(100, (c.verse_exercice / c.montant_annuel) * 100)}%` }} />
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-600">{c.montant_annuel ? formatMontant(c.montant_annuel) : '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-600">{formatMontant(c.verse_exercice)}</td>
                    <td className={`py-2 pr-3 text-right font-medium ${c.reste_a_payer ? 'text-red-600' : 'text-gray-400'}`}>{c.reste_a_payer == null ? '—' : formatMontant(c.reste_a_payer)}</td>
                    <td className="py-2 text-right font-semibold text-gray-800">{formatMontant(c.solde_membre)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mes prêts */}
      {situation && situation.prets.length > 0 && (
        <div className="zoom zoom-lg bg-white rounded-2xl p-6 border border-sable">
          <h3 className="text-xl font-bold text-encre mb-4">Mes prêts</h3>
          <div className="space-y-2">
            {situation.prets.map(p => (
              <div key={p.id} className={`flex flex-wrap justify-between gap-2 p-3 rounded-xl ${p.en_retard ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.motif}</p>
                  <p className="text-xs text-gray-500">{formatMontant(p.montant)} à {p.taux_interet} % · échéance {new Date(p.date_echeance).toLocaleDateString('fr-FR')}{p.en_retard ? ' (dépassée)' : ''}</p>
                </div>
                <p className="text-sm font-bold text-gray-800">Reste dû : {formatMontant(p.montant_restant)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mes tontines */}
        {mesTontines.length > 0 && (
          <div className="zoom zoom-lg bg-white rounded-2xl p-6 border border-sable">
            <h3 className="text-xl font-bold text-encre mb-4">Mes tontines</h3>
            <div className="space-y-3">
              {mesTontines.map(({ t, prochainTour, tourCourant, maMise, nbTours }) => (
                <div key={t.id} className="p-4 bg-indigo-50 rounded-xl">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-indigo-900">{t.nom}</p>
                      <p className="text-xs text-indigo-600">{formatMontant(t.montantParRang)} par part · {(t.participants || []).find(p => p.membreId === currentUser.id)?.nbParts} part(s)</p>
                    </div>
                    {prochainTour && <div className="text-right"><p className="text-xs text-indigo-600">Mon prochain tour</p><p className="font-bold text-indigo-800">#{prochainTour.numero} · {new Date(prochainTour.datePrevue).toLocaleDateString('fr-FR')}</p></div>}
                  </div>
                  {t.statut === 'en_cours' ? (
                    <div className="mt-3 pt-3 border-t border-indigo-200 text-sm text-indigo-700 space-y-1">
                      {prochainTour && <p>À recevoir : <span className="font-bold">{formatMontant(prochainTour.montantAttendu)}</span> ({nbTours} tour{nbTours > 1 ? 's' : ''} au total)</p>}
                      {tourCourant && maMise && <p>Ma mise du tour {tourCourant.numero} : <span className="font-bold">{formatMontant(maMise.montant)}</span> — {maMise.statut === 'paye' ? 'payée' : maMise.mouvementId ? 'en cours de validation' : maMise.statut === 'en_retard' ? 'en retard' : 'à payer'}</p>}
                    </div>
                  ) : (
                    <p className="mt-3 pt-3 border-t border-indigo-200 text-sm text-indigo-700">Inscriptions ouvertes — l'ordre de passage sera fixé au démarrage.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mes intérêts reçus */}
        {interetsRecus.some(d => d.lignes.some(l => l.membreId === currentUser.id)) && (
          <div className="zoom zoom-lg bg-white rounded-2xl p-6 border border-sable">
            <h3 className="text-xl font-bold text-encre mb-4">Mes intérêts reçus</h3>
            <div className="space-y-2">
              {interetsRecus.map(d => {
                const l = d.lignes.find(x => x.membreId === currentUser.id);
                if (!l) return null;
                return (
                  <div key={d.id} className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Distribution du {new Date(d.dateDistribution).toLocaleDateString('fr-FR')}</p>
                      <p className="text-xs text-gray-500">Solde moyen {formatMontant(l.soldeMoyen)} · {l.partPct.toFixed(2)} % de la répartition</p>
                    </div>
                    <span className="font-bold text-emerald-600">{formatMontant(l.montant)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mes réunions */}
        <div className="zoom zoom-lg bg-white rounded-2xl p-6 border border-sable">
          <h3 className="text-xl font-bold text-encre mb-4">Mes réunions</h3>
          <div className="space-y-2">
            {mesReunions.slice(0, 6).map(r => {
              const maPresence = r.presences.find(p => p.membreId === currentUser.id);
              const aVenir = r.statut === 'planifiee' || r.statut === 'en_cours';
              return (
                <div key={r.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{r.titre}</p>
                    <p className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString('fr-FR')} · {r.heure} · {r.lieu}</p>
                  </div>
                  {aVenir ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{r.statut === 'en_cours' ? 'En cours' : 'À venir'}</span>
                  ) : r.statut === 'terminee' ? (
                    <span className={`px-2 py-0.5 rounded text-xs ${maPresence?.present ? (maPresence.retard ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700') : 'bg-red-100 text-red-700'}`}>
                      {maPresence?.present ? (maPresence.retard ? 'En retard' : 'Présent(e)') : 'Absent(e)'}
                    </span>
                  ) : null}
                </div>
              );
            })}
            {mesReunions.length === 0 && <p className="text-sm text-gray-500">Aucune réunion</p>}
          </div>
        </div>
      </div>

      {/* Mes derniers mouvements */}
      <div className="zoom zoom-lg bg-white rounded-2xl p-6 border border-sable">
        <h3 className="text-xl font-bold text-encre mb-4">Mes derniers mouvements</h3>
        <div className="space-y-2">
          {mesMouvements.slice(0, 8).map(mvt => {
            const entree = mvt.categorie === 'entree';
            return (
              <div key={mvt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entree ? 'bg-green-100' : 'bg-red-100'}`}>
                    {entree ? <ArrowUpRight size={16} className="text-green-600" /> : <ArrowDownRight size={16} className="text-red-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{mvt.description}</p>
                    <p className="text-xs text-gray-500">{new Date(mvt.date).toLocaleDateString('fr-FR')} · {nomCaisse(mvt.caisseId)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${entree ? 'text-green-600' : 'text-red-600'}`}>{entree ? '+' : '-'}{formatMontant(mvt.montant)}</span>
              </div>
            );
          })}
          {mesMouvements.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Aucun mouvement</p>}
        </div>
      </div>

      {showProfil && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-gray-800">Mon profil</h3><button onClick={() => setShowProfil(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>

            <div className="space-y-3 mb-8">
              <p className="text-xs text-gray-500">Le nom et le rôle sont gérés par le bureau.</p>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} /></div>
              {messageProfil && <p className={`text-sm ${messageProfil.ok ? 'text-green-600' : 'text-red-600'}`}>{messageProfil.texte}</p>}
              <button onClick={enregistrerProfil} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">Enregistrer</button>
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-100">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2"><Lock size={16} /> Changer mon mot de passe</h4>
              <input type="password" value={ancienMdp} onChange={e => setAncienMdp(e.target.value)} className={inputClass} placeholder="Mot de passe actuel" autoComplete="current-password" />
              <input type="password" value={nouveauMdp} onChange={e => setNouveauMdp(e.target.value)} className={inputClass} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" />
              <input type="password" value={confirmMdp} onChange={e => setConfirmMdp(e.target.value)} className={inputClass} placeholder="Confirmer le nouveau mot de passe" autoComplete="new-password" />
              {messageMdp && <p className={`text-sm ${messageMdp.ok ? 'text-green-600' : 'text-red-600'}`}>{messageMdp.texte}</p>}
              <button disabled={!ancienMdp || !nouveauMdp} onClick={enregistrerMdp} className="w-full py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 disabled:opacity-40">Modifier le mot de passe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
