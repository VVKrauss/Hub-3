// src/contexts/TopBarContext.tsx - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getNavigationItems } from '../api/settings';
import { toast } from 'react-hot-toast';

// Типы данных
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  visible: boolean;
  order: number;
}

export interface TopBarUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

interface TopBarContextType {
  navItems: NavigationItem[];
  topbarHeight: string;
  user: TopBarUser | null;
  mounted: boolean;
  loading: boolean;
  refreshNavigation: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const TopBarContext = createContext<TopBarContextType | undefined>(undefined);

// Константы
const NAVIGATION_CACHE_KEY = 'navigation_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 минут

// Fallback навигация
const fallbackNavigation: NavigationItem[] = [
  { id: '1', label: 'Главная', path: '/', visible: true, order: 1 },
  { id: '2', label: 'События', path: '/events', visible: true, order: 2 },
  { id: '3', label: 'Курсы', path: '/courses', visible: true, order: 3 },
  { id: '4', label: 'Спикеры', path: '/speakers', visible: true, order: 4 },
  { id: '5', label: 'Аренда', path: '/rent', visible: true, order: 5 },
  { id: '6', label: 'Коворкинг', path: '/coworking', visible: true, order: 6 },
  { id: '7', label: 'О нас', path: '/about', visible: true, order: 7 }
];

// Утилиты для кэша
const getNavigationFromCache = (): NavigationItem[] | null => {
  try {
    const cached = localStorage.getItem(NAVIGATION_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Ошибка чтения кэша навигации:', error);
  }
  return null;
};

const setNavigationToCache = (data: NavigationItem[]) => {
  try {
    localStorage.setItem(NAVIGATION_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Ошибка записи кэша навигации:', error);
  }
};

export const TopBarProvider = ({ children }: { children: ReactNode }) => {
  // Состояние
  const [navItems, setNavItems] = useState<NavigationItem[]>(fallbackNavigation);
  const [topbarHeight] = useState('normal');
  const [user, setUser] = useState<TopBarUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Refs для управления состоянием
  const isMountedRef = useRef(true);
  const initializationCompleted = useRef(false);

  // Используем данные из AuthContext вместо собственных проверок
  const { user: authUser, loading: authLoading, isQuickReturn } = useAuth();

  // Синхронизируем пользователя с AuthContext
  useEffect(() => {
    if (!authLoading && !isQuickReturn) {
      if (authUser) {
        // Если есть пользователь в AuthContext, получаем его расширенные данные
        fetchUserProfile(authUser.id);
      } else {
        // Если нет пользователя в AuthContext, очищаем локального
        setUser(null);
      }
    }
  }, [authUser, authLoading, isQuickReturn]);

  // Основная инициализация (ТОЛЬКО навигация)
  useEffect(() => {
    let cleanup = false;

    const quickInit = async () => {
      try {
        console.log('🎨 TopBarProvider: Быстрая инициализация...');

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

        // 2. Завершаем инициализацию
        if (!cleanup && isMountedRef.current) {
          setMounted(true);
          setLoading(false);
          initializationCompleted.current = true;
          console.log('✅ TopBarProvider: Быстрая инициализация завершена');
        }

        // 3. Обновляем навигацию в фоне (только если не было кэша)
        if (!cachedNav && !cleanup && isMountedRef.current) {
          fetchNavItemsInBackground();
        }

      } catch (error) {
        console.error('❌ TopBarProvider: Ошибка быстрой инициализации:', error);
        if (!cleanup && isMountedRef.current) {
          setNavItems(fallbackNavigation);
          setMounted(true);
          setLoading(false);
          initializationCompleted.current = true;
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
          setTimeout(() => reject(new Error('Navigation timeout')), 8000)
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

  // Загрузка расширенного профиля пользователя
  const fetchUserProfile = async (userId: string) => {
    try {
      if (!isMountedRef.current) return;
      
      const { data: profile, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Profile timeout')), 5000)
        )
      ]);

      if (error && error.code !== 'PGRST116') { // PGRST116 = не найдено (это нормально)
        console.warn('⚠️ TopBarProvider: Ошибка загрузки профиля:', error);
      }

      if (isMountedRef.current && authUser) {
        setUser({
          id: userId,
          email: authUser.email,
          name: profile?.name || authUser.name,
          role: profile?.role,
          avatar: profile?.avatar
        });
        console.log('✅ TopBarProvider: Профиль пользователя загружен');
      }
    } catch (error) {
      console.warn('⚠️ TopBarProvider: Таймаут загрузки профиля:', error);
      // При ошибке используем базовые данные из AuthContext
      if (isMountedRef.current && authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: undefined,
          avatar: undefined
        });
      }
    }
  };

  // ПОДПИСКА НА АВТОРИЗАЦИЮ (упрощенная)
  useEffect(() => {
    if (!mounted) return;

    console.log('🔐 TopBarProvider: Подписка на auth события...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;
      
      console.log('🔐 TopBarProvider: Auth событие:', event);
      
      if (event === 'SIGNED_IN' && session) {
        // Данные пользователя уже будут обновлены через AuthContext
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

  // ПУБЛИЧНЫЕ МЕТОДЫ
  const refreshNavigation = async () => {
    console.log('🔄 TopBarProvider: Принудительное обновление навигации');
    localStorage.removeItem(NAVIGATION_CACHE_KEY);
    await fetchNavItemsInBackground();
  };

  const refreshUser = async () => {
    console.log('🔄 TopBarProvider: Принудительное обновление пользователя');
    if (authUser) {
      await fetchUserProfile(authUser.id);
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

  // Минимальное логирование состояния
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