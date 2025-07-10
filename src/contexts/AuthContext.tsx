// src/contexts/AuthContext.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ с автовосстановлением
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  const mounted = useRef(true);
  const lastActiveTime = useRef(Date.now());

  // Функция восстановления сессии
  const recoverSession = async () => {
    try {
      console.log('🔄 AuthContext: Attempting session recovery...');
      
      // Пытаемся получить текущую сессию
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ AuthContext: Session recovery error:', error);
        
        // Пытаемся обновить токен
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ AuthContext: Token refresh failed:', refreshError);
          if (mounted.current) {
            setUser(null);
          }
          return false;
        } else {
          console.log('✅ AuthContext: Token refreshed successfully');
          if (mounted.current && refreshData.session?.user) {
            setUser({
              id: refreshData.session.user.id,
              email: refreshData.session.user.email || '',
              name: refreshData.session.user.user_metadata?.name
            });
          }
          return true;
        }
      } else {
        console.log('✅ AuthContext: Session recovered successfully');
        if (mounted.current) {
          setUser(session?.user ? {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name
          } : null);
        }
        return true;
      }
    } catch (error) {
      console.error('❌ AuthContext: Session recovery exception:', error);
      return false;
    }
  };

  // Отслеживание активности вкладки
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastActiveTime.current = Date.now();
        console.log('😴 AuthContext: Tab became inactive');
      } else {
        const inactiveTime = Date.now() - lastActiveTime.current;
        console.log(`👁️ AuthContext: Tab became active (inactive for ${Math.round(inactiveTime / 1000)}s)`);
        
        // Если была неактивна больше 30 секунд и есть пользователь - проверяем сессию
        if (inactiveTime > 30000 && user) {
          console.log('⚠️ AuthContext: Long inactivity detected - checking session');
          setTimeout(() => {
            recoverSession();
          }, 2000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    mounted.current = true;

    const checkUser = async () => {
      try {
        console.log('🔐 AuthContext: Initial session check...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthContext: Initial session error:', error);
          if (mounted.current) {
            setUser(null);
            setLoading(false);
            setInitialCheckDone(true);
          }
          return;
        }
        
        if (mounted.current) {
          setUser(session?.user ? {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name
          } : null);
          setLoading(false);
          setInitialCheckDone(true);
        }
      } catch (error) {
        console.error('❌ AuthContext: Initial session exception:', error);
        if (mounted.current) {
          setUser(null);
          setLoading(false);
          setInitialCheckDone(true);
        }
      }
    };

    if (!initialCheckDone) {
      checkUser();
    }

    // Настраиваем слушатель изменений состояния аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthContext: Auth state changed:', event);
        
        if (mounted.current) {
          if (event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name
              });
            }
          }
          
          if (initialCheckDone) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted.current = false;
      authListener.subscription.unsubscribe();
    };
  }, [initialCheckDone]);

  // Таймаут для предотвращения бесконечной загрузки
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !initialCheckDone) {
        setLoading(false);
        setInitialCheckDone(true);
      }
    }, 10000);

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