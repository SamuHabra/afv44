import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { amendeMontants } from '../data/baremes';

export type BaremeAmendes = Record<string, { montant: number; label: string }>;

// Barème des amendes lu dans la table types_amende ; valeurs de data/baremes.ts tant que la base n'a pas répondu
export function useBaremeAmendes(): BaremeAmendes {
  const [bareme, setBareme] = useState<BaremeAmendes>(amendeMontants);

  useEffect(() => {
    let actif = true;
    supabase.from('types_amende').select('*').then(({ data, error }) => {
      if (!actif || error || !data || data.length === 0) return;
      setBareme(Object.fromEntries(data.map(t => [t.code, { montant: Number(t.montant), label: t.libelle }])));
    });
    return () => { actif = false; };
  }, []);

  return bareme;
}
