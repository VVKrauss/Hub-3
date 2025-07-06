// src/components/layout/TopBar.tsx
// ПОЛНОСТЬЮ ОПТИМИЗИРОВАННАЯ ВЕРСИЯ для устранения проблем загрузки

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getNavigationItems, getTopbarSettings } from '../../api/settings';
import Logo from '../ui/Logo';
import { useTheme } from '../../contexts/ThemeContext';
import LoginModal from '../auth/LoginModal';
import UserProfileDropdown from '../ui/UserProfileDropdown';

interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order: number;
  badge?: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

// Константы вынесены наружу для избежания пересоздания
const FALLBACK_NAV_ITEMS = [
  { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
  { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
  { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 }, // ← ИСПРАВЛЕНО: курсы добавлены!
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
  { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
];

const INITIALIZATION_TIMEOUT = 8000; // 8 секунд максимум на инициализацию

const TopBar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  // Состояния с осторожным управлением
  const [navItems, setNavItems] = useState<NavItem[]>(FALLBACK_NAV_ITEMS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [topbarHeight, setTopbarHeight] = useState<'compact' | 'standard' | 'large'>('standard');
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Рефы для управления состоянием компонента
  const menuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const initializationAttempted = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Мемоизированные значения для оптимизации
  const visibleNavItems = useMemo(() => 
    navItems.filter(item => item.visible),
    [navItems]
  );

  const topbarHeightClass = useMemo(() => 
    `topbar-${topbarHeight}`,
    [topbarHeight]
  );

  // Callback для безопасного обновления состояния
  const safeSetState = useCallback((setter: Function) => {
    if (isMountedRef.current) {
      setter();
    }
  }, []);

  // Функция инициализации с таймаутом и обработкой ошибок
  const initialize = useCallback(async () => {
    if (initializationAttempted.current || !isMountedRef.current) return;
    
    initializationAttempted.current = true;
    
    try {
      console.log('🚀 TopBar: Начало инициализации...');
      
      // Устанавливаем таймаут безопасности
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && !initialized) {
          console.warn('⚠️ TopBar: Таймаут инициализации, используем fallback');
          safeSetState(() => {
            setNavItems(FALLBACK_NAV_ITEMS);
            setLoading(false);
            setInitialized(true);
            setError('Таймаут загрузки настроек');
          });
        }
      }, INITIALIZATION_TIMEOUT);

      const initPromises = [];

      // 1. Проверка сессии (без await для ускорения)
      initPromises.push(
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && isMountedRef.current) {
            return fetchUserProfile(session.user.id);
          }
        }).catch(err => console.warn('Auth check failed:', err))
      );

      // 2. Загрузка навигации
      initPromises.push(
        fetchNavItems().catch(err => {
          console.warn('Navigation fetch failed:', err);
          safeSetState(() => setNavItems(FALLBACK_NAV_ITEMS));
        })
      );

      // 3. Загрузка настроек топбара
      initPromises.push(
        fetchTopbarSettings().catch(err => {
          console.warn('Topbar settings fetch failed:', err);
          safeSetState(() => setTopbarHeight('standard'));
        })
      );

      // Ждем завершения всех запросов (с таймаутом)
      await Promise.allSettled(initPromises);

      if (isMountedRef.current) {
        clearTimeout(timeoutRef.current);
        safeSetState(() => {
          setLoading(false);
          setInitialized(true);
        });
        console.log('✅ TopBar: Инициализация завершена успешно');
      }

    } catch (error) {
      console.error('❌ TopBar: Критическая ошибка инициализации:', error);
      
      if (isMountedRef.current) {
        clearTimeout(timeoutRef.current);
        safeSetState(() => {
          setNavItems(FALLBACK_NAV_ITEMS);
          setLoading(false);
          setInitialized(true);
          setError(`Ошибка инициализации: ${error.message}`);
        });
      }
    }
  }, [safeSetState, initialized]);

  // Основной useEffect инициализации - ТОЛЬКО ОДИН РАЗ
  useEffect(() => {
    isMountedRef.current = true;
    initialize();

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // КРИТИЧНО: пустой массив зависимостей!

  // Подписка на авторизацию - ТОЛЬКО после инициализации
  useEffect(() => {
    if (!initialized) return;

    let subscription: any;
    
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMountedRef.current) return;
        
        console.log('🔄 TopBar: Auth событие:', event);
        
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user.id);
          safeSetState(() => setLoginModalOpen(false));
        } else if (event === 'SIGNED_OUT') {
          safeSetState(() => setUser(null));
        }
      });
      
      subscription = data.subscription;
    } catch (error) {
      console.error('Auth subscription failed:', error);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [initialized, safeSetState]);

  // Обработчик клика вне меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Функции загрузки данных с улучшенной обработкой ошибок
  const fetchUserProfile = async (userId: string) => {
    try {
      if (!isMountedRef.current) return;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Игнорируем "not found"
        throw error;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (isMountedRef.current) {
        safeSetState(() => setUser({
          id: userId,
          email: session?.user.email || '',
          name: profile?.name || session?.user.user_metadata?.name,
          role: profile?.role,
          avatar: profile?.avatar
        }));
      }
    } catch (error) {
      console.warn('User profile fetch failed:', error);
      // Не блокируем работу компонента из-за ошибки профиля
    }
  };

  const fetchNavItems = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await getNavigationItems();
      
      if (response.data && response.data.length > 0 && isMountedRef.current) {
        const sortedItems = response.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        safeSetState(() => setNavItems(sortedItems));
      } else if (isMountedRef.current) {
        safeSetState(() => setNavItems(FALLBACK_NAV_ITEMS));
      }
    } catch (error) {
      console.warn('Navigation fetch failed:', error);
      if (isMountedRef.current) {
        safeSetState(() => setNavItems(FALLBACK_NAV_ITEMS));
      }
      throw error; // Перебрасываем для Promise.allSettled
    }
  };

  const fetchTopbarSettings = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await getTopbarSettings();
      if (response.data?.height && isMountedRef.current) {
        safeSetState(() => setTopbarHeight(response.data.height));
      }
    } catch (error) {
      console.warn('Topbar settings fetch failed:', error);
      throw error; // Перебрасываем для Promise.allSettled
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Показываем упрощенную версию только пока ДЕЙСТВИТЕЛЬНО загружается
  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-white dark:bg-dark-900 shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between py-3">
          <Link to="/" className="flex items-center">
            <Logo className="h-10 w-auto" inverted={theme === 'dark'} />
          </Link>
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 animate-pulse bg-gray-300 rounded"></div>
            {error && (
              <span className="text-xs text-red-500 max-w-xs truncate" title={error}>
                {error}
              </span>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-50 bg-white dark:bg-dark-900 shadow-sm transition-colors duration-200 ${topbarHeightClass}`}>
      <div className="container mx-auto px-4 flex items-center justify-between py-3">
        <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
          <Logo className="h-10 w-auto" inverted={theme === 'dark'} />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
          {visibleNavItems.map(item => (
            <Link 
              key={item.id}
              to={item.path} 
              className={`font-medium relative py-4 transition-colors duration-200 ${
                location.pathname === item.path 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              {item.label}
              {item.badge && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {location.pathname === item.path && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"></div>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Side - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {user ? (
            <UserProfileDropdown 
              user={user} 
              onLogout={handleLogout}
            />
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Войти
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Меню"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div 
          ref={menuRef}
          className="md:hidden bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-dark-600"
        >
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {visibleNavItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-3 px-4 rounded-lg transition-colors duration-200 ${
                  location.pathname === item.path 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-6 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between py-3 px-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="font-medium">Тема</span>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Mobile Auth */}
            {user ? (
              <div className="border-t border-gray-200 dark:border-dark-600 pt-4 mt-4">
                <div className="flex items-center gap-3 py-3 px-4">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name || 'Пользователь'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {(user.name || user.email)[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.name || 'Пользователь'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 px-4 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLoginModalOpen(true);
                }}
                className="w-full mt-4 btn-primary flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Войти
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Login Modal */}
      {loginModalOpen && (
        <LoginModal 
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
        />
      )}

      {/* Debug Info (только в development) */}
      {process.env.NODE_ENV === 'development' && error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 text-xs">
          <p className="text-yellow-700">TopBar Debug: {error}</p>
          <p className="text-yellow-600">
            Навигация: {navItems.length} элементов, 
            Видимых: {visibleNavItems.length}, 
            Инициализирован: {initialized ? 'Да' : 'Нет'}
          </p>
        </div>
      )}
    </header>
  );
};

export default TopBar;// src/components/layout/TopBar.tsx
// ПОЛНОСТЬЮ ОПТИМИЗИРОВАННАЯ ВЕРСИЯ для устранения проблем загрузки

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getNavigationItems, getTopbarSettings } from '../../api/settings';
import Logo from '../ui/Logo';
import { useTheme } from '../../contexts/ThemeContext';
import LoginModal from '../auth/LoginModal';
import UserProfileDropdown from '../ui/UserProfileDropdown';

interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order: number;
  badge?: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

// Константы вынесены наружу для избежания пересоздания
const FALLBACK_NAV_ITEMS = [
  { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
  { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
  { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 }, // ← ИСПРАВЛЕНО: курсы добавлены!
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
  { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
];

const INITIALIZATION_TIMEOUT = 8000; // 8 секунд максимум на инициализацию

const TopBar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  // Состояния с осторожным управлением
  const [navItems, setNavItems] = useState<NavItem[]>(FALLBACK_NAV_ITEMS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [topbarHeight, setTopbarHeight] = useState<'compact' | 'standard' | 'large'>('standard');
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Рефы для управления состоянием компонента
  const menuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const initializationAttempted = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Мемоизированные значения для оптимизации
  const visibleNavItems = useMemo(() => 
    navItems.filter(item => item.visible),
    [navItems]
  );

  const topbarHeightClass = useMemo(() => 
    `topbar-${topbarHeight}`,
    [topbarHeight]
  );

  // Callback для безопасного обновления состояния
  const safeSetState = useCallback((setter: Function) => {
    if (isMountedRef.current) {
      setter();
    }
  }, []);

  // Функция инициализации с таймаутом и обработкой ошибок
  const initialize = useCallback(async () => {
    if (initializationAttempted.current || !isMountedRef.current) return;
    
    initializationAttempted.current = true;
    
    try {
      console.log('🚀 TopBar: Начало инициализации...');
      
      // Устанавливаем таймаут безопасности
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && !initialized) {
          console.warn('⚠️ TopBar: Таймаут инициализации, используем fallback');
          safeSetState(() => {
            setNavItems(FALLBACK_NAV_ITEMS);
            setLoading(false);
            setInitialized(true);
            setError('Таймаут загрузки настроек');
          });
        }
      }, INITIALIZATION_TIMEOUT);

      const initPromises = [];

      // 1. Проверка сессии (без await для ускорения)
      initPromises.push(
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && isMountedRef.current) {
            return fetchUserProfile(session.user.id);
          }
        }).catch(err => console.warn('Auth check failed:', err))
      );

      // 2. Загрузка навигации
      initPromises.push(
        fetchNavItems().catch(err => {
          console.warn('Navigation fetch failed:', err);
          safeSetState(() => setNavItems(FALLBACK_NAV_ITEMS));
        })
      );

      // 3. Загрузка настроек топбара
      initPromises.push(
        fetchTopbarSettings().catch(err => {
          console.warn('Topbar settings fetch failed:', err);
          safeSetState(() => setTopbarHeight('standard'));
        })
      );

      // Ждем завершения всех запросов (с таймаутом)
      await Promise.allSettled(initPromises);

      if (isMountedRef.current) {
        clearTimeout(timeoutRef.current);
        safeSetState(() => {
          setLoading(false);
          setInitialized(true);
        });
        console.log('✅ TopBar: Инициализация завершена успешно');
      }

    } catch (error) {
      console.error('❌ TopBar: Критическая ошибка инициализации:', error);
      
      if (isMountedRef.current) {
        clearTimeout(timeoutRef.current);
        safeSetState(() => {
          setNavItems(FALLBACK_NAV_ITEMS);
          setLoading(false);
          setInitialized(true);
          setError(`Ошибка инициализации: ${error.message}`);
        });
      }
    }
  }, [safeSetState, initialized]);

  // Основной useEffect инициализации - ТОЛЬКО ОДИН РАЗ
  useEffect(() => {
    isMountedRef.current = true;
    initialize();

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // КРИТИЧНО: пустой массив зависимостей!

  // Подписка на авторизацию - ТОЛЬКО после инициализации
  useEffect(() => {
    if (!initialized) return;

    let subscription: any;
    
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMountedRef.current) return;
        
        console.log('🔄 TopBar: Auth событие:', event);
        
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user.id);
          safeSetState(() => setLoginModalOpen(false));
        } else if (event === 'SIGNED_OUT') {
          safeSetState(() => setUser(null));
        }
      });
      
      subscription = data.subscription;
    } catch (error) {
      console.error('Auth subscription failed:', error);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [initialized, safeSetState]);

  // Обработчик клика вне меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Функции загрузки данных с улучшенной обработкой ошибок
  const fetchUserProfile = async (userId: string) => {
    try {
      if (!isMountedRef.current) return;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Игнорируем "not found"
        throw error;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (isMountedRef.current) {
        safeSetState(() => setUser({
          id: userId,
          email: session?.user.email || '',
          name: profile?.name || session?.user.user_metadata?.name,
          role: profile?.role,
          avatar: profile?.avatar
        }));
      }
    } catch (error) {
      console.warn('User profile fetch failed:', error);
      // Не блокируем работу компонента из-за ошибки профиля
    }
  };

  const fetchNavItems = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await getNavigationItems();
      
      if (response.data && response.data.length > 0 && isMountedRef.current) {
        const sortedItems = response.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        safeSetState(() => setNavItems(sortedItems));
      } else if (isMountedRef.current) {
        safeSetState(() => setNavItems(FALLBACK_NAV_ITEMS));
      }
    } catch (error) {
      console.warn('Navigation fetch failed:', error);
      if (isMountedRef.current) {
        safeSetState(() => setNavItems(FALLBACK_NAV_ITEMS));
      }
      throw error; // Перебрасываем для Promise.allSettled
    }
  };

  const fetchTopbarSettings = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await getTopbarSettings();
      if (response.data?.height && isMountedRef.current) {
        safeSetState(() => setTopbarHeight(response.data.height));
      }
    } catch (error) {
      console.warn('Topbar settings fetch failed:', error);
      throw error; // Перебрасываем для Promise.allSettled
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Показываем упрощенную версию только пока ДЕЙСТВИТЕЛЬНО загружается
  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-white dark:bg-dark-900 shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between py-3">
          <Link to="/" className="flex items-center">
            <Logo className="h-10 w-auto" inverted={theme === 'dark'} />
          </Link>
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 animate-pulse bg-gray-300 rounded"></div>
            {error && (
              <span className="text-xs text-red-500 max-w-xs truncate" title={error}>
                {error}
              </span>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-50 bg-white dark:bg-dark-900 shadow-sm transition-colors duration-200 ${topbarHeightClass}`}>
      <div className="container mx-auto px-4 flex items-center justify-between py-3">
        <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
          <Logo className="h-10 w-auto" inverted={theme === 'dark'} />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
          {visibleNavItems.map(item => (
            <Link 
              key={item.id}
              to={item.path} 
              className={`font-medium relative py-4 transition-colors duration-200 ${
                location.pathname === item.path 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              {item.label}
              {item.badge && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {location.pathname === item.path && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"></div>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Side - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {user ? (
            <UserProfileDropdown 
              user={user} 
              onLogout={handleLogout}
            />
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Войти
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Меню"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div 
          ref={menuRef}
          className="md:hidden bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-dark-600"
        >
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {visibleNavItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-3 px-4 rounded-lg transition-colors duration-200 ${
                  location.pathname === item.path 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-6 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between py-3 px-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="font-medium">Тема</span>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Mobile Auth */}
            {user ? (
              <div className="border-t border-gray-200 dark:border-dark-600 pt-4 mt-4">
                <div className="flex items-center gap-3 py-3 px-4">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name || 'Пользователь'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {(user.name || user.email)[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.name || 'Пользователь'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 px-4 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLoginModalOpen(true);
                }}
                className="w-full mt-4 btn-primary flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Войти
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Login Modal */}
      {loginModalOpen && (
        <LoginModal 
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
        />
      )}

      {/* Debug Info (только в development) */}
      {process.env.NODE_ENV === 'development' && error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 text-xs">
          <p className="text-yellow-700">TopBar Debug: {error}</p>
          <p className="text-yellow-600">
            Навигация: {navItems.length} элементов, 
            Видимых: {visibleNavItems.length}, 
            Инициализирован: {initialized ? 'Да' : 'Нет'}
          </p>
        </div>
      )}
    </header>
  );
};

export default TopBar;