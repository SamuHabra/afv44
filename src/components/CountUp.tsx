import { useEffect, useState } from 'react';

/** Chiffre qui s'incrémente jusqu'à sa valeur (sans animation si la personne le préfère). */
export default function CountUp({ value, format = (n: number) => String(n), duree = 900 }: { value: number; format?: (n: number) => string; duree?: number }) {
  const [courant, setCourant] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCourant(value); return; }
    let frame = 0;
    const debut = performance.now();
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / duree);
      setCourant(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(pas);
    };
    frame = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(frame);
  }, [value, duree]);

  return <>{format(courant)}</>;
}
