import { supabase, definirJeton } from './supabase';

// Types
export interface LoginCredentials {
  telephone: string;
  password: string;
}

export interface CreateUserPayload {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  role: string;
  password?: string; // Mot de passe temporaire (généré s'il est absent)
}

export interface AuthResponse {
  success: boolean;
  user?: any;
  error?: string;
}

// Mot de passe temporaire aléatoire (sans caractères ambigus : 0/O, 1/l/I)
export function genererMotDePasseTemporaire(longueur = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const octets = new Uint32Array(longueur);
  crypto.getRandomValues(octets);
  return Array.from(octets, n => alphabet[n % alphabet.length]).join('');
}

// Connexion avec téléphone + mot de passe (vérification et verrouillage anti force brute côté base)
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.rpc('auth_login', {
      p_telephone: credentials.telephone,
      p_password: credentials.password
    });
    if (error) {
      console.error('❌ Erreur de connexion:', error);
      return { success: false, error: 'Erreur de connexion à la base de données (migration update-mon-espace.sql exécutée ?)' };
    }
    if (!data?.ok) return { success: false, error: data?.error || 'Erreur de connexion' };
    definirJeton(data.token ?? null);
    return { success: true, user: data.user };
  } catch (error: any) {
    console.error('❌ Erreur de connexion:', error);
    return { success: false, error: error.message || 'Erreur de connexion' };
  }
}

// Créer un utilisateur avec mot de passe par défaut
export async function createUser(payload: CreateUserPayload): Promise<AuthResponse> {
  try {
    const { nom, prenom, telephone, email, role, password } = payload;
    
    // Vérifier si le téléphone existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telephone', telephone)
      .maybeSingle();
    
    if (existingUser) {
      return { success: false, error: 'Ce numéro de téléphone est déjà utilisé' };
    }
    
    // Créer l'utilisateur avec le mot de passe
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        nom,
        prenom,
        telephone,
        email,
        role,
        actif: true,
        date_inscription: new Date().toISOString(),
        first_login: true,
        password_changed: false,
        // valeur provisoire illisible : le vrai mot de passe est haché ensuite par auth_definir_mot_de_passe
        password_hash: crypto.randomUUID()
      })
      .select('id, nom, prenom, telephone, email, role, actif, date_inscription, rang_tontine')
      .single();
    
    if (error) {
      console.error('❌ Erreur création utilisateur:', error);
      return { success: false, error: error.message };
    }
    
    // Le mot de passe en clair inséré ci-dessus est aussitôt remplacé par son empreinte bcrypt
    await supabase.rpc('auth_definir_mot_de_passe', { p_user_id: user.id, p_nouveau: password || genererMotDePasseTemporaire(), p_reinit: true });
    return { success: true, user };
  } catch (error: any) {
    console.error('❌ Erreur:', error);
    return { success: false, error: error.message || 'Erreur lors de la création' };
  }
}

// Changer le mot de passe
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.rpc('auth_changer_mot_de_passe', {
      p_user_id: userId,
      p_ancien: currentPassword,
      p_nouveau: newPassword
    });
    if (error) return { success: false, error: error.message };
    return data?.ok ? { success: true } : { success: false, error: data?.error || 'Erreur lors du changement' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors du changement' };
  }
}

// Réinitialiser le mot de passe (par l'admin)
export async function resetPasswordByAdmin(userId: string, newPassword?: string): Promise<AuthResponse & { newPassword?: string }> {
  try {
    const newPwd = newPassword || genererMotDePasseTemporaire();
    const { data, error } = await supabase.rpc('auth_definir_mot_de_passe', { p_user_id: userId, p_nouveau: newPwd, p_reinit: true });
    if (error) return { success: false, error: error.message };
    if (!data?.ok) return { success: false, error: data?.error };
    return { success: true, newPassword: newPwd };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors de la réinitialisation' };
  }
}

// Déconnexion (simplement nettoyer l'état local)
export async function logout(): Promise<void> {
  definirJeton(null);
  // Pas besoin de faire quoi que ce soit avec Supabase Auth
  // L'état sera géré par le contexte React
}
