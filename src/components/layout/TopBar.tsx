// src/components/layout/TopBar.tsx - Исправленная версия без бесконечной загрузки
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

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      if (!isMounted) return;
      
      try {
        // Проверяем пользователя
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          await fetchUserProfile(session.user.id);
        }

        // Загружаем навигацию
        if (isMounted) {
          await fetchNavItems();
        }

        // Загружаем настройки топбара
        if (isMounted) {
          await fetchTopbarSettings();
        }

        if (isMounted) {
          setMounted(true);
        }
      } catch (error) {
        console.error('Error initializing TopBar:', error);
        if (isMounted) {
          setFallbackNavigation();
          setMounted(true);
        }
      }
    };

    initialize();

    // Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' && session) {
        await fetchUserProfile(session.user.id);
        setLoginModalOpen(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Пустой массив зависимостей - выполняется только один раз

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
            <UserProfileDropdown 
              user={user} 
              onLogout={handleLogout} 
            />
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-2 p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
            >
              <LogIn className="h-5 w-5" />
              <span className="hidden sm:inline">Войти</span>
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-gray-700 dark:text-gray-300"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div 
          ref={menuRef}
          className={`md:hidden absolute ${getMobileMenuTop()} left-0 right-0 bg-white dark:bg-gray-900 shadow-lg z-50`}
        >
          <nav className="container py-5 flex flex-col space-y-4">
            {visibleNavItems.map(item => (
              <Link 
                key={item.id}
                to={item.path} 
                className={`py-2 font-medium transition-colors ${
                  location.pathname === item.path 
                    ? 'text-primary dark:text-primary-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            
            {/* Mobile Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="flex items-center gap-2 py-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-5 w-5" />
                  Светлая тема
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5" />
                  Тёмная тема
                </>
              )}
            </button>
            
            {/* Mobile Auth Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 px-2 py-2">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.name || 'Пользователь'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  
                  <Link
                    to="/profile"
                    className="flex items-center py-2 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Профиль
                  </Link>
                  
                  {(user.role === 'Admin' || user.role === 'admin') && (
                    <Link
                      to="/admin"
                      className="flex items-center py-2 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Админ панель
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full py-2 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                  className="flex items-center gap-2 py-2 px-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors w-full"
                >
                  <LogIn className="h-5 w-5" />
                  Войти
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
      />

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default TopBar;