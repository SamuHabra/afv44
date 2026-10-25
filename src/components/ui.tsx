import { ReactNode, useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';

// Éléments d'interface partagés par les formulaires et les fenêtres.

/** Classes d'un champ de saisie (hauteur tactile 48 px). */
export const saisie = 'w-full h-12 px-4 bg-white border-2 border-sable rounded-xl outline-none focus:border-safran transition';
export const saisieZone = 'w-full px-4 py-3 bg-white border-2 border-sable rounded-xl outline-none focus:border-safran transition resize-none';

/** Bouton principal (action à faire) et secondaire (annuler). */
export const boutonPrincipal = 'w-full h-12 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12] hover:brightness-105 disabled:opacity-40 disabled:shadow-none transition';
export const boutonSecondaire = 'h-12 px-5 bg-white border-2 border-sable rounded-xl font-bold text-encre hover:border-encre transition';

const largeurs = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-3xl', xxl: 'max-w-4xl' } as const;

/**
 * Fenêtre modale. La classe « fixed inset-0 bg-black/50 » est reconnue par useDialogAccessibility
 * (rôle dialog, touche Échap, focus piégé) : ne la changez pas sans adapter ce hook.
 */
export function Fenetre({ titre, sousTitre, onClose, children, taille = 'md' }: {
  titre: string; sousTitre?: string; onClose: () => void; children: ReactNode; taille?: keyof typeof largeurs;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-creme rounded-3xl w-full ${largeurs[taille]} max-h-[92vh] overflow-y-auto shadow-2xl`}>
        <div className="sticky top-0 bg-creme flex items-start justify-between gap-3 px-6 pt-6 pb-3 rounded-t-3xl z-10">
          <div>
            <h3 className="text-2xl font-bold text-encre leading-tight">{titre}</h3>
            {sousTitre && <p className="text-sm text-gray-600 mt-0.5">{sousTitre}</p>}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 -mr-2 rounded-xl hover:bg-sable/40 shrink-0"><X size={20} /></button>
        </div>
        <div className="px-6 pb-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

/** Champ de formulaire avec étiquette liée et aide optionnelle. */
export function Champ({ id, label, children, aide }: { id: string; label: string; children: ReactNode; aide?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-encre mb-1.5">{label}</label>
      {children}
      {aide && <p className="text-xs text-gray-600 mt-1.5">{aide}</p>}
    </div>
  );
}

/** Encadré d'information (safran clair). */
export function Info({ children }: { children: ReactNode }) {
  return <div className="bg-safran/15 border border-safran/50 rounded-xl p-3 text-sm text-encre space-y-1">{children}</div>;
}

/**
 * Confirmation par fenêtre (remplace window.confirm).
 * const [confirmer, fenetreConfirmation] = useConfirmation();
 * if (!(await confirmer({ titre, message, action }))) return;   …   puis afficher {fenetreConfirmation} dans le JSX.
 */
type DemandeConfirmation = { titre?: string; message: string; action?: string };

export function useConfirmation(): [(d: DemandeConfirmation | string) => Promise<boolean>, ReactNode] {
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const resolveur = useRef<((ok: boolean) => void) | null>(null);

  const confirmer = useCallback((d: DemandeConfirmation | string) => new Promise<boolean>(resolve => {
    resolveur.current = resolve;
    setDemande(typeof d === 'string' ? { message: d } : d);
  }), []);

  const repondre = (ok: boolean) => {
    resolveur.current?.(ok);
    resolveur.current = null;
    setDemande(null);
  };

  const fenetre = demande && (
    <Fenetre titre={demande.titre ?? 'Confirmation'} onClose={() => repondre(false)}>
      <p className="text-encre">{demande.message}</p>
      <div className="flex gap-3 pt-2">
        <button onClick={() => repondre(false)} className={boutonSecondaire}>Annuler</button>
        <button onClick={() => repondre(true)} autoFocus className={boutonPrincipal}>{demande.action ?? 'Confirmer'}</button>
      </div>
    </Fenetre>
  );
  return [confirmer, fenetre];
}
