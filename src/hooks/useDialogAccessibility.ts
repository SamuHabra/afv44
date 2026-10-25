import { useEffect } from 'react';

// Toutes les fenêtres de l'application sont des blocs « fixed inset-0 » avec un fond noir semi-transparent.
// Ce hook leur donne, au moment où elles apparaissent :
//   • le rôle « dialog » (annoncé par les lecteurs d'écran) et un nom tiré de leur titre ;
//   • la touche Échap pour les fermer (via leur bouton de fermeture) ;
//   • un focus qui reste dans la fenêtre, puis revient au bouton d'origine à la fermeture.
const SELECTEUR = 'div[class*="fixed"][class*="inset-0"][class*="bg-black/50"]';
const FOCUSABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function boiteDe(fond: HTMLElement): HTMLElement | null {
  return fond.firstElementChild as HTMLElement | null;
}

function boutonFermer(fond: HTMLElement): HTMLButtonElement | null {
  const boutons = Array.from(fond.querySelectorAll<HTMLButtonElement>('button'));
  return boutons.find(b => b.querySelector('svg.lucide-x') && !b.textContent?.trim()) ?? null;
}

export function useDialogAccessibility() {
  useEffect(() => {
    const retour = new WeakMap<HTMLElement, HTMLElement | null>();
    const vus = new WeakSet<HTMLElement>();

    const preparer = (fond: HTMLElement) => {
      const boite = boiteDe(fond);
      // Le voile du menu mobile n'a pas de contenu : ce n'est pas une fenêtre
      if (!boite || vus.has(fond)) return;
      vus.add(fond);

      boite.setAttribute('role', 'dialog');
      boite.setAttribute('aria-modal', 'true');
      const titre = boite.querySelector('h1, h2, h3');
      if (titre?.textContent) boite.setAttribute('aria-label', titre.textContent.trim());
      boite.tabIndex = -1;

      retour.set(fond, document.activeElement as HTMLElement | null);
      const premier = boite.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
        ?? boite.querySelector<HTMLElement>(FOCUSABLES);
      (premier ?? boite).focus({ preventScroll: true });
    };

    const fenetreOuverte = (): HTMLElement | null => {
      const toutes = Array.from(document.querySelectorAll<HTMLElement>(SELECTEUR)).filter(f => boiteDe(f));
      return toutes.length ? toutes[toutes.length - 1] : null;
    };

    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(n => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches(SELECTEUR)) preparer(n);
          n.querySelectorAll<HTMLElement>(SELECTEUR).forEach(preparer);
        });
        m.removedNodes.forEach(n => {
          if (!(n instanceof HTMLElement)) return;
          const fonds = n.matches(SELECTEUR) ? [n] : Array.from(n.querySelectorAll<HTMLElement>(SELECTEUR));
          fonds.forEach(f => {
            const origine = retour.get(f);
            if (origine && document.contains(origine) && !fenetreOuverte()) origine.focus({ preventScroll: true });
          });
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll<HTMLElement>(SELECTEUR).forEach(preparer);

    const surTouche = (e: KeyboardEvent) => {
      const fond = fenetreOuverte();
      if (!fond) return;
      const boite = boiteDe(fond)!;

      if (e.key === 'Escape') {
        const fermer = boutonFermer(fond);
        if (fermer) { e.preventDefault(); fermer.click(); }
        return;
      }
      if (e.key !== 'Tab') return;

      const elements = Array.from(boite.querySelectorAll<HTMLElement>(FOCUSABLES)).filter(el => el.offsetParent !== null);
      if (elements.length === 0) { e.preventDefault(); boite.focus(); return; }
      const premier = elements[0];
      const dernier = elements[elements.length - 1];
      if (e.shiftKey && (document.activeElement === premier || !boite.contains(document.activeElement))) {
        e.preventDefault(); dernier.focus();
      } else if (!e.shiftKey && (document.activeElement === dernier || !boite.contains(document.activeElement))) {
        e.preventDefault(); premier.focus();
      }
    };
    document.addEventListener('keydown', surTouche);

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', surTouche);
    };
  }, []);
}
