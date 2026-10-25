import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase, lireJeton } from '../lib/supabase';

type Etat =
  | { type: 'repos' }
  | { type: 'test' }
  | { type: 'ok'; role: string }
  | { type: 'ko'; message: string };

/** Test à faire AVANT le verrouillage : la base reconnaît-elle le jeton de connexion ? */
export default function SecurityCheck({ userId }: { userId: string }) {
  const [etat, setEtat] = useState<Etat>({ type: 'repos' });

  const tester = async () => {
    setEtat({ type: 'test' });
    if (!lireJeton()) {
      setEtat({ type: 'ko', message: "Aucun jeton de session. Déconnectez-vous puis reconnectez-vous ; si le message revient, le secret JWT n'est pas configuré (update-securite-1-jeton.sql)." });
      return;
    }
    const { data, error } = await supabase.rpc('whoami');
    if (error) {
      setEtat({ type: 'ko', message: `La base a répondu : ${error.message}. Exécutez update-securite-1-jeton.sql.` });
    } else if (data?.uid === userId) {
      setEtat({ type: 'ok', role: String(data.role) });
    } else {
      setEtat({ type: 'ko', message: "La base n'a pas reconnu le jeton (identité vide). Vérifiez que le secret JWT collé est bien le « Legacy JWT Secret » du projet." });
    }
  };

  return (
    <section className="bg-white border border-sable rounded-2xl p-6" aria-labelledby="titre-securite">
      <h3 id="titre-securite" className="text-lg font-bold text-encre flex items-center gap-2 mb-1"><ShieldCheck size={20} /> Sécurité de la connexion</h3>
      <p className="text-sm text-gray-600 mb-4">
        Avant de verrouiller la base (update-securite-2-verrouillage.sql), vérifiez que la base reconnaît bien votre connexion.
      </p>
      <button onClick={tester} disabled={etat.type === 'test'} className="inline-flex items-center gap-2 px-5 h-11 bg-encre text-creme rounded-xl font-bold disabled:opacity-60">
        {etat.type === 'test' && <Loader2 size={16} className="spinner" />} Tester ma connexion
      </button>

      <div role="status" className="mt-4">
        {etat.type === 'ok' && (
          <p className="flex gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl p-3">
            <ShieldCheck size={18} className="shrink-0 mt-0.5" /> Jeton accepté ✅ — la base vous reconnaît (rôle : {etat.role}). Vous pouvez lancer l'étape 2.
          </p>
        )}
        {etat.type === 'ko' && (
          <p className="flex gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" /> {etat.message} <strong>Ne lancez pas l'étape 2.</strong>
          </p>
        )}
      </div>
    </section>
  );
}
