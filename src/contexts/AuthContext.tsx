import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';
import { Faculte, AnneeEtude } from '../types/qcm.types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  faculty: Faculte;
  year: AnneeEtude;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Flag sessionStorage : présent uniquement si login manuel fait dans cet onglet/session
const SESSION_FLAG = 'app_session_active';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const isManualLoginRef = useRef(false);

  const loadProfile = (supabaseUser: SupabaseUser): User => {
    const minimalUser = {
      id: supabaseUser.id,
      email: supabaseUser.email!,
    } as User;

    if (mountedRef.current) {
      setUser(minimalUser);
      setLoading(false);
    }

    return minimalUser;
  };

  useEffect(() => {
    mountedRef.current = true;

    const initAuth = async () => {
      setLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Erreur getSession:', error);

        if (session?.user) {
          // ✅ Session Supabase existante MAIS on vérifie si login fait dans cette session navigateur
          const sessionActive = sessionStorage.getItem(SESSION_FLAG);
          if (sessionActive) {
            // Refresh normal → rester connecté
            loadProfile(session.user);
          } else {
            // Nouvel onglet ou nouvelle session navigateur → forcer login
            setUser(null);
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Erreur initAuth:', err);
        setUser(null);
        setLoading(false);
      }
    };

    initAuth().then(() => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mountedRef.current) return;

          if (event === 'SIGNED_IN' && session?.user) {
            if (isManualLoginRef.current) {
              loadProfile(session.user);
              isManualLoginRef.current = false;
            }
          }

          if (event === 'SIGNED_OUT') {
            sessionStorage.removeItem(SESSION_FLAG);
            setUser(null);
            setLoading(false);
          }
        }
      );

      return () => subscription.unsubscribe();
    });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ─── Login ─────────────
  const login = async (email: string, password: string) => {
    isManualLoginRef.current = true;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      isManualLoginRef.current = false;
      throw error;
    }

    if (!data.user) {
      isManualLoginRef.current = false;
      throw new Error('Aucun utilisateur retourné');
    }

    // ✅ Marquer que le login a été fait dans cette session navigateur
    sessionStorage.setItem(SESSION_FLAG, 'true');
  };

  // ─── Register ─────────────
  const register = async (data: RegisterData) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) throw authError;
    if (!authData?.user) throw new Error('Erreur création compte');
  };

  // ─── Logout ─────────────
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erreur logout:', err);
      sessionStorage.removeItem(SESSION_FLAG);
      setUser(null);
      setLoading(false);
    }
  };

  // ─── Update user ─────────────
  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    const previousUser = user;
    try {
      setUser({ ...user, ...userData });
    } catch {
      setUser(previousUser);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}