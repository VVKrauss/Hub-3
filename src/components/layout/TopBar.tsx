// src/components/layout/TopBar.tsx - Очищенная версия без debug элементов
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getNavigationItems, getTopbarSettings } from '../../api/settings';
import Logo from '../ui/Logo';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [topbarHeight, setTopbarHeight] = useState<'compact' | 'standard' | 'large'>('standard');

  useEffect(() => {
    checkUser();
    fetchNavItems();
    fetchTopbarSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Error fetching user profile:', error);
      }

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name
        });
      }
    }
  };

  const fetchNavItems = async () => {
    try {
      const response = await getNavigationItems();
      
      if (response.error) {
        setFallbackNavigation();
        return;
      }
      
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

        {/* User Menu / Auth Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || user.email}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="font-medium">{user.name || 'Пользователь'}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-600 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-600">
                    <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Профиль
                  </Link>
                  
                  {(user.role === 'admin' || user.role === 'super_admin') && (
                    <Link
                      to="/admin"
                      className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Админ панель
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/auth/login"
                className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors"
              >
                Войти
              </Link>
              <Link
                to="/auth/register"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Регистрация
              </Link>
            </div>
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
        <div className={`md:hidden bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-600 absolute left-0 right-0 z-40 ${getMobileMenuTop()}`}>
          <nav className="px-4 py-2 space-y-2">
            {visibleNavItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                className={`block py-3 px-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            
            {/* Mobile Auth Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-dark-600">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 px-2 py-2">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || user.email}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  
                  <Link
                    to="/profile"
                    className="flex items-center py-2 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Профиль
                  </Link>
                  
                  {(user.role === 'admin' || user.role === 'super_admin') && (
                    <Link
                      to="/admin"
                      className="flex items-center py-2 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Админ панель
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full py-2 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/auth/login"
                    className="block py-2 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Войти
                  </Link>
                  <Link
                    to="/auth/register"
                    className="block py-2 px-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Регистрация
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}

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