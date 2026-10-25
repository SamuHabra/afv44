import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { createUser, resetPasswordByAdmin, genererMotDePasseTemporaire } from '../lib/auth';
import { notifier } from '../lib/notifier';
import { KenteBand, SunDisc } from '../components/Motifs';
import { Fenetre, Champ, saisie } from '../components/ui';
import { UserPlus, Search, Phone, Mail, KeyRound, ShieldCheck, UserX, UserCheck, X, Copy, RefreshCw, Users as UsersIcon } from 'lucide-react';
import { Role, User } from '../types';

const roleLabels: Record<string, string> = {
  admin: 'Administratrice',
  presidente: 'Présidente',
  secretaire: 'Secrétaire générale',
  tresoriere: 'Trésorière',
  commissaire: 'Commissaire aux comptes',
  animatrice: 'Animatrice',
  conseillere: 'Conseillère',
  membre: 'Membre',
};

// Ce que chaque rôle permet de faire, pour aider à choisir
const roleHints: Record<string, string> = {
  admin: 'Accès complet : membres, paramètres, exercice annuel.',
  presidente: 'Valide les mouvements et les prêts, gère les réunions et les tontines.',
  secretaire: 'Rédige les procès-verbaux, saisit les amendes, gère les tontines.',
  tresoriere: 'Saisit les mouvements, les remboursements et les versements.',
  commissaire: 'Vérifie les comptes, valide les mouvements, consulte les journaux.',
  animatrice: 'Anime les séances. Consulte les rapports.',
  conseillere: 'Conseille et médie. Consulte les rapports.',
  membre: 'Consulte son espace, demande un prêt, s\'inscrit aux tontines.',
};

const ORDRE: Role[] = ['admin', 'presidente', 'secretaire', 'tresoriere', 'commissaire', 'animatrice', 'conseillere', 'membre'];
const BUREAU: string[] = ['admin', 'presidente', 'secretaire', 'tresoriere', 'commissaire'];
const ANIMATION: string[] = ['animatrice', 'conseillere'];

type Filtre = 'toutes' | 'bureau' | 'animation' | 'membres' | 'desactivees';

const groupes: { id: Exclude<Filtre, 'toutes' | 'desactivees'>; titre: string; sousTitre: string; roles: string[] }[] = [
  { id: 'bureau', titre: 'Bureau exécutif', sousTitre: 'Élu pour 3 ans', roles: BUREAU },
  { id: 'animation', titre: 'Animation et conseil', sousTitre: 'Animatrice et conseillères', roles: ANIMATION },
  { id: 'membres', titre: 'Membres', sousTitre: 'Toutes les adhérentes', roles: ['membre'] },
];

async function copier(texte: string, confirmation: string) {
  try {
    await navigator.clipboard.writeText(texte);
    notifier(confirmation, 'success');
  } catch {
    notifier('Copie impossible : sélectionnez le texte et copiez-le à la main.', 'error');
  }
}

export default function Members() {
  const { users, currentUser, toggleMemberStatus, changerRole, rechargerDonnees } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('toutes');

  const [fenetre, setFenetre] = useState<null | 'ajout' | 'acces' | 'role' | 'motdepasse' | 'statut'>(null);
  const [cible, setCible] = useState<User | null>(null);

  // Création
  const [formNom, setFormNom] = useState('');
  const [formPrenom, setFormPrenom] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelephone, setFormTelephone] = useState('');
  const [formRole, setFormRole] = useState<Role>('membre');
  const [formPassword, setFormPassword] = useState(() => genererMotDePasseTemporaire());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [acces, setAcces] = useState<{ nom: string; telephone: string; motDePasse: string } | null>(null);

  // Modification
  const [nouveauRole, setNouveauRole] = useState<Role>('membre');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState(() => genererMotDePasseTemporaire());

  const fermer = () => { setFenetre(null); setErreur(''); setCible(null); };

  const compte = useMemo(() => ({
    toutes: users.length,
    actives: users.filter(u => u.actif).length,
    bureau: users.filter(u => u.actif && BUREAU.includes(u.role)).length,
    animation: users.filter(u => u.actif && ANIMATION.includes(u.role)).length,
    membres: users.filter(u => u.actif && u.role === 'membre').length,
    desactivees: users.filter(u => !u.actif).length,
  }), [users]);

  const correspond = (u: User) => `${u.prenom} ${u.nom} ${u.email ?? ''} ${u.telephone}`.toLowerCase().includes(recherche.trim().toLowerCase());
  const trier = (a: User, b: User) => ORDRE.indexOf(a.role) - ORDRE.indexOf(b.role) || `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, 'fr');

  const sections = useMemo(() => {
    const visibles = users.filter(correspond);
    const sectionsActives = groupes
      .filter(g => filtre === 'toutes' || filtre === g.id)
      .map(g => ({ ...g, liste: visibles.filter(u => u.actif && g.roles.includes(u.role)).sort(trier) }));
    const desactivees = visibles.filter(u => !u.actif).sort(trier);
    const sectionDesactivees = filtre === 'toutes' || filtre === 'desactivees'
      ? [{ id: 'desactivees', titre: 'Comptes désactivés', sousTitre: 'Ne peuvent plus se connecter', roles: [] as string[], liste: desactivees }]
      : [];
    return [...(filtre === 'desactivees' ? [] : sectionsActives), ...sectionDesactivees].filter(s => s.liste.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, recherche, filtre]);

  const nbAffiches = sections.reduce((n, s) => n + s.liste.length, 0);

  // ───── Actions ─────
  const ouvrirAjout = () => {
    setFormNom(''); setFormPrenom(''); setFormEmail(''); setFormTelephone(''); setFormRole('membre');
    setFormPassword(genererMotDePasseTemporaire()); setErreur('');
    setFenetre('ajout');
  };

  const creer = async () => {
    setErreur('');
    if (!formNom.trim() || !formPrenom.trim() || !formEmail.trim() || !formTelephone.trim()) {
      setErreur('Tous les champs sont obligatoires.');
      return;
    }
    setEnCours(true);
    try {
      const res = await createUser({ nom: formNom.trim(), prenom: formPrenom.trim(), email: formEmail.trim(), telephone: formTelephone.trim(), role: formRole, password: formPassword });
      if (res.success) {
        await rechargerDonnees();
        setAcces({ nom: `${formPrenom.trim()} ${formNom.trim()}`, telephone: formTelephone.trim(), motDePasse: formPassword });
        setFenetre('acces');
      } else {
        setErreur(res.error || 'Erreur lors de la création du compte.');
      }
    } catch (e: any) {
      setErreur(e.message || 'Erreur lors de la création du compte.');
    }
    setEnCours(false);
  };

  const modifierRole = async () => {
    if (!cible) return;
    const res = await changerRole(cible.id, nouveauRole);
    if (res.ok) { notifier(`Rôle de ${cible.prenom} mis à jour : ${roleLabels[nouveauRole]}.`, 'success'); fermer(); }
    else notifier(res.error || 'Impossible de modifier le rôle', 'error');
  };

  const reinitialiser = async () => {
    if (!cible) return;
    const res = await resetPasswordByAdmin(cible.id, nouveauMotDePasse);
    if (res.success) {
      setAcces({ nom: `${cible.prenom} ${cible.nom}`, telephone: cible.telephone, motDePasse: nouveauMotDePasse });
      setFenetre('acces');
    } else {
      notifier(res.error || 'Erreur lors de la réinitialisation', 'error');
    }
  };

  const changerStatut = async () => {
    if (!cible) return;
    await toggleMemberStatus(cible.id);
    notifier(cible.actif ? `${cible.prenom} ${cible.nom} est désactivée.` : `${cible.prenom} ${cible.nom} est réactivée.`, 'success');
    fermer();
  };

  const messageAcces = (a: { nom: string; telephone: string; motDePasse: string }) =>
    `Bonjour ${a.nom.split(' ')[0]}, voici vos accès à l'application AFMEY :\nTéléphone : ${a.telephone}\nMot de passe temporaire : ${a.motDePasse}\nVous pourrez le changer à votre première connexion.`;

  const depuis = (u: User) => {
    const d = new Date(u.dateInscription);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const filtres: { id: Filtre; label: string; n: number }[] = [
    { id: 'toutes', label: 'Toutes', n: compte.toutes },
    { id: 'bureau', label: 'Bureau', n: compte.bureau },
    { id: 'animation', label: 'Animation et conseil', n: compte.animation },
    { id: 'membres', label: 'Membres', n: compte.membres },
    ...(compte.desactivees > 0 ? [{ id: 'desactivees' as Filtre, label: 'Désactivées', n: compte.desactivees }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Bandeau */}
      <section className="relative overflow-hidden bg-encre text-creme rounded-3xl">
        <SunDisc className="-top-20 -right-12 w-64 h-64" />
        <div className="relative px-6 py-6 lg:px-8 lg:py-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-sable mb-1">Annuaire de l'association</p>
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">Nos membres</h1>
            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4">
              <div><p className="text-3xl font-bold text-safran" style={{ fontFamily: 'var(--font-display)' }}>{compte.actives}</p><p className="text-xs text-sable">actives</p></div>
              <div><p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{compte.bureau}</p><p className="text-xs text-sable">au bureau</p></div>
              <div><p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{compte.desactivees}</p><p className="text-xs text-sable">désactivées</p></div>
            </div>
          </div>
          {isAdmin && (
            <button onClick={ouvrirAjout} className="flex items-center justify-center gap-2 px-6 h-12 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12] hover:brightness-105 transition">
              <UserPlus size={18} /> Nouvelle membre
            </button>
          )}
        </div>
        <KenteBand height={10} />
      </section>

      {/* Recherche et filtres */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <label htmlFor="recherche-membres" className="sr-only">Rechercher une membre</label>
          <input id="recherche-membres" type="search" value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, téléphone ou email" className="w-full h-12 pl-11 pr-4 bg-white border-2 border-sable rounded-xl outline-none focus:border-safran" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par groupe">
          {filtres.map(f => (
            <button key={f.id} onClick={() => setFiltre(f.id)} aria-pressed={filtre === f.id}
              className={`px-4 h-10 rounded-full text-sm font-medium transition ${filtre === f.id ? 'bg-encre text-creme' : 'bg-white border border-sable text-gray-700 hover:border-encre'}`}>
              {f.label} <span className={filtre === f.id ? 'text-safran' : 'text-gray-500'}>{f.n}</span>
            </button>
          ))}
        </div>
      </div>

      {recherche && <p className="text-sm text-gray-600" role="status">{nbAffiches} résultat(s)</p>}

      {/* Sections */}
      {sections.map(s => (
        <section key={s.id} aria-labelledby={`groupe-${s.id}`}>
          <div className="flex items-baseline gap-3 mb-3">
            <h2 id={`groupe-${s.id}`} className="text-xl font-bold text-encre">{s.titre}</h2>
            <span className="text-sm text-gray-500">{s.liste.length} · {s.sousTitre}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {s.liste.map(u => {
              const moi = u.id === currentUser?.id;
              const enBureau = BUREAU.includes(u.role);
              return (
                <article key={u.id} className={`zoom bg-white border border-sable rounded-2xl p-5 flex flex-col gap-4 ${u.actif ? '' : 'opacity-70'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-base font-bold ${u.actif ? 'bg-safran text-encre' : 'bg-gray-200 text-gray-600'}`} aria-hidden="true">
                      {u.prenom[0]}{u.nom[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-encre leading-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>
                        {u.prenom} {u.nom}
                        {moi && <span className="ml-2 align-middle text-[11px] font-bold px-2 py-0.5 rounded-full bg-safran/30 text-encre">Vous</span>}
                      </h3>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${enBureau ? 'bg-encre text-creme' : ANIMATION.includes(u.role) ? 'bg-safran/30 text-encre' : 'bg-gray-100 text-gray-700'}`}>
                        {roleLabels[u.role]}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <a href={`tel:${u.telephone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-gray-700 hover:text-terre"><Phone size={14} className="shrink-0 text-gray-500" />{u.telephone}</a>
                    {u.email && <p className="flex items-center gap-2 text-gray-700 min-w-0"><Mail size={14} className="shrink-0 text-gray-500" /><span className="truncate">{u.email}</span></p>}
                    {depuis(u) && <p className="text-xs text-gray-500 pl-6">Membre depuis {depuis(u)}</p>}
                  </div>

                  {isAdmin && !moi && (
                    <div className="mt-auto pt-4 border-t border-sable grid grid-cols-3 gap-2">
                      <button onClick={() => { setCible(u); setNouveauRole(u.role); setFenetre('role'); }}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold text-encre hover:bg-creme transition">
                        <ShieldCheck size={18} className="text-terre" /> Rôle
                      </button>
                      <button onClick={() => { setCible(u); setNouveauMotDePasse(genererMotDePasseTemporaire()); setFenetre('motdepasse'); }}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold text-encre hover:bg-creme transition">
                        <KeyRound size={18} className="text-terre" /> Mot de passe
                      </button>
                      <button onClick={() => { setCible(u); setFenetre('statut'); }}
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold transition ${u.actif ? 'text-red-700 hover:bg-red-50' : 'text-green-700 hover:bg-green-50'}`}>
                        {u.actif ? <UserX size={18} /> : <UserCheck size={18} />} {u.actif ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {nbAffiches === 0 && (
        <div className="text-center py-14 bg-white border-2 border-dashed border-sable rounded-2xl">
          <UsersIcon size={44} className="mx-auto mb-3 text-gray-300" />
          <p className="font-bold text-encre">Aucune membre trouvée</p>
          <p className="text-sm text-gray-600 mt-1">Essayez un autre nom ou changez de filtre.</p>
        </div>
      )}

      {/* ───── Nouvelle membre ───── */}
      {fenetre === 'ajout' && (
        <Fenetre titre="Nouvelle membre" onClose={fermer} taille="lg">
          {erreur && <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{erreur}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Champ id="m-prenom" label="Prénom *"><input id="m-prenom" value={formPrenom} onChange={e => setFormPrenom(e.target.value)} className={saisie} /></Champ>
            <Champ id="m-nom" label="Nom *"><input id="m-nom" value={formNom} onChange={e => setFormNom(e.target.value)} className={saisie} /></Champ>
          </div>
          <Champ id="m-tel" label="Téléphone *" aide="C'est son identifiant de connexion.">
            <input id="m-tel" type="tel" value={formTelephone} onChange={e => setFormTelephone(e.target.value)} placeholder="+237 6XX XX XX XX" className={saisie} />
          </Champ>
          <Champ id="m-email" label="Email *"><input id="m-email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="prenom@exemple.com" className={saisie} /></Champ>
          <Champ id="m-role" label="Rôle *" aide={roleHints[formRole]}>
            <select id="m-role" value={formRole} onChange={e => setFormRole(e.target.value as Role)} className={saisie}>
              {[...ORDRE].reverse().map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </select>
          </Champ>
          <Champ id="m-mdp" label="Mot de passe temporaire" aide="Généré automatiquement. Elle pourra le changer à sa première connexion.">
            <div className="flex gap-2">
              <input id="m-mdp" value={formPassword} onChange={e => setFormPassword(e.target.value)} className={`${saisie} font-mono`} />
              <button type="button" onClick={() => setFormPassword(genererMotDePasseTemporaire())} aria-label="Générer un autre mot de passe" className="w-12 h-12 shrink-0 rounded-xl bg-white border-2 border-sable hover:border-encre flex items-center justify-center"><RefreshCw size={18} /></button>
            </div>
          </Champ>
          <button onClick={creer} disabled={enCours} className="w-full h-13 py-3.5 bg-safran text-encre rounded-2xl font-bold shadow-[0_4px_0_#C47F12] hover:brightness-105 disabled:opacity-50">
            {enCours ? 'Création…' : 'Créer le compte'}
          </button>
        </Fenetre>
      )}

      {/* ───── Accès à transmettre ───── */}
      {fenetre === 'acces' && acces && (
        <Fenetre titre="Accès à transmettre" onClose={fermer}>
          <p className="text-sm text-gray-700">Le compte de <strong>{acces.nom}</strong> est prêt. Ce mot de passe ne sera plus affiché : transmettez-le maintenant.</p>
          <div className="bg-white border-2 border-sable rounded-2xl p-4 space-y-3">
            <div><p className="text-xs text-gray-500">Téléphone</p><p className="font-mono text-encre">{acces.telephone}</p></div>
            <div><p className="text-xs text-gray-500">Mot de passe temporaire</p><p className="font-mono text-lg font-bold text-encre">{acces.motDePasse}</p></div>
          </div>
          <button onClick={() => copier(messageAcces(acces), 'Message copié : collez-le dans WhatsApp ou un SMS.')} className="w-full h-12 flex items-center justify-center gap-2 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12]">
            <Copy size={18} /> Copier le message prêt à envoyer
          </button>
          <button onClick={fermer} className="w-full h-12 bg-encre text-creme rounded-xl font-bold">Terminé</button>
        </Fenetre>
      )}

      {/* ───── Rôle ───── */}
      {fenetre === 'role' && cible && (
        <Fenetre titre="Modifier le rôle" onClose={fermer}>
          <p className="text-sm text-gray-700"><strong>{cible.prenom} {cible.nom}</strong> · actuellement {roleLabels[cible.role]}</p>
          <fieldset className="space-y-2">
            <legend className="sr-only">Nouveau rôle</legend>
            {ORDRE.map(r => (
              <label key={r} className={`flex gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${nouveauRole === r ? 'border-encre bg-white' : 'border-sable hover:border-gray-400'}`}>
                <input type="radio" name="role" checked={nouveauRole === r} onChange={() => setNouveauRole(r)} className="mt-1 accent-[#A5410E]" />
                <span><span className="font-bold text-encre block">{roleLabels[r]}</span><span className="text-xs text-gray-600">{roleHints[r]}</span></span>
              </label>
            ))}
          </fieldset>
          <button onClick={modifierRole} disabled={nouveauRole === cible.role} className="w-full h-12 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12] disabled:opacity-40 disabled:shadow-none">Enregistrer le rôle</button>
        </Fenetre>
      )}

      {/* ───── Mot de passe ───── */}
      {fenetre === 'motdepasse' && cible && (
        <Fenetre titre="Réinitialiser le mot de passe" onClose={fermer}>
          <p className="text-sm text-gray-700"><strong>{cible.prenom} {cible.nom}</strong> · {cible.telephone}</p>
          <Champ id="r-mdp" label="Nouveau mot de passe temporaire" aide="Elle devra le changer à sa prochaine connexion.">
            <div className="flex gap-2">
              <input id="r-mdp" value={nouveauMotDePasse} onChange={e => setNouveauMotDePasse(e.target.value)} className={`${saisie} font-mono`} />
              <button type="button" onClick={() => setNouveauMotDePasse(genererMotDePasseTemporaire())} aria-label="Générer un autre mot de passe" className="w-12 h-12 shrink-0 rounded-xl bg-white border-2 border-sable hover:border-encre flex items-center justify-center"><RefreshCw size={18} /></button>
            </div>
          </Champ>
          <div className="flex gap-2">
            <button onClick={fermer} className="flex-1 h-12 bg-white border-2 border-sable rounded-xl font-bold text-encre">Annuler</button>
            <button onClick={reinitialiser} disabled={nouveauMotDePasse.length < 8} className="flex-1 h-12 bg-safran text-encre rounded-xl font-bold shadow-[0_3px_0_#C47F12] disabled:opacity-40">Réinitialiser</button>
          </div>
        </Fenetre>
      )}

      {/* ───── Activation / désactivation ───── */}
      {fenetre === 'statut' && cible && (
        <Fenetre titre={cible.actif ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'} onClose={fermer}>
          <p className="text-sm text-gray-700">
            {cible.actif
              ? <><strong>{cible.prenom} {cible.nom}</strong> ne pourra plus se connecter. Son historique (cotisations, prêts, tontines) est conservé.</>
              : <><strong>{cible.prenom} {cible.nom}</strong> pourra de nouveau se connecter avec son mot de passe.</>}
          </p>
          <div className="flex gap-2">
            <button onClick={fermer} className="flex-1 h-12 bg-white border-2 border-sable rounded-xl font-bold text-encre">Annuler</button>
            <button onClick={changerStatut} className={`flex-1 h-12 rounded-xl font-bold text-white ${cible.actif ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'}`}>
              {cible.actif ? 'Désactiver' : 'Réactiver'}
            </button>
          </div>
        </Fenetre>
      )}
    </div>
  );
}
