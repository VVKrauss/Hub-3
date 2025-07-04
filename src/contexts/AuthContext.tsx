// src/contexts/AuthContext.tsx - Исправленная версия
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  email: string;
  name?: string;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        console.log('Checking auth session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth session error:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
            setInitialCheckDone(true);
          }
          return;
        }

        console.log('Session found:', !!session);
        
        if (mounted) {
          setUser(session?.user ? {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name
          } : null);
          setLoading(false);
          setInitialCheckDone(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          setInitialCheckDone(true);
        }
      }
    };

    // Выполняем первоначальную проверку только один раз
    if (!initialCheckDone) {
      checkUser();
    }

    // Настраиваем слушатель изменений состояния аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, !!session);
        
        if (mounted) {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name
            });
          } else {
            setUser(null);
          }
          
          // Устанавливаем loading в false только после первоначальной проверки
          if (initialCheckDone) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [initialCheckDone]);

  // Таймаут для предотвращения бесконечной загрузки
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !initialCheckDone) {
        console.warn('Auth check timeout, setting loading to false');
        setLoading(false);
        setInitialCheckDone(true);
      }
    }, 10000); // 10 секунд максимум на загрузку

    return () => clearTimeout(timeout);
  }, [loading, initialCheckDone]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};