// Moteur du diaporama : navigation clavier / clic / glissement, étapes (fragments), notes de l'animatrice, vue d'ensemble.
(function () {
  const stage = document.getElementById('stage');
  const slides = Array.from(stage.querySelectorAll('.slide'));
  const progres = document.getElementById('progres');
  const compteur = document.getElementById('compteur');
  const notes = document.getElementById('notes');
  const vue = document.getElementById('grille-vue');
  let i = -1;
  let etapesDemandees = 0;   // adresse #12-2 : ouvre la diapositive 12 avec 2 étapes déjà affichées
  const debut = Date.now();

  // Mise à l'échelle de la scène 1920×1080 dans la fenêtre
  function ajuster() {
    const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + k + ')';
  }
  window.addEventListener('resize', ajuster); ajuster();

  const frags = (s) => Array.from(s.querySelectorAll('[data-f]')).sort((a, b) => a.dataset.f - b.dataset.f);
  const fragsVisibles = (s) => frags(s).filter((f) => f.classList.contains('on')).length;

  function afficherNotes() {
    const s = slides[i];
    const n = s.querySelector('.notes-contenu');
    const sec = s.dataset.section || '';
    const ecoule = Math.floor((Date.now() - debut) / 60000);
    notes.innerHTML = '<div class="entete"><b>Diapositive ' + (i + 1) + ' / ' + slides.length + '</b><span>' + sec + '</span><span>⏱ ' + ecoule + ' min écoulées</span><span>N : fermer</span></div>' + (n ? n.innerHTML : '<p>—</p>');
  }

  function aller(cible, sens) {
    cible = Math.max(0, Math.min(slides.length - 1, cible));
    if (cible === i) return;
    const dir = sens || (cible > i ? 'va-suivant' : 'va-precedent');
    const ancienne = slides[i];
    if (ancienne) {
      ancienne.classList.remove('active', 'va-suivant', 'va-precedent');
      ancienne.classList.add('sortant', dir);
      setTimeout(() => ancienne.classList.remove('sortant', 'va-suivant', 'va-precedent'), 800);
    }
    i = cible;
    const s = slides[i];
    s.classList.remove('sortant', 'va-suivant', 'va-precedent');
    void s.offsetWidth; // relance les animations
    s.classList.add('active', dir);
    // en revenant en arrière, on affiche toutes les étapes ; en avançant, on repart de zéro
    frags(s).forEach((f) => f.classList.toggle('on', dir === 'va-precedent'));
    if (etapesDemandees) { frags(s).slice(0, etapesDemandees).forEach((f) => f.classList.add('on')); etapesDemandees = 0; }
    majPasse();
    progres.style.width = ((i + 1) / slides.length) * 100 + '%';
    compteur.textContent = (i + 1) + ' / ' + slides.length;
    if (location.hash !== '#' + (i + 1)) history.replaceState(null, '', '#' + (i + 1));
    if (notes.classList.contains('ouvert')) afficherNotes();
  }

  function suivant() {
    const f = frags(slides[i]);
    const prochain = f.find((x) => !x.classList.contains('on'));
    if (prochain) { prochain.classList.add('on'); majPasse(); return; }
    aller(i + 1, 'va-suivant');
  }
  function precedent() {
    const f = frags(slides[i]).filter((x) => x.classList.contains('on'));
    if (f.length) { f[f.length - 1].classList.remove('on'); majPasse(); return; }
    aller(i - 1, 'va-precedent');
  }
  // Une étape marquée « cache-quand-suite » s'efface quand l'étape suivante apparaît
  function majPasse() {
    const f = frags(slides[i]);
    // Élément visible au départ, qui s'efface quand l'étape n° N apparaît (data-cache-a="N")
    slides[i].querySelectorAll('[data-cache-a]').forEach((el) => {
      const cible = f.find((x) => x.dataset.f === el.dataset.cacheA);
      el.classList.toggle('passe', !!(cible && cible.classList.contains('on')));
    });
    f.forEach((x, k) => x.classList.toggle('passe', x.classList.contains('cache-quand-suite') && f[k + 1] && f[k + 1].classList.contains('on')));
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter': e.preventDefault(); suivant(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': e.preventDefault(); precedent(); break;
      case 'Home': aller(0); break;
      case 'End': aller(slides.length - 1); break;
      case 'f': case 'F': document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); break;
      case 'n': case 'N': notes.classList.toggle('ouvert'); if (notes.classList.contains('ouvert')) afficherNotes(); break;
      case 'g': case 'G': case 'Escape': if (e.key === 'Escape' && !vue.classList.contains('ouvert')) break; basculerVue(); break;
    }
  });

  // Clic : tiers droit = suivant, tiers gauche = précédent
  stage.addEventListener('click', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0.25) precedent(); else suivant();
  });
  // Glissement du doigt sur tablette
  let tx = null;
  document.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 60) { dx < 0 ? suivant() : precedent(); }
  }, { passive: true });

  // Vue d'ensemble
  function basculerVue() {
    if (!vue.classList.contains('ouvert')) {
      vue.innerHTML = slides.map((s, k) => '<button data-k="' + k + '" class="' + (k === i ? 'courant' : '') + '"><small>' + (k + 1) + ' · ' + (s.dataset.section || '') + '</small>' + (s.dataset.titre || '') + '</button>').join('');
      vue.querySelectorAll('button').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); vue.classList.remove('ouvert'); aller(+b.dataset.k); }));
    }
    vue.classList.toggle('ouvert');
  }

  setTimeout(() => { const a = document.getElementById('aide'); if (a) a.style.opacity = 0; }, 9000);
  const [numero, etapes] = location.hash.slice(1).split('-');
  const depart = parseInt(numero, 10);
  etapesDemandees = parseInt(etapes, 10) || 0;
  aller(isNaN(depart) ? 0 : depart - 1, 'va-suivant');
})();
