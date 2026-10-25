/** Bloc gris animé : l'animation est coupée si la personne demande moins de mouvement. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-xl bg-sable/50 skeleton-shimmer ${className}`} />;
}

export function SkeletonCard({ lignes = 3 }: { lignes?: number }) {
  return (
    <div aria-hidden="true" className="bg-white border border-sable rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      {Array.from({ length: lignes }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lignes - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Contenu de page en attente : bandeau + cartes. */
export function PageSkeleton({ cartes = 6 }: { cartes?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Chargement en cours</span>
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cartes }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

/** Écran de démarrage : menu + en-tête + page, pour éviter un écran blanc. */
export function AppSkeleton() {
  return (
    <div role="status" aria-live="polite" className="min-h-screen bg-creme flex">
      <span className="sr-only">Chargement de l'application</span>
      <aside aria-hidden="true" className="hidden lg:flex w-72 flex-col bg-encre p-6 gap-3">
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="w-14 h-14 rounded-full bg-safran/80 pulsation" />
          <div className="h-4 w-24 rounded bg-white/15" />
          <div className="h-3 w-40 rounded bg-white/10" />
        </div>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-white/10 skeleton-shimmer" />
        ))}
      </aside>
      <div className="flex-1 min-w-0">
        <div aria-hidden="true" className="border-b border-sable px-4 lg:px-8 py-4 flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="p-4 lg:p-8">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
