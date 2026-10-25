import { useState } from 'react';
import { login, changePassword } from '../lib/auth';
import { useApp } from '../context/AppContext';
import { KenteBand, SunDisc } from '../components/Motifs';
import { Phone, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function Login() {
  const { setCurrentUser } = useApp();
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [sessionTerminee] = useState(() => {
    try {
      const v = sessionStorage.getItem('afmey_session_terminee');
      sessionStorage.removeItem('afmey_session_terminee');
      return v;
    } catch {
      return null;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!telephone || !password) {
      setError('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    const result = await login({ telephone, password });

    if (result.success && result.user) {
      // Vérifier si c'est la première connexion
      // On ne propose le changement que si first_login est true
      if (result.user.first_login) {
        setTempUser(result.user);
        setShowChangePassword(true);
      } else {
        setCurrentUser(result.user);
      }
    } else {
      setError(result.error || 'Erreur de connexion');
    }

    setLoading(false);
  };

  const handleSkipPasswordChange = async () => {
    if (tempUser) {
      // Marquer first_login comme false pour ne plus afficher la page
      const { supabase } = await import('../lib/supabase');
      await supabase
        .from('users')
        .update({ first_login: false })
        .eq('id', tempUser.id);
      
      // Mettre à jour l'utilisateur local
      const updatedUser = { ...tempUser, first_login: false };
      setCurrentUser(updatedUser);
    }
  };

  if (showChangePassword && tempUser) {
    return (
      <ChangePasswordPrompt
        user={tempUser}
        onSkip={handleSkipPasswordChange}
        onSuccess={() => {
          setCurrentUser(tempUser);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-creme lg:grid lg:grid-cols-2">
      {/* Affiche */}
      <aside className="relative hidden lg:flex flex-col justify-end bg-encre overflow-hidden">
        <SunDisc className="-top-24 -right-24 w-96 h-96" />
        <img src="/femme-africaine.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-top opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-t from-encre via-encre/60 to-transparent" />
        <div className="relative p-12 text-creme">
          <h1 className="text-5xl font-bold leading-tight mb-3">Ensemble,<br />nous grandissons.</h1>
          <p className="text-sable text-lg max-w-sm">Cotisations, épargne, prêts et tontines : la force d'un réseau de femmes, en toute transparence.</p>
        </div>
        <KenteBand height={16} />
      </aside>

      {/* Formulaire */}
      <main className="flex flex-col min-h-screen">
        <div className="lg:hidden"><KenteBand height={12} /></div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center text-center gap-2 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-safran rounded-full flex items-center justify-center">
                  <span className="text-encre font-bold text-3xl" style={{ fontFamily: 'var(--font-display)' }}>A</span>
                </div>
                <p className="text-3xl font-bold text-encre leading-tight" style={{ fontFamily: 'var(--font-display)' }}>AFMEY</p>
              </div>
              <p className="text-sm text-gray-500">Filles & Femmes Mebounou M'Eyinga</p>
            </div>

            <h2 className="text-4xl font-bold text-encre mb-2">Bienvenue, ma sœur</h2>
            <p className="text-gray-600 mb-8">Connectez-vous pour retrouver vos caisses et votre tontine.</p>

            {sessionTerminee && !error && (
              <div role="status" className="mb-4 p-3 bg-safran/20 border border-safran/50 rounded-xl text-sm text-encre">
                Votre session a expiré. Reconnectez-vous pour continuer.
              </div>
            )}

            {error && (
              <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="telephone" className="block text-sm font-bold text-encre mb-1.5">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    id="telephone"
                    type="tel"
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    placeholder="+237 6XX XX XX XX"
                    className="w-full h-13 pl-11 pr-4 py-3.5 bg-white border-2 border-sable rounded-xl focus:border-safran outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-encre mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-13 pl-11 pr-4 py-3.5 bg-white border-2 border-sable rounded-xl focus:border-safran outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-safran text-encre rounded-2xl font-bold text-base shadow-[0_4px_0_#C47F12] hover:brightness-105 active:translate-y-0.5 active:shadow-[0_2px_0_#C47F12] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <span className="inline-flex items-center justify-center gap-2"><span className="spinner w-4 h-4 rounded-full border-2 border-encre/30 border-t-encre" aria-hidden="true" />Connexion…</span> : 'Se connecter'}
              </button>
            </form>

          </div>
        </div>
      </main>
    </div>
  );
}

// Composant pour proposer le changement de mot de passe
function ChangePasswordPrompt({ user, onSkip, onSuccess }: { user: any; onSkip: () => void; onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);

    const result = await changePassword(user.id, currentPassword, newPassword);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Erreur lors du changement de mot de passe');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-encre flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <CheckCircle className="text-green-500 mx-auto mb-3" size={48} />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Bienvenue {user.prenom} !</h2>
            <p className="text-gray-600">
              Souhaitez-vous changer votre mot de passe ? (optionnel)
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Mot de passe temporaire"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Minimum 8 caractères"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Confirmer"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full py-3.5 bg-safran text-encre rounded-xl font-bold hover:brightness-105 transition disabled:opacity-50"
            >
              {loading ? 'Changement...' : 'Changer le mot de passe'}
            </button>

            <button
              onClick={onSkip}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Continuer sans changer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
