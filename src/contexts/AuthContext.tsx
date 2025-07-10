// src/contexts/AuthContext.tsx - Версия без лишних уведомлений
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase, getStoredSession, clearStoredSession } from '../lib/supabase';

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
  
  // Отслеживаем состояние для предотвращения дублирования уведомлений
  const wasAuthenticatedRef = useRef(false);
  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let initializationCompleted = false;

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
          if (mounted && !initializationCompleted) {
            setUser(null);
            setLoading(false);
            initializationCompleted = true;
            initialCheckDoneRef.current = true;
          }
          return;
        }

        console.log('🔐 AuthProvider: Текущая сессия:', !!session);

        if (mounted && !initializationCompleted) {
          if (session?.user) {
            const userData: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name
            };
            setUser(userData);
            wasAuthenticatedRef.current = true;
            console.log('🔐 AuthProvider: Пользователь установлен:', userData.email);
          } else {
            setUser(null);
            wasAuthenticatedRef.current = false;
            console.log('🔐 AuthProvider: Пользователь не найден');
          }
          setLoading(false);
          initializationCompleted = true;
          initialCheckDoneRef.current = true;
        }
      } catch (error) {
        console.error('🔐 AuthProvider: Ошибка инициализации:', error);
        // В случае любой ошибки очищаем состояние
        clearStoredSession();
        if (mounted && !initializationCompleted) {
          setUser(null);
          setLoading(false);
          initializationCompleted = true;
          initialCheckDoneRef.current = true;
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
            console.log('🔐 AuthProvider: Обработка начальной сессии пропущена');
            break;
            
          case 'SIGNED_IN':
            if (session?.user) {
              const userData: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name
              };
              
              // Проверяем, это новый вход или восстановление сессии
              const isNewSignIn = !wasAuthenticatedRef.current && initialCheckDoneRef.current;
              
              setUser(userData);
              wasAuthenticatedRef.current = true;
              
              if (isNewSignIn) {
                console.log('🔐 AuthProvider: Новый пользователь вошел:', userData.email);
              } else {
                console.log('🔐 AuthProvider: Восстановление сессии:', userData.email);
              }
            }
            if (initializationCompleted) {
              setLoading(false);
            }
            break;
            
          case 'SIGNED_OUT':
            setUser(null);
            wasAuthenticatedRef.current = false;
            clearStoredSession();
            console.log('🔐 AuthProvider: Пользователь вышел');
            if (initializationCompleted) {
              setLoading(false);
            }
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔐 AuthProvider: Токен обновлен');
            // При обновлении токена не меняем пользователя
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
    wasAuthenticatedRef.current = false;
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