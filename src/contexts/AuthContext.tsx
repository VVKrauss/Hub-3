// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, getStoredSession, clearStoredSession } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🔐 AuthProvider: Инициализация авторизации...');
      
      try {
        // 1. Сначала проверяем сохраненную сессию
        const storedSession = getStoredSession();
        console.log('🔐 AuthProvider: Сохраненная сессия:', !!storedSession);

        // 2. Получаем текущую сессию из Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🔐 AuthProvider: Ошибка получения сессии:', error);
          // Очищаем поврежденную сессию
          clearStoredSession();
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        console.log('🔐 AuthProvider: Текущая сессия:', !!session);

        if (mounted) {
          if (session?.user) {
            const userData: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name
            };
            setUser(userData);
            console.log('🔐 AuthProvider: Пользователь установлен:', userData.email);
          } else {
            setUser(null);
            console.log('🔐 AuthProvider: Пользователь не найден');
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('🔐 AuthProvider: Ошибка инициализации:', error);
        // В случае любой ошибки очищаем состояние
        clearStoredSession();
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Запускаем инициализацию
    initializeAuth();

    // Подписываемся на изменения состояния авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthProvider: Auth событие:', event);
        
        if (!mounted) return;

        switch (event) {
          case 'INITIAL_SESSION':
            // Начальная сессия уже обработана в initializeAuth
            break;
            
          case 'SIGNED_IN':
            if (session?.user) {
              const userData: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name
              };
              setUser(userData);
              console.log('🔐 AuthProvider: Пользователь вошел:', userData.email);
            }
            setLoading(false);
            break;
            
          case 'SIGNED_OUT':
            setUser(null);
            clearStoredSession();
            console.log('🔐 AuthProvider: Пользователь вышел');
            setLoading(false);
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔐 AuthProvider: Токен обновлен');
            // Пользователь остается тем же, просто обновился токен
            break;
            
          case 'USER_UPDATED':
            if (session?.user) {
              const userData: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name
              };
              setUser(userData);
              console.log('🔐 AuthProvider: Данные пользователя обновлены');
            }
            break;
            
          default:
            console.log('🔐 AuthProvider: Неизвестное событие:', event);
        }
      }
    );

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
      console.log('🔐 AuthProvider: Отписка от auth событий');
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 AuthProvider: Попытка входа для:', email);
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error('🔐 AuthProvider: Ошибка входа:', error);
      throw error;
    }
    
    console.log('🔐 AuthProvider: Вход успешен');
  };

  const signUp = async (email: string, password: string, name: string) => {
    console.log('🔐 AuthProvider: Попытка регистрации для:', email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error('🔐 AuthProvider: Ошибка регистрации:', error);
      throw error;
    }
    
    console.log('🔐 AuthProvider: Регистрация успешна');
  };

  const signOut = async () => {
    console.log('🔐 AuthProvider: Выход из системы');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('🔐 AuthProvider: Ошибка выхода:', error);
      throw error;
    }
    
    // Принудительно очищаем состояние
    clearStoredSession();
    setUser(null);
    console.log('🔐 AuthProvider: Выход выполнен');
  };

  const resetPassword = async (email: string) => {
    console.log('🔐 AuthProvider: Сброс пароля для:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('🔐 AuthProvider: Ошибка сброса пароля:', error);
      throw error;
    }
    
    console.log('🔐 AuthProvider: Сброс пароля отправлен');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword 
    }}>
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