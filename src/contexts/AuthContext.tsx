// src/contexts/AuthContext.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ (убираем двойные уведомления)
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  isQuickReturn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  forceQuickCheck: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [isQuickReturn, setIsQuickReturn] = useState(false);
  
  // Refs для управления состоянием
  const mounted = useRef(true);
  const initializationCompleted = useRef(false);
  const lastInitTime = useRef(Date.now());
  const quickCheckInProgress = useRef(false);

  useEffect(() => {
    mounted.current = true;
    initializationCompleted.current = false;

    const initializeAuth = async (isTabReturn = false) => {
      // Избегаем множественных инициализаций
      if (quickCheckInProgress.current) {
        console.log('🔐 AuthProvider: Проверка уже в процессе, пропускаем');
        return;
      }

      const timeSinceLastInit = Date.now() - lastInitTime.current;
      
      // Если это возврат на вкладку и прошло мало времени - быстрая проверка
      if (isTabReturn && timeSinceLastInit < 60000) { // 1 минута
        console.log('🔐 AuthProvider: Быстрая проверка при возврате на вкладку');
        setIsQuickReturn(true);
        await performQuickCheck();
        return;
      }

      console.log('🔐 AuthProvider: Полная инициализация авторизации...');
      setIsQuickReturn(false);
      quickCheckInProgress.current = true;
      
      try {
        // 1. Быстрая проверка сохраненной сессии
        const storedSession = getStoredSession();
        console.log('🔐 AuthProvider: Сохраненная сессия:', !!storedSession);

        // 2. Получаем текущую сессию с таймаутом
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 
            isTabReturn ? 3000 : 8000) // Быстрее для возврата на вкладку
        );

        const { data: { session }, error } = await Promise.race([
          sessionPromise, 
          timeoutPromise
        ]) as any;
        
        if (error) {
          console.error('🔐 AuthProvider: Ошибка получения сессии:', error);
          await handleSessionError();
          return;
        }

        console.log('🔐 AuthProvider: Текущая сессия:', !!session);

        if (mounted.current && !initializationCompleted.current) {
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
          setIsQuickReturn(false);
          initializationCompleted.current = true;
          lastInitTime.current = Date.now();
        }

      } catch (error) {
        console.error('🔐 AuthProvider: Ошибка инициализации:', error);
        await handleSessionError();
      } finally {
        quickCheckInProgress.current = false;
      }
    };

    // Быстрая проверка для возврата на вкладку
    const performQuickCheck = async () => {
      try {
        // Сверхбыстрая проверка - используем только кэш браузера
        const cachedSessionStr = localStorage.getItem('sb-auth-token');
        if (cachedSessionStr) {
          const cachedSession = JSON.parse(cachedSessionStr);
          if (cachedSession && cachedSession.expires_at) {
            const expiresAt = new Date(cachedSession.expires_at).getTime();
            const now = Date.now();
            
            // Если токен еще действителен на 5+ минут
            if (expiresAt > now + 300000) {
              console.log('✅ AuthProvider: Быстрая проверка - токен валиден');
              setLoading(false);
              setIsQuickReturn(false);
              return;
            }
          }
        }

        // Если кэш недоступен - минимальная проверка
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Quick timeout')), 2000))
        ]) as any;

        if (session?.user && mounted.current) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name
          };
          setUser(userData);
        }

        setLoading(false);
        setIsQuickReturn(false);
        console.log('✅ AuthProvider: Быстрая проверка завершена');

      } catch (error) {
        console.warn('⚠️ AuthProvider: Ошибка быстрой проверки, переходим к полной:', error);
        // При ошибке быстрой проверки - переходим к полной инициализации
        await initializeAuth(false);
      }
    };

    // Обработка ошибок сессии
    const handleSessionError = async () => {
      clearStoredSession();
      if (mounted.current && !initializationCompleted.current) {
        setUser(null);
        setLoading(false);
        setIsQuickReturn(false);
        initializationCompleted.current = true;
      }
    };

    // Обработчик изменения видимости вкладки
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initializationCompleted.current) {
        console.log('👁️ AuthProvider: Вкладка стала видимой');
        const timeSinceLastInit = Date.now() - lastInitTime.current;
        
        // Если прошло больше 2 минут - перепроверяем
        if (timeSinceLastInit > 120000) {
          console.log('🔄 AuthProvider: Давно не проверялись, запускаем проверку');
          initializeAuth(true);
        }
      }
    };

    // Запускаем первоначальную инициализацию
    initializeAuth();

    // Подписываемся на изменения состояния авторизации (ТОЛЬКО ОДИН РАЗ)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthProvider: Auth событие:', event);
        
        if (!mounted.current) return;

        switch (event) {
          case 'INITIAL_SESSION':
            // Уже обработано в initializeAuth
            break;
            
          case 'SIGNED_IN':
            if (session?.user) {
              const userData: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name
              };
              setUser(userData);
              setLoading(false);
              console.log('🔐 AuthProvider: Пользователь вошел:', userData.email);
              // УБРАЛИ toast отсюда - будет только в TopBarContext
            }
            break;
            
          case 'SIGNED_OUT':
            setUser(null);
            clearStoredSession();
            setLoading(false);
            console.log('🔐 AuthProvider: Пользователь вышел');
            // УБРАЛИ toast отсюда - будет только в TopBarContext
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔐 AuthProvider: Токен обновлен');
            lastInitTime.current = Date.now();
            break;
            
          case 'USER_UPDATED':
            if (session?.user && mounted.current) {
              const userData: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name
              };
              setUser(userData);
              console.log('🔐 AuthProvider: Данные пользователя обновлены');
            }
            break;
        }
      }
    );

    // Подписываемся на изменения видимости (debounced)
    let visibilityTimeout: NodeJS.Timeout;
    const debouncedVisibilityChange = () => {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = setTimeout(handleVisibilityChange, 500);
    };
    
    document.addEventListener('visibilitychange', debouncedVisibilityChange);

    // Cleanup
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', debouncedVisibilityChange);
      clearTimeout(visibilityTimeout);
      console.log('🔐 AuthProvider: Cleanup завершен');
    };
  }, []);

  // Публичные методы
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

  // Новый метод для принудительной быстрой проверки
  const forceQuickCheck = async () => {
    if (quickCheckInProgress.current) return;
    
    console.log('🔐 AuthProvider: Принудительная быстрая проверка');
    setIsQuickReturn(true);
    setLoading(true);
    await performQuickCheck();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isQuickReturn,
      signIn, 
      signUp, 
      signOut, 
      resetPassword,
      forceQuickCheck
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