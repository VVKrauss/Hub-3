// src/components/layout/TopBar.tsx - ПОЛНАЯ ВЕРСИЯ с исправлением бесконечного цикла
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // ИСПРАВЛЕННЫЙ useEffect - выполняется только один раз
  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;
    
    const initialize = async () => {
      if (!isMounted) return;
      
      try {
        console.log('TopBar: Инициализация...');
        
        // Проверяем пользователя
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          console.log('TopBar: Загружаем профиль пользователя');
          await fetchUserProfile(session.user.id);
        }

        // Загружаем навигацию
        if (isMounted) {
          console.log('TopBar: Загружаем навигацию');
          await fetchNavItems();
        }

        // Загружаем настройки топбара
        if (isMounted) {
          console.log('TopBar: Загружаем настройки топбара');
          await fetchTopbarSettings();
        }

        if (isMounted) {
          console.log('TopBar: Инициализация завершена');
          setMounted(true);
        }
      } catch (error) {
        console.error('TopBar: Ошибка инициализации:', error);
        if (isMounted) {
          setFallbackNavigation();
          setMounted(true);
        }
      }
    };

    // Настраиваем подписку на изменения авторизации
    const setupAuthListener = () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        
        console.log('TopBar: Auth событие:', event);
        
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user.id);
          setLoginModalOpen(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });
      
      authSubscription = subscription;
    };

    // Обработчик клика вне меню
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    // Инициализируем все
    initialize();
    setupAuthListener();
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup функция
    return () => {
      console.log('TopBar: Очистка ресурсов');
      isMounted = false;
      
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // ВАЖНО: пустой массив зависимостей - выполняется только один раз!

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: { session } } = await supabase.auth.getSession();
      
      setUser({
        id: userId,
        email: session?.user.email || '',
        name: profile?.name || session?.user.user_metadata?.name,
        role: profile?.role,
        avatar: profile?.avatar
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchNavItems = async () => {
    try {
      const response = await getNavigationItems();
      
      if (response.data && response.data.length > 0) {
        const sortedItems = response.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setNavItems(sortedItems);
      } else {
        setFallbackNavigation();
      }
    } catch (error) {
      console.error('Error fetching navigation:', error);
      setFallbackNavigation();
    }
  };

  const setFallbackNavigation = () => {
    const fallbackItems = [
      { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
      { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
      { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
      { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
      { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
      { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
      { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
    ];
    setNavItems(fallbackItems);
  };

  const fetchTopbarSettings = async () => {
    try {
      const response = await getTopbarSettings();
      if (response.data?.height) {
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

  const visibleNavItems = navItems.filter(item => item.visible);

  // Определяем класс высоты топбара
  const topbarHeightClass = `topbar-${topbarHeight}`;

  // Определяем высоту для мобильного меню
  const getMobileMenuTop = () => {
    switch (topbarHeight) {
      case 'compact': return 'top-12';
      case 'standard': return 'top-14';
      case 'large': return 'top-20';
      default: return 'top-16';
    }
  };

  // Показываем базовую версию пока не загрузилось
  if (!mounted) {
    return (
      <header className="topbar topbar-standard">
        <div className="container flex items-center justify-between">
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

  return (
    <header className={`topbar ${topbarHeightClass}`}>
      <div className="container flex items-center justify-between">
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
                  ? 'text-primary dark:text-primary-400 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400'
              }`}
            >
              {item.label}
              {item.badge && (
                <span className="ml-1 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop User Menu & Theme Toggle */}
        <div className="hidden md:flex items-center space-x-4">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {user ? (
            <UserProfileDropdown user={user} onLogout={handleLogout} />
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <LogIn className="h-4 w-4" />
              <span>Войти</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden" ref={menuRef}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className={`absolute ${getMobileMenuTop()} right-0 left-0 bg-white dark:bg-gray-900 shadow-lg border-t border-gray-200 dark:border-gray-700 z-50`}>
              <div className="px-4 py-6 space-y-1">
                {/* Mobile Navigation */}
                {visibleNavItems.map(item => (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'text-primary dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.label}
                    {item.badge && (
                      <span className="ml-2 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}

                {/* Mobile Theme Toggle */}
                <button
                  onClick={() => {
                    toggleTheme();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="h-5 w-5 mr-3" />
                      Светлая тема
                    </>
                  ) : (
                    <>
                      <Moon className="h-5 w-5 mr-3" />
                      Тёмная тема
                    </>
                  )}
                </button>
                
                {/* Mobile Auth Section */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  {user ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 px-3 py-2">
                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name || 'Пользователь'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Профиль
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </header>
  );
};

export default TopBar;