import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mdizmerhmetwlpmzgndx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_R_soSrqP15iHCgeiJPB7pQ_zhsU_Lh0';

// Jeton de session signé par la base à la connexion (voir supabase/update-securite-1-jeton.sql)
const CLE_JETON = 'afmey_jeton';

function expirationJeton(jeton: string): number {
  try {
    const charge = JSON.parse(atob(jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof charge.exp === 'number' ? charge.exp : 0;
  } catch {
    return 0;
  }
}

/** Jeton de la session en cours, ou null s'il est absent ou expiré. */
export function lireJeton(): string | null {
  try {
    const jeton = localStorage.getItem(CLE_JETON);
    if (!jeton) return null;
    if (expirationJeton(jeton) * 1000 <= Date.now()) {
      localStorage.removeItem(CLE_JETON);
      return null;
    }
    return jeton;
  } catch {
    return null;
  }
}

/** Vrai si un jeton était enregistré mais est maintenant expiré. */
export function jetonExpire(): boolean {
  try {
    const jeton = localStorage.getItem(CLE_JETON);
    return !!jeton && expirationJeton(jeton) * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function definirJeton(jeton: string | null) {
  try {
    if (jeton) localStorage.setItem(CLE_JETON, jeton);
    else localStorage.removeItem(CLE_JETON);
  } catch {
    /* stockage indisponible : la session ne survivra pas à un rechargement */
  }
}

// Chaque requête porte le jeton ; sans jeton, la clé publique est utilisée (connexion uniquement une fois la base verrouillée)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => lireJeton() ?? supabaseAnonKey,
});
