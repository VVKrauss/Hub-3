// src/components/layout/TopBar.tsx  
// ИСПРАВЛЕННАЯ ВЕРСИЯ без бесконечных циклов

import { useState, useEffect, useRef } from 'react';
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
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // ИСПРАВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ - только один раз
  useEffect(() => {
    isMountedRef.current = true;
    
    const initialize = async () => {
      try {
        if (!isMountedRef.current) return;
        
        console.log('TopBar: Инициализация...');
        
        // 1. Проверяем текущую сессию
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMountedRef.current) {
          await fetchUserProfile(session.user.id);
        }

        // 2. Загружаем навигацию
        if (isMountedRef.current) {
          await fetchNavItems();
        }

        // 3. Загружаем настройки топбара
        if (isMountedRef.current) {
          await fetchTopbarSettings();
        }

        if (isMountedRef.current) {
          setMounted(true);
          setLoading(false);
          console.log('TopBar: Инициализация завершена');
        }
      } catch (error) {
        console.error('TopBar: Ошибка инициализации:', error);
        if (isMountedRef.current) {
          setFallbackNavigation();
          setMounted(true);
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // КРИТИЧНО: пустой массив зависимостей

  // ОТДЕЛЬНЫЙ useEffect для подписки на авторизацию
  useEffect(() => {
    if (!mounted) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;
      
      console.log('TopBar: Auth событие:', event);
      
      if (event === 'SIGNED_IN' && session) {
        await fetchUserProfile(session.user.id);
        setLoginModalOpen(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [mounted]); // Запускаем только после инициализации

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
      
      const response = await getNavigationItems();
      
      if (response.data && response.data.length > 0 && isMountedRef.current) {
        const sortedItems = response.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setNavItems(sortedItems);
      } else if (isMountedRef.current) {
        setFallbackNavigation();
      }
    } catch (error) {
      console.error('Error fetching navigation:', error);
      if (isMountedRef.current) {
        setFallbackNavigation();
      }
    }
  };

  const setFallbackNavigation = () => {
    const fallbackItems = [
      { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
      { id: 'events', label: 'Мероприятия', path: '/events', visible: true, order: 1 },
      { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 2 },
      { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 3 },
      { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 4 },
      { id: 'about', label: 'О нас', path: '/about', visible: true, order: 5 }
    ];
    setNavItems(fallbackItems);
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Показываем упрощенную версию пока загружается
  if (loading || !mounted) {
    return (
      <header className="sticky top-0 z-50 bg-white dark:bg-dark-900 shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between py-3">
          <Link to="/" className="flex items-center">
            <Logo className="h-10 w-auto" inverted={theme === 'dark'} />
          </Link>
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 animate-pulse bg-gray-300 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  const visibleNavItems = navItems.filter(item => item.visible);
  const topbarHeightClass = `topbar-${topbarHeight}`;

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
            <UserProfileDropdown user={user} onLogout={handleLogout} />
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Войти</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Открыть меню"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div ref={menuRef} className="md:hidden bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2 space-y-1">
            {visibleNavItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  location.pathname === item.path 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {item.label}
                {item.badge && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
              <button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 mr-3" /> : <Moon className="h-5 w-5 mr-3" />}
                {theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
              </button>
              
              {user ? (
                <div className="space-y-1">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Профиль
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Админ панель
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Выйти
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  <LogIn className="h-5 w-5 mr-3" />
                  Войти
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </header>
  );
};

export default TopBar; 