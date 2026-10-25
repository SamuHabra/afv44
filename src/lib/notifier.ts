// Messages à l'écran (remplacent les fenêtres alert() du navigateur).
// Utilisable partout, y compris hors des composants React.

export type TypeMessage = 'success' | 'error' | 'info';

export interface Message {
  id: number;
  texte: string;
  type: TypeMessage;
  persistant: boolean;
}

type Ecouteur = (m: Message) => void;
const ecouteurs = new Set<Ecouteur>();
let compteur = 0;

export function ecouterMessages(fn: Ecouteur) {
  ecouteurs.add(fn);
  return () => { ecouteurs.delete(fn); };
}

const ERREUR = /impossible|erreur|échec|échou|introuvable|veuillez|dépasse|déjà|bloqué|aucun|pas assez|il faut|rien à|n’est pas|n'est pas|changé|non enregistrée|⚠️|❌/i;
const SUCCES = /✅|enregistr|créé|réinitialis|succès/i;

/** Affiche un message. Le type est déduit du texte s'il n'est pas donné. */
export function notifier(texte: string, type?: TypeMessage, options: { persistant?: boolean } = {}) {
  const propre = texte.replace(/^(✅|❌|⚠️)\s*/, '');
  const deduit: TypeMessage = type ?? (/^✅/.test(texte) ? 'success' : ERREUR.test(texte) ? 'error' : SUCCES.test(texte) ? 'success' : 'info');
  const message: Message = { id: ++compteur, texte: propre, type: deduit, persistant: !!options.persistant };
  ecouteurs.forEach(fn => fn(message));
}
