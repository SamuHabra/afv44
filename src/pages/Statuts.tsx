import { useMemo, useState } from 'react';
import { Search, Printer, ScrollText } from 'lucide-react';
import { KenteBand, SunDisc } from '../components/Motifs';
import { STATUTS, STATUTS_NOM, STATUTS_SIGLE, STATUTS_ADOPTION } from '../data/statuts';

// Page en lecture seule, accessible à toutes les membres
export default function Statuts() {
  const [recherche, setRecherche] = useState('');

  const titres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return STATUTS;
    return STATUTS
      .map(t => ({
        ...t,
        articles: t.articles.filter(a =>
          `art. ${a.numero} ${a.titre} ${a.texte}`.toLowerCase().includes(q)
        ),
      }))
      .filter(t => t.articles.length > 0);
  }, [recherche]);

  const nbResultats = titres.reduce((n, t) => n + t.articles.length, 0);

  const allerA = (id: string) => document.getElementById(`titre-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <section className="relative overflow-hidden bg-encre text-creme rounded-3xl">
        <SunDisc className="-top-20 -right-12 w-64 h-64" />
        <div className="relative px-6 py-8 lg:px-10">
          <ScrollText className="text-safran mb-3" size={28} />
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">Statuts de l'association</h1>
          <p className="text-safran font-bold mt-1">{STATUTS_NOM} ({STATUTS_SIGLE})</p>
          <p className="text-sm text-sable mt-2">{STATUTS_ADOPTION}</p>
        </div>
        <KenteBand height={10} />
      </section>

      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <label htmlFor="recherche-statuts" className="sr-only">Rechercher dans les statuts</label>
          <input
            id="recherche-statuts"
            type="search"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher un mot : amende, prêt, décès…"
            className="w-full h-12 pl-11 pr-4 bg-white border-2 border-sable rounded-xl focus:border-safran outline-none"
          />
        </div>
        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-5 h-12 bg-encre text-creme rounded-xl font-bold hover:bg-gray-800">
          <Printer size={18} /> Imprimer
        </button>
      </div>

      {!recherche && (
        <nav aria-label="Sommaire" className="flex flex-wrap gap-2 print:hidden">
          {STATUTS.map(t => (
            <button key={t.id} onClick={() => allerA(t.id)} className="px-4 h-10 rounded-full bg-white border border-sable text-sm font-medium text-encre hover:border-encre">
              Titre {t.id} · {t.libelle}
            </button>
          ))}
        </nav>
      )}

      {recherche && (
        <p className="text-sm text-gray-600" role="status">{nbResultats} article(s) trouvé(s)</p>
      )}

      {titres.map(t => (
        <section key={t.id} id={`titre-${t.id}`} className="scroll-mt-24">
          <h2 className="flex items-center gap-3 text-xl font-bold text-encre mb-3">
            <span className="px-3 py-1 rounded-lg bg-safran text-encre text-sm">Titre {t.id}</span>
            {t.libelle}
          </h2>
          <div className="space-y-3">
            {t.articles.map(a => (
              <article key={a.numero} className="bg-white border border-sable rounded-2xl p-5 break-inside-avoid">
                <h3 className="text-base font-bold text-encre mb-2">
                  <span className="text-terre">Art. {a.numero}</span> — {a.titre}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{a.texte}</p>
              </article>
            ))}
          </div>
        </section>
      ))}

      {titres.length === 0 && (
        <div className="text-center py-12 text-gray-600 bg-white rounded-2xl border border-sable">
          <p>Aucun article ne correspond à « {recherche} ».</p>
        </div>
      )}
    </div>
  );
}
