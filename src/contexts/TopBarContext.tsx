// src/contexts/TopBarContext.tsx - Исправленная версия
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

  // ИНИЦИАЛИЗАЦИЯ ТОЛЬКО ОДИН РАЗ
  useEffect(() => {
    let cleanup = false;
    isMountedRef.current = true;
    
    // Предотвращаем повторную инициализацию в StrictMode
    if (initialized) {
      console.log('🔄 TopBarProvider: Пропуск повторной инициализации (уже инициализирован)');
      return;
    }
    
    console.log('🎨 TopBarProvider: Глобальная инициализация...');
    
    const initialize = async () => {
      try {
        if (cleanup || !isMountedRef.current) return;
        
        // 1. Проверяем текущую сессию
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !cleanup && isMountedRef.current) {
          await fetchUserProfile(session.user.id);
        }

        // 2. Загружаем навигацию
        if (!cleanup && isMountedRef.current) {
          await fetchNavItems();
        }

        // 3. Загружаем настройки топбара
        if (!cleanup && isMountedRef.current) {
          await fetchTopbarSettings();
        }

        if (!cleanup && isMountedRef.current) {
          setMounted(true);
          setLoading(false);
          setInitialized(true);
          console.log('✅ TopBarProvider: Глобальная инициализация завершена');
        }
      } catch (error) {
        console.error('❌ TopBarProvider: Ошибка инициализации:', error);
        if (!cleanup && isMountedRef.current) {
          setFallbackNavigation();
          setMounted(true);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initialize();

    return () => {
      cleanup = true;
      isMountedRef.current = false;
    };
  }, []); // Пустые зависимости - инициализация только один раз

  // ПОДПИСКА НА АВТОРИЗАЦИЮ
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
      const response = await getNavigationItems();
      
      if (response.data && response.data.length > 0 && isMountedRef.current) {
        const sortedItems = response.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setNavItems(sortedItems);
        console.log('✅ TopBarProvider: Навигация загружена из API:', sortedItems);
      } else if (isMountedRef.current) {
        console.log('⚠️ TopBarProvider: Использование fallback навигации');
        setFallbackNavigation();
      }
    } catch (error) {
      console.error('❌ Error fetching navigation:', error);
      if (isMountedRef.current) {
        console.log('⚠️ TopBarProvider: Fallback из-за ошибки API');
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
    console.log('✅ TopBarProvider: Fallback навигация установлена:', fallbackItems);
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

  console.log('🎨 TopBarProvider: Текущее состояние:', {
    navItemsCount: navItems.length,
    user: !!user,
    mounted,
    loading
  });

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