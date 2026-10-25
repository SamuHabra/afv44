import { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import CountUp from '../components/CountUp';
import { KenteBand, SunDisc, ArchImage } from '../components/Motifs';
import { Users, Wallet, CreditCard, Calendar, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TYPES_ENTREE = ['cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet'];
const TYPES_SORTIE = ['depense', 'distribution', 'pret'];
const COULEUR_ENTREES = '#F2A32B';
const COULEUR_SORTIES = '#17120E';

const REUNIONS_PAR_AN = 12;

const compact = (v: number) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace('.0', '')} M` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)} k` : `${v}`);

export default function Dashboard() {
  const { currentUser, users, caisses, mouvements, prets, reunions, tontines, parametres, exercices } = useApp();

  const membresActifs = users.filter(u => u.actif).length;
  const patrimoineTotal = caisses.reduce((sum, c) => sum + c.solde, 0);
  const pretsEnCours = prets.filter(p => p.statut === 'en_cours' || p.statut === 'approuve');
  const montantPrets = pretsEnCours.reduce((sum, p) => sum + p.montantRestant, 0);
  const prochaineReunion = reunions.filter(r => r.statut === 'planifiee' || r.statut === 'en_cours').sort((a, b) => a.date.localeCompare(b.date))[0];
  const tontineEnCours = tontines.find(t => t.statut === 'en_cours');

  const mvtValides = mouvements.filter(m => m.statut === 'valide');
  const totalEntrees = mvtValides.filter(m => ['cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet'].includes(m.type)).reduce((sum, m) => sum + m.montant, 0);
  const totalSorties = mvtValides.filter(m => ['depense', 'distribution', 'pret'].includes(m.type)).reduce((sum, m) => sum + m.montant, 0);

  // Progression de l'année : 12 réunions, une case chacune, dans l'ordre des dates
  const exerciceOuvert = exercices.find(e => e.statut === 'ouvert');
  const reunionsAnnee = reunions
    .filter(r => r.statut !== 'annulee' && (!exerciceOuvert || r.exerciceId === exerciceOuvert.id))
    .sort((a, b) => a.date.localeCompare(b.date));
  const cases = Array.from({ length: REUNIONS_PAR_AN }, (_, i) => reunionsAnnee[i]);
  const reunionsTenues = reunionsAnnee.filter(r => r.statut === 'terminee').length;
  const reunionsPlanifiees = reunionsAnnee.filter(r => r.statut === 'planifiee' || r.statut === 'en_cours').length;
  const progressionAnnee = Math.min(100, Math.round((reunionsTenues / REUNIONS_PAR_AN) * 100));
  const cotisationsCumulees = reunionsAnnee.filter(r => r.statut === 'terminee').reduce((n, r) => n + (r.totalCotisations || 0), 0);
  const prochaineCase = cases.findIndex(r => r && r.statut !== 'terminee');

  const [periode, setPeriode] = useState<6 | 12>(6);

  // Flux réels des mouvements validés, regroupés par mois
  const moisData = (() => {
    const mois: { cle: string; mois: string; entrees: number; sorties: number }[] = [];
    const now = new Date();
    for (let i = periode - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      mois.push({ cle, mois: label.charAt(0).toUpperCase() + label.slice(1), entrees: 0, sorties: 0 });
    }
    mvtValides.forEach(m => {
      const ligne = mois.find(x => m.date?.startsWith(x.cle));
      if (!ligne) return;
      if (TYPES_ENTREE.includes(m.type)) ligne.entrees += m.montant;
      else if (TYPES_SORTIE.includes(m.type)) ligne.sorties += m.montant;
    });
    return mois;
  })();
  const periodeEntrees = moisData.reduce((n, m) => n + m.entrees, 0);
  const periodeSorties = moisData.reduce((n, m) => n + m.sorties, 0);
  const periodeNet = periodeEntrees - periodeSorties;
  const periodeVide = periodeEntrees === 0 && periodeSorties === 0;

  const caissesData = caisses.map(c => ({ name: c.nom, value: c.solde }));
  const COLORS = ['#F2A32B', '#E2702E', '#A5410E', '#17120E', '#BFA98A', '#8A7560'];

  const recentMvt = [...mouvements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const formatMontant = (n: number) => n.toLocaleString('fr-FR') + ' ' + parametres.devise;

  const typeLabels: Record<string, string> = {
    cotisation: 'Cotisation', epargne: 'Épargne', depense: 'Dépense', penalite: 'Pénalité',
    don: 'Don', remboursement: 'Remboursement', pret: 'Prêt', distribution: 'Distribution', interet: 'Intérêt'
  };

  return (
    <div className="space-y-6">
      <section className="zoom zoom-lg relative overflow-hidden rounded-3xl bg-safran text-encre">
        <SunDisc className="-bottom-24 right-40 w-72 h-72 !bg-soleil/40" />
        <div className="relative flex items-end justify-between gap-6 px-6 pt-8 lg:px-10 lg:pt-10">
          <div className="pb-8 lg:pb-10 max-w-xl">
            <p className="text-sm font-bold uppercase tracking-widest mb-2">Tableau de bord</p>
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-2">Bonjour {currentUser?.prenom}</h2>
            <p className="text-base">
              {prochaineReunion
                ? <>Prochaine réunion : <strong>{prochaineReunion.titre}</strong>, le {new Date(prochaineReunion.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.</>
                : "Aucune réunion planifiée pour l'instant."}
            </p>
          </div>
          <ArchImage className="hidden sm:block w-40 h-48 lg:w-48 lg:h-56 shrink-0 self-end" />
        </div>
        <KenteBand height={12} />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="zoom bg-white rounded-2xl p-6 border border-sable">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-safran/25 rounded-xl flex items-center justify-center"><Users className="text-terre" size={24} /></div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Actifs</span>
          </div>
          <p className="text-3xl font-bold text-gray-800"><CountUp value={membresActifs} /></p>
          <p className="text-sm text-gray-500 mt-1">Membres actifs</p>
        </div>
        <div className="zoom bg-white rounded-2xl p-6 border border-sable">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-safran/25 rounded-xl flex items-center justify-center"><Wallet className="text-terre" size={24} /></div>
            <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full"><TrendingUp size={12} className="mr-1" /> +12%</span>
          </div>
          <p className="text-2xl font-bold text-gray-800"><CountUp value={patrimoineTotal} format={formatMontant} /></p>
          <p className="text-sm text-gray-500 mt-1">Patrimoine total</p>
        </div>
        <div className="zoom bg-white rounded-2xl p-6 border border-sable">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-safran/25 rounded-xl flex items-center justify-center"><CreditCard className="text-terre" size={24} /></div>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">En cours</span>
          </div>
          <p className="text-2xl font-bold text-gray-800"><CountUp value={montantPrets} format={formatMontant} /></p>
          <p className="text-sm text-gray-500 mt-1">{pretsEnCours.length} prêt(s) actif(s)</p>
        </div>
        <div className="zoom bg-white rounded-2xl p-6 border border-sable">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-safran/25 rounded-xl flex items-center justify-center"><Calendar className="text-terre" size={24} /></div>
          </div>
          {prochaineReunion ? (
            <>
              <p className="text-lg font-bold text-gray-800">{new Date(prochaineReunion.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
              <p className="text-sm text-gray-500 mt-1 truncate">{prochaineReunion.titre}</p>
            </>
          ) : (
            <><p className="text-lg font-bold text-gray-800">Aucune</p><p className="text-sm text-gray-500 mt-1">Prochaine réunion</p></>
          )}
        </div>
      </div>

      <section className="zoom zoom-lg bg-white rounded-2xl p-6 border border-sable" aria-labelledby="titre-progression">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h3 id="titre-progression" className="text-xl font-bold text-encre">Progression de l'année{exerciceOuvert ? ` ${exerciceOuvert.annee}` : ''}</h3>
            <p className="text-sm text-gray-500">{reunionsTenues} réunion{reunionsTenues > 1 ? 's' : ''} tenue{reunionsTenues > 1 ? 's' : ''} sur {REUNIONS_PAR_AN}{reunionsPlanifiees > 0 ? ` • ${reunionsPlanifiees} à venir` : ''}</p>
          </div>
          <p className="text-3xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{progressionAnnee}<span className="text-lg">%</span></p>
        </div>

        <div role="progressbar" aria-valuemin={0} aria-valuemax={REUNIONS_PAR_AN} aria-valuenow={reunionsTenues} aria-label="Réunions tenues dans l'année" className="w-full bg-creme border border-sable rounded-full h-3 overflow-hidden">
          <div className="barre-pousse bg-safran h-full rounded-full" style={{ width: `${progressionAnnee}%` }} />
        </div>

        <ol className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 mt-5">
          {cases.map((r, i) => {
            const tenue = r?.statut === 'terminee';
            const enCours = r?.statut === 'en_cours';
            const prochaine = i === prochaineCase;
            const etat = tenue ? 'tenue' : enCours ? 'en cours' : r ? 'planifiée' : 'à planifier';
            const mois = r ? new Date(r.date).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '';
            return (
              <li key={i} title={r ? `${r.titre} • ${new Date(r.date).toLocaleDateString('fr-FR')}` : `Réunion ${i + 1} à planifier`}
                aria-label={`Réunion ${i + 1} : ${etat}`}
                className={`rounded-xl border-2 p-2 text-center transition ${tenue ? 'bg-safran border-safran text-encre' : prochaine || enCours ? 'bg-white border-encre text-encre' : r ? 'bg-creme border-sable text-encre' : 'bg-transparent border-dashed border-sable text-gray-400'}`}>
                <div className="text-xs font-bold">N°{i + 1}</div>
                <div className="h-6 flex items-center justify-center">
                  {tenue ? <Check size={18} strokeWidth={3} /> : <span className="text-xs capitalize">{mois || '·'}</span>}
                </div>
                <div className="text-[10px] leading-tight">{tenue ? 'Tenue' : enCours ? 'En cours' : prochaine ? 'Prochaine' : r ? 'Planifiée' : 'À planifier'}</div>
              </li>
            );
          })}
        </ol>

        <p className="text-sm text-gray-600 mt-4">
          Cotisations recueillies en réunion : <strong className="text-encre">{formatMontant(cotisationsCumulees)}</strong>
          {reunionsAnnee.length > REUNIONS_PAR_AN && <span className="text-terre"> • {reunionsAnnee.length - REUNIONS_PAR_AN} réunion(s) au-delà des {REUNIONS_PAR_AN} prévues</span>}
        </p>
      </section>

      {tontineEnCours && (
        <div className="zoom bg-encre rounded-2xl p-6 text-creme">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Tontine en cours</p>
              <h3 className="text-xl font-bold">{tontineEnCours.nom}</h3>
              <p className="text-sm opacity-80 mt-1">Cycle {tontineEnCours.cycleActuel} • Rang suivant : {tontineEnCours.rangs.find(r => r.statut === 'en_attente')?.rang || 'Terminé'}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatMontant(tontineEnCours.montantParRang)}</p>
              <p className="text-sm opacity-80">par rang</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="zoom zoom-lg lg:col-span-2 bg-white rounded-2xl p-6 border border-sable" aria-labelledby="titre-flux">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h3 id="titre-flux" className="text-xl font-bold text-encre">Mouvements financiers</h3>
              <p className="text-sm text-gray-500">Entrées et sorties validées, mois par mois</p>
            </div>
            <div role="group" aria-label="Période" className="inline-flex rounded-full bg-creme border border-sable p-1">
              {([6, 12] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setPeriode(n)}
                  aria-pressed={periode === n}
                  className={`px-4 h-9 rounded-full text-sm font-bold transition ${periode === n ? 'bg-encre text-creme' : 'text-gray-600 hover:text-encre'}`}
                >
                  {n} mois
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl bg-safran/20 p-3">
              <p className="flex items-center gap-1.5 text-xs text-gray-700"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COULEUR_ENTREES }} />Entrées</p>
              <p className="text-lg font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{compact(periodeEntrees)} <span className="text-xs font-normal">{parametres.devise}</span></p>
            </div>
            <div className="rounded-xl bg-encre/10 p-3">
              <p className="flex items-center gap-1.5 text-xs text-gray-700"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COULEUR_SORTIES }} />Sorties</p>
              <p className="text-lg font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{compact(periodeSorties)} <span className="text-xs font-normal">{parametres.devise}</span></p>
            </div>
            <div className="rounded-xl bg-creme border border-sable p-3">
              <p className="text-xs text-gray-700">Solde net</p>
              <p className={`text-lg font-bold ${periodeNet >= 0 ? 'text-green-700' : 'text-terre'}`} style={{ fontFamily: 'var(--font-display)' }}>{periodeNet >= 0 ? '+' : '−'}{compact(Math.abs(periodeNet))} <span className="text-xs font-normal">{parametres.devise}</span></p>
            </div>
          </div>

          {periodeVide ? (
            <div className="h-[260px] flex items-center justify-center rounded-xl border-2 border-dashed border-sable text-sm text-gray-500">
              Aucun mouvement validé sur cette période
            </div>
          ) : (
            <div role="img" aria-label={`Entrées et sorties sur ${periode} mois : ${compact(periodeEntrees)} d'entrées, ${compact(periodeSorties)} de sorties`}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={moisData} barGap={4} barCategoryGap="22%" margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E4D6BE" strokeDasharray="4 4" />
                  <XAxis dataKey="mois" tickLine={false} axisLine={{ stroke: '#D9C7AA' }} tick={{ fontSize: 12, fill: '#5E5246' }} />
                  <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 12, fill: '#5E5246' }} tickFormatter={compact} />
                  <Tooltip
                    cursor={{ fill: 'rgba(242,163,43,0.12)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const e = Number(payload.find(p => p.dataKey === 'entrees')?.value ?? 0);
                      const so = Number(payload.find(p => p.dataKey === 'sorties')?.value ?? 0);
                      return (
                        <div className="bg-encre text-creme rounded-xl px-4 py-3 text-sm shadow-lg">
                          <p className="font-bold mb-1.5">{label}</p>
                          <p className="flex justify-between gap-6"><span className="text-safran">Entrées</span><span className="font-bold">{formatMontant(e)}</span></p>
                          <p className="flex justify-between gap-6"><span className="text-sable">Sorties</span><span className="font-bold">{formatMontant(so)}</span></p>
                          <p className="flex justify-between gap-6 mt-1.5 pt-1.5 border-t border-white/20"><span>Net</span><span className="font-bold">{e - so >= 0 ? '+' : '−'}{formatMontant(Math.abs(e - so))}</span></p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="entrees" fill={COULEUR_ENTREES} radius={[6, 6, 0, 0]} name="Entrées" maxBarSize={28} />
                  <Bar dataKey="sorties" fill={COULEUR_SORTIES} radius={[6, 6, 0, 0]} name="Sorties" maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <div className="zoom bg-white rounded-2xl p-6 border border-sable">
          <h3 className="text-xl font-bold text-encre mb-4">Répartition des caisses</h3>
          <div className="relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-500">Total</span>
            <span className="text-lg font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{compact(patrimoineTotal)}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={caissesData} cx="50%" cy="50%" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none" dataKey="value">
                {caissesData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip formatter={(value: number) => formatMontant(value)} />
            </PieChart>
          </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {caisses.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600">{c.nom}</span>
                </div>
                <span className="font-medium text-gray-800">{formatMontant(c.solde)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="zoom bg-white rounded-2xl p-6 border border-sable">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Derniers mouvements</h3>
          <div className="space-y-3">
            {recentMvt.map(mvt => {
              const isCredit = ['cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet'].includes(mvt.type);
              return (
                <div key={mvt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                      {isCredit ? <ArrowUpRight size={16} className="text-green-600" /> : <ArrowDownRight size={16} className="text-red-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{typeLabels[mvt.type]}</p>
                      <p className="text-xs text-gray-500">{new Date(mvt.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>{isCredit ? '+' : '-'}{formatMontant(mvt.montant)}</p>
                    {mvt.statut === 'en_attente' && <span className="text-xs text-amber-600">En attente</span>}
                    {mvt.statut === 'rejete' && <span className="text-xs text-red-600">Rejeté</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="zoom bg-white rounded-2xl p-6 border border-sable">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Prêts en cours</h3>
          <div className="space-y-3">
            {pretsEnCours.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun prêt en cours</p>
            ) : pretsEnCours.map(pret => {
              const membre = users.find(u => u.id === pret.membreId);
              const progress = ((pret.montant - pret.montantRestant) / pret.montant) * 100;
              return (
                <div key={pret.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{membre?.prenom} {membre?.nom}</p>
                      <p className="text-xs text-gray-500">{pret.motif}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800">{formatMontant(pret.montantRestant)}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="barre-pousse bg-soleil h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{progress.toFixed(0)}% remboursé • Intérêts: {formatMontant(pret.interetsGeneres)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
