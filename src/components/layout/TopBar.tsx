// src/components/layout/TopBar.tsx - ИСПРАВЛЕНО от бесконечных циклов
import { useState, useEffect, useRef, useCallback } from 'react';
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

const TopBar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [topbarHeight, setTopbarHeight] = useState<'compact' | 'standard' | 'large'>('standard');
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const authListenerRef = useRef<any>(null);

  // Безопасная установка состояния
  const safeSetState = useCallback((setter: () => void) => {
    if (mountedRef.current) {
      setter();
    }
  }, []);

  // Фоллбэк навигация
  const setFallbackNavigation = useCallback(() => {
    const fallbackItems = [
      { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
      { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
      { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
      { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
      { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
      { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
      { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
    ];
    safeSetState(() => setNavItems(fallbackItems));
  }, [safeSetState]);

  // Загрузка профиля пользователя
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, avatar')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const session = await supabase.auth.getSession();
        const userWithEmail = {
          ...data,
          email: session.data.session?.user?.email || ''
        };
        safeSetState(() => setUser(userWithEmail));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      safeSetState(() => setUser(null));
    }
  }, [safeSetState]);

  // Загрузка навигационных элементов
  const fetchNavItems = useCallback(async () => {
    try {
      const response = await getNavigationItems();
      if (response.data && response.data.length > 0) {
        const sortedItems = response.data
          .filter(item => item.visible)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        safeSetState(() => setNavItems(sortedItems));
      } else {
        setFallbackNavigation();
      }
    } catch (error) {
      console.error('Error fetching navigation:', error);
      safeSetState(() => setError('Ошибка загрузки навигации'));
      setFallbackNavigation();
    }
  }, [safeSetState, setFallbackNavigation]);

  // Загрузка настроек топбара
  const fetchTopbarSettings = useCallback(async () => {
    try {
      const response = await getTopbarSettings();
      if (response.data?.height) {
        safeSetState(() => setTopbarHeight(response.data.height));
      }
    } catch (error) {
      console.error('Error fetching topbar settings:', error);
      // Не критичная ошибка, используем дефолтные настройки
    }
  }, [safeSetState]);

  // Инициализация компонента
  useEffect(() => {
    let cleanup = false;

    const initialize = async () => {
      if (cleanup || !mountedRef.current) return;

      try {
        // Проверяем текущую сессию
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }

        if (session?.user && !cleanup && mountedRef.current) {
          await fetchUserProfile(session.user.id);
        }

        // Загружаем навигацию и настройки
        if (!cleanup && mountedRef.current) {
          await Promise.all([
            fetchNavItems(),
            fetchTopbarSettings()
          ]);
        }

        if (!cleanup && mountedRef.current) {
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing TopBar:', error);
        if (!cleanup && mountedRef.current) {
          setError('Ошибка инициализации');
          setFallbackNavigation();
          setInitialized(true);
        }
      }
    };

    initialize();

    return () => {
      cleanup = true;
    };
  }, []); // Пустой массив зависимостей - выполняется только один раз

  // Обработчик изменения авторизации
  useEffect(() => {
    if (!initialized) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          }
          break;
        case 'SIGNED_OUT':
          safeSetState(() => setUser(null));
          break;
        case 'TOKEN_REFRESHED':
          // Не требует дополнительных действий
          break;
        default:
          break;
      }
    });

    authListenerRef.current = subscription;

    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
    };
  }, [initialized, fetchUserProfile, safeSetState]);

  // Обработчик клика вне мобильного меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const visibleNavItems = navItems.filter(item => item.visible);

  const topbarHeightClass = {
    'compact': 'h-12',
    'standard': 'h-16', 
    'large': 'h-20'
  }[topbarHeight];

  // Показываем заглушку во время инициализации
  if (!initialized) {
    return (
      <header className={`bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 ${topbarHeightClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="animate-pulse">
              <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className={`bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 ${topbarHeightClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            {/* Логотип */}
            <div className="flex items-center">
              <Logo />
            </div>

            {/* Основная навигация (десктоп) */}
            <nav className="hidden md:flex space-x-8">
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                    }`}
                  >
                    {item.label}
                    {item.badge && item.badge > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Правая часть */}
            <div className="flex items-center space-x-4">
              {/* Переключатель темы */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Переключить тему"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Пользователь или кнопка входа */}
              {user ? (
                <UserProfileDropdown user={user} onLogout={handleLogout} />
              ) : (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Войти
                </button>
              )}

              {/* Мобильное меню */}
              <div className="md:hidden" ref={menuRef}>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Меню"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Мобильная навигация */}
                {mobileMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      {visibleNavItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.id}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              isActive
                                ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {item.label}
                            {item.badge && item.badge > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Модальное окно входа */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
};

export default TopBar;