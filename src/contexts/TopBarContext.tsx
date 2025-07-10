// src/contexts/TopBarContext.tsx - Исправленная версия с таймаутом
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getNavigationItems, getTopbarSettings } from '../api/settings';
import { toast } from 'react-hot-toast';

interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order: number;
  badge?: number;
}

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

interface TopBarContextType {
  navItems: NavItem[];
  topbarHeight: 'compact' | 'standard' | 'large';
  user: UserProfile | null;
  mounted: boolean;
  loading: boolean;
  refreshNavigation: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const TopBarContext = createContext<TopBarContextType | undefined>(undefined);

export const TopBarProvider = ({ children }: { children: ReactNode }) => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [topbarHeight, setTopbarHeight] = useState<'compact' | 'standard' | 'large'>('standard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const isMountedRef = useRef(true);

  // ИНИЦИАЛИЗАЦИЯ С ТАЙМАУТОМ
  useEffect(() => {
    let cleanup = false;
    isMountedRef.current = true;
    
    // Предотвращаем повторную инициализацию в StrictMode
    if (initialized) {
      console.log('🔄 TopBarProvider: Пропуск повторной инициализации (уже инициализирован)');
      return;
    }
    
    console.log('🎨 TopBarProvider: Глобальная инициализация...');
    
    // Принудительный таймаут для завершения загрузки
    const forceInitTimeout = setTimeout(() => {
      if (!cleanup && isMountedRef.current && !initialized) {
        console.warn('⚠️ TopBarProvider: Принудительное завершение инициализации по таймауту');
        setFallbackNavigation();
        setMounted(true);
        setLoading(false);
        setInitialized(true);
      }
    }, 8000); // 8 секунд таймаут
    
    const initialize = async () => {
      try {
        if (cleanup || !isMountedRef.current) return;
        
        // 1. Проверяем текущую сессию
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && !cleanup && isMountedRef.current) {
            await fetchUserProfile(session.user.id);
          }
        } catch (error) {
          console.warn('🎨 TopBarProvider: Ошибка загрузки профиля:', error);
        }

        // 2. Загружаем навигацию с таймаутом
        if (!cleanup && isMountedRef.current) {
          try {
            await Promise.race([
              fetchNavItems(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Navigation timeout')), 5000)
              )
            ]);
          } catch (error) {
            console.warn('🎨 TopBarProvider: Таймаут/ошибка навигации, используем fallback:', error);
            setFallbackNavigation();
          }
        }

        // 3. Загружаем настройки топбара
        if (!cleanup && isMountedRef.current) {
          try {
            await Promise.race([
              fetchTopbarSettings(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Topbar settings timeout')), 3000)
              )
            ]);
          } catch (error) {
            console.warn('🎨 TopBarProvider: Таймаут настроек топбара:', error);
          }
        }

        if (!cleanup && isMountedRef.current && !initialized) {
          setMounted(true);
          setLoading(false);
          setInitialized(true);
          console.log('✅ TopBarProvider: Глобальная инициализация завершена');
        }
      } catch (error) {
        console.error('❌ TopBarProvider: Ошибка инициализации:', error);
        if (!cleanup && isMountedRef.current && !initialized) {
          setFallbackNavigation();
          setMounted(true);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Запускаем инициализацию
    initialize();

    return () => {
      cleanup = true;
      isMountedRef.current = false;
      clearTimeout(forceInitTimeout);
    };
  }, []); // Пустые зависимости - инициализация только один раз

  // ПОДПИСКА НА АВТОРИЗАЦИЮ (только после инициализации)
  useEffect(() => {
    if (!mounted) return;

    console.log('🔐 TopBarProvider: Подписка на auth события...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;
      
      console.log('🔐 TopBarProvider: Auth событие:', event);
      
      if (event === 'SIGNED_IN' && session) {
        await fetchUserProfile(session.user.id);
        toast.success('Добро пожаловать!');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        toast.success('Вы вышли из системы');
      }
    });

    return () => {
      console.log('🔐 TopBarProvider: Отписка от auth событий');
      subscription.unsubscribe();
    };
  }, [mounted]);

  // ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ
  const fetchUserProfile = async (userId: string) => {
    try {
      if (!isMountedRef.current) return;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: { session } } = await supabase.auth.getSession();
      
      if (isMountedRef.current) {
        setUser({
          id: userId,
          email: session?.user.email || '',
          name: profile?.name || session?.user.user_metadata?.name,
          role: profile?.role,
          avatar: profile?.avatar
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchNavItems = async () => {
    try {
      if (!isMountedRef.current) return;
      
      console.log('🔄 TopBarProvider: Загрузка навигации из API...');
      
      // Добавляем таймаут для API запроса
      const response = await Promise.race([
        getNavigationItems(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Navigation API timeout')), 4000)
        )
      ]);
      
      if (response.data && response.data.length > 0 && isMountedRef.current) {
        const sortedItems = response.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setNavItems(sortedItems);
        console.log('✅ TopBarProvider: Навигация загружена из API:', sortedItems.length, 'элементов');
      } else if (isMountedRef.current) {
        console.log('⚠️ TopBarProvider: Пустой ответ API, используем fallback навигацию');
        setFallbackNavigation();
      }
    } catch (error) {
      console.error('❌ Error fetching navigation:', error);
      if (isMountedRef.current) {
        console.log('⚠️ TopBarProvider: Fallback из-за ошибки/таймаута API');
        setFallbackNavigation();
      }
    }
  };

  const setFallbackNavigation = () => {
    const fallbackItems = [
      { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
      { id: 'events', label: 'Мероприятия', path: '/events', visible: true, order: 1 },
      { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
      { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
      { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
      { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
      { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
    ];
    setNavItems(fallbackItems);
    console.log('✅ TopBarProvider: Fallback навигация установлена:', fallbackItems.length, 'элементов');
  };

  const fetchTopbarSettings = async () => {
    try {
      if (!isMountedRef.current) return;
      
      const response = await getTopbarSettings();
      if (response.data?.height && isMountedRef.current) {
        setTopbarHeight(response.data.height);
      }
    } catch (error) {
      console.error('Error fetching topbar settings:', error);
    }
  };

  // ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ОБНОВЛЕНИЯ
  const refreshNavigation = async () => {
    await fetchNavItems();
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchUserProfile(session.user.id);
    }
  };

  const value: TopBarContextType = {
    navItems,
    topbarHeight,
    user,
    mounted,
    loading,
    refreshNavigation,
    refreshUser
  };

  // Логирование только при изменениях состояния
  const prevState = useRef({ navItemsCount: 0, user: false, mounted: false, loading: true });
  const currentState = { navItemsCount: navItems.length, user: !!user, mounted, loading };
  
  if (JSON.stringify(prevState.current) !== JSON.stringify(currentState)) {
    console.log('🎨 TopBarProvider: Изменение состояния:', currentState);
    prevState.current = currentState;
  }

  return (
    <TopBarContext.Provider value={value}>
      {children}
    </TopBarContext.Provider>
  );
};

export const useTopBar = (): TopBarContextType => {
  const context = useContext(TopBarContext);
  if (context === undefined) {
    throw new Error('useTopBar must be used within a TopBarProvider');
  }
  return context;
};