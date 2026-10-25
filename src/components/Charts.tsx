import { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const PALETTE = ['#F2A32B', '#E2702E', '#A5410E', '#17120E', '#BFA98A', '#8A7560', '#6E5B48'];
const ENTREES = '#F2A32B';
const SORTIES = '#17120E';

export const compact = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace('.0', '')} M` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)} k` : `${Math.round(v)}`;

/** "2026-01" devient "Janv", les autres libellés sont gardés tels quels. */
export function libelleMois(m: string) {
  const r = /^(\d{4})-(\d{2})/.exec(m);
  if (!r) return m;
  const l = new Date(Number(r[1]), Number(r[2]) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export function CarteGraphique({ titre, sousTitre, children, className = '' }: { titre: string; sousTitre?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`zoom zoom-lg bg-white rounded-2xl p-6 border border-sable ${className}`}>
      <h3 className="text-xl font-bold text-encre">{titre}</h3>
      {sousTitre && <p className="text-sm text-gray-500 mb-4">{sousTitre}</p>}
      {!sousTitre && <div className="mb-4" />}
      {children}
    </section>
  );
}

const axe = { fontSize: 12, fill: '#5E5246' };

function Bulle({ titre, lignes }: { titre: string; lignes: { nom: string; valeur: string; couleur?: string }[] }) {
  return (
    <div className="bg-encre text-creme rounded-xl px-4 py-3 text-sm shadow-lg">
      <p className="font-bold mb-1.5">{titre}</p>
      {lignes.map(l => (
        <p key={l.nom} className="flex justify-between gap-6">
          <span style={{ color: l.couleur }}>{l.nom}</span><span className="font-bold">{l.valeur}</span>
        </p>
      ))}
    </div>
  );
}

/** Évolution du solde : courbe douce sur aire dégradée. */
export function GraphSolde({ data, formatMontant }: { data: { mois: string; solde_fin: number }[]; formatMontant: (n: number) => string }) {
  const points = data.map(d => ({ ...d, libelle: libelleMois(d.mois) }));
  return (
    <div role="img" aria-label="Évolution du solde mois par mois">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="degradeSolde" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2A32B" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#F2A32B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#E4D6BE" strokeDasharray="4 4" />
          <XAxis dataKey="libelle" tickLine={false} axisLine={{ stroke: '#D9C7AA' }} tick={axe} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={axe} tickFormatter={compact} />
          <Tooltip
            cursor={{ stroke: '#17120E', strokeDasharray: '3 3' }}
            content={({ active, payload, label }) => active && payload?.length
              ? <Bulle titre={String(label)} lignes={[{ nom: 'Solde', valeur: formatMontant(Number(payload[0].value)), couleur: '#F2A32B' }]} />
              : null}
          />
          <Area type="monotone" dataKey="solde_fin" stroke="#A5410E" strokeWidth={3} fill="url(#degradeSolde)" dot={{ r: 4, fill: '#FBF6EC', stroke: '#A5410E', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#A5410E' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Entrées et sorties par mois, avec légende et totaux. */
export function GraphFlux({ data, formatMontant }: { data: { mois: string; entrees: number; sorties: number }[]; formatMontant: (n: number) => string }) {
  const points = data.map(d => ({ ...d, libelle: libelleMois(d.mois) }));
  const e = data.reduce((n, d) => n + d.entrees, 0);
  const s = data.reduce((n, d) => n + d.sorties, 0);
  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 text-sm">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: ENTREES }} />Entrées <strong className="text-encre">{compact(e)}</strong></span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: SORTIES }} />Sorties <strong className="text-encre">{compact(s)}</strong></span>
      </div>
      <div role="img" aria-label={`Entrées et sorties par mois : ${compact(e)} d'entrées, ${compact(s)} de sorties`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={points} barGap={4} barCategoryGap="22%" margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E4D6BE" strokeDasharray="4 4" />
            <XAxis dataKey="libelle" tickLine={false} axisLine={{ stroke: '#D9C7AA' }} tick={axe} />
            <YAxis tickLine={false} axisLine={false} width={48} tick={axe} tickFormatter={compact} />
            <Tooltip
              cursor={{ fill: 'rgba(242,163,43,0.12)' }}
              content={({ active, payload, label }) => active && payload?.length
                ? <Bulle titre={String(label)} lignes={[
                    { nom: 'Entrées', valeur: formatMontant(Number(payload.find(p => p.dataKey === 'entrees')?.value ?? 0)), couleur: '#F2A32B' },
                    { nom: 'Sorties', valeur: formatMontant(Number(payload.find(p => p.dataKey === 'sorties')?.value ?? 0)), couleur: '#D9C7AA' },
                  ]} />
                : null}
            />
            <Bar dataKey="entrees" fill={ENTREES} radius={[6, 6, 0, 0]} maxBarSize={26} />
            <Bar dataKey="sorties" fill={SORTIES} radius={[6, 6, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Répartition : anneau avec total au centre, et classement avec barres et pourcentages. */
export function GraphRepartition({ data, formatMontant }: { data: { name: string; value: number }[]; formatMontant: (n: number) => string }) {
  const total = data.reduce((n, d) => n + d.value, 0);
  const trie = [...data].sort((a, b) => b.value - a.value);
  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center">
      <div className="relative" role="img" aria-label={`Répartition de ${compact(total)} entre ${data.length} catégories`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-2xl font-bold text-encre" style={{ fontFamily: 'var(--font-display)' }}>{compact(total)}</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={trie} dataKey="value" nameKey="name" innerRadius={74} outerRadius={108} paddingAngle={2} stroke="none">
              {trie.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.length
              ? <Bulle titre={String(payload[0].name)} lignes={[{ nom: `${((Number(payload[0].value) / total) * 100).toFixed(0)} %`, valeur: formatMontant(Number(payload[0].value)) }]} />
              : null} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-3">
        {trie.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <li key={d.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                <span className="flex items-center gap-2 text-encre font-medium min-w-0">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="text-gray-600 whitespace-nowrap"><strong className="text-encre">{formatMontant(d.value)}</strong> · {pct.toFixed(0)} %</span>
              </div>
              <div className="h-2 rounded-full bg-creme overflow-hidden">
                <div className="barre-pousse h-full rounded-full" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
