// src/contexts/TopBarContext.tsx - Версия с кэшированием навигации
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

// Кэш для навигации
const NAVIGATION_CACHE_KEY = 'topbar_navigation_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

const getNavigationFromCache = (): NavItem[] | null => {
  try {
    const cached = localStorage.getItem(NAVIGATION_CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Проверяем, не истек ли кэш
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(NAVIGATION_CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

const setNavigationToCache = (navItems: NavItem[]) => {
  try {
    const cacheData = {
      data: navItems,
      timestamp: Date.now()
    };
    localStorage.setItem(NAVIGATION_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Не удалось сохранить навигацию в кэш:', error);
  }
};

export const TopBarProvider = ({ children }: { children: ReactNode }) => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [topbarHeight, setTopbarHeight] = useState<'compact' | 'standard' | 'large'>('standard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const isMountedRef = useRef(true);

  // Fallback навигация
  const fallbackNavigation = [
    { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
    { id: 'events', label: 'Мероприятия', path: '/events', visible: true, order: 1 },
    { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
    { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
    { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
    { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
    { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
  ];

  // БЫСТРАЯ ИНИЦИАЛИЗАЦИЯ
  useEffect(() => {
    let cleanup = false;
    isMountedRef.current = true;
    
    if (initialized) {
      console.log('🔄 TopBarProvider: Пропуск повторной инициализации');
      return;
    }
    
    console.log('🎨 TopBarProvider: Быстрая инициализация...');
    
    const quickInit = async () => {
      try {
        // 1. Сразу загружаем навигацию из кэша или используем fallback
        const cachedNav = getNavigationFromCache();
        if (cachedNav && cachedNav.length > 0) {
          console.log('✅ TopBarProvider: Навигация загружена из кэша:', cachedNav.length, 'элементов');
          setNavItems(cachedNav);
        } else {
          console.log('⚠️ TopBarProvider: Используем fallback навигацию');
          setNavItems(fallbackNavigation);
          setNavigationToCache(fallbackNavigation);
        }

        // 2. Проверяем авторизацию (быстро)
        if (!cleanup && isMountedRef.current) {
          try {
            const { data: { session } } = await Promise.race([
              supabase.auth.getSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 2000))
            ]);
            
            if (session && session.user) {
              // Загружаем профиль в фоне, не блокируя UI
              fetchUserProfile(session.user.id);
            }
          } catch (error) {
            console.warn('🎨 TopBarProvider: Ошибка быстрой проверки авторизации:', error);
          }
        }

        // 3. Завершаем инициализацию
        if (!cleanup && isMountedRef.current) {
          setMounted(true);
          setLoading(false);
          setInitialized(true);
          console.log('✅ TopBarProvider: Быстрая инициализация завершена');
        }

        // 4. Обновляем навигацию в фоне (только если не было кэша)
        if (!cachedNav && !cleanup && isMountedRef.current) {
          fetchNavItemsInBackground();
        }

      } catch (error) {
        console.error('❌ TopBarProvider: Ошибка быстрой инициализации:', error);
        if (!cleanup && isMountedRef.current) {
          setNavItems(fallbackNavigation);
          setMounted(true);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    quickInit();

    return () => {
      cleanup = true;
      isMountedRef.current = false;
    };
  }, []);

  // Фоновая загрузка навигации
  const fetchNavItemsInBackground = async () => {
    try {
      console.log('🔄 TopBarProvider: Фоновое обновление навигации...');
      
      const response = await Promise.race([
        getNavigationItems(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Background nav timeout')), 10000)
        )
      ]);
      
      if (response.data && response.data.length > 0 && isMountedRef.current) {
        const sortedItems = response.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setNavItems(sortedItems);
        setNavigationToCache(sortedItems);
        console.log('✅ TopBarProvider: Навигация обновлена в фоне:', sortedItems.length, 'элементов');
      }
    } catch (error) {
      console.warn('⚠️ TopBarProvider: Ошибка фонового обновления навигации:', error);
      // Не меняем navItems при ошибке - оставляем текущие
    }
  };

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

  // Загрузка профиля пользователя
  const fetchUserProfile = async (userId: string) => {
    try {
      if (!isMountedRef.current) return;
      
      const { data: profile, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Profile timeout')), 5000)
        )
      ]);

      if (error) {
        console.warn('Ошибка загрузки профиля:', error);
      }

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
      console.error('Ошибка получения профиля пользователя:', error);
    }
  };

  // ПУБЛИЧНЫЕ МЕТОДЫ
  const refreshNavigation = async () => {
    // Очищаем кэш и перезагружаем
    localStorage.removeItem(NAVIGATION_CACHE_KEY);
    await fetchNavItemsInBackground();
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

  // Минимальное логирование
  const prevStateRef = useRef({ navItemsCount: 0, user: false, mounted: false, loading: true });
  const currentState = { navItemsCount: navItems.length, user: !!user, mounted, loading };
  
  if (JSON.stringify(prevStateRef.current) !== JSON.stringify(currentState)) {
    console.log('🎨 TopBarProvider: Состояние:', currentState);
    prevStateRef.current = currentState;
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