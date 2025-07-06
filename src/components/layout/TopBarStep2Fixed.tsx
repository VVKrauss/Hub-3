// src/components/layout/TopBarWithAuth.tsx
// ОСТОРОЖНОЕ добавление авторизации к стабильному TopBar

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getNavigationItems } from '../../api/settings';
import LoginModal from '../auth/LoginModal';
import UserProfileDropdown from '../ui/UserProfileDropdown';

interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order?: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

// Рабочая навигация - как основа
const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
  { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
  { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
  { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
];

const TopBarWithAuth = () => {
  const location = useLocation();
  
  // Основные состояния (как в стабильной версии)
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // НОВЫЕ состояния для авторизации
  const [user, setUser] = useState<User | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const authSubscriptionRef = useRef<any>(null);

  // Инициализация темы (без изменений)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  // Фоновая загрузка навигации (без изменений)
  useEffect(() => {
    const loadNavigationInBackground = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Background timeout')), 1500)
        );
        
        const response = await Promise.race([getNavigationItems(), timeoutPromise]);
        
        if (!isMountedRef.current) return;
        
        if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
          const sortedItems = response.data.sort((a, b) => (a.order || 0) - (b.order || 0));
          setNavItems(sortedItems);
        }
      } catch (error) {
        console.log('ℹ️ TopBar: Фоновая загрузка навигации не удалась');
      }
    };

    const timer = setTimeout(loadNavigationInBackground, 100);
    return () => clearTimeout(timer);
  }, []);

  // НОВЫЙ: Безопасная инициализация авторизации
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!isMountedRef.current) return;
        
        console.log('🔐 TopBar: Инициализация авторизации...');
        
        // Быстрая проверка текущей сессии
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 2000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!isMountedRef.current) return;
        
        if (error) {
          console.warn('⚠️ TopBar: Ошибка получения сессии:', error.message);
          setAuthError(error.message);
        } else if (session?.user) {
          console.log('✅ TopBar: Найдена активная сессия');
          await fetchUserProfile(session.user);
        }
        
        setAuthInitialized(true);
        
      } catch (error) {
        console.warn('⚠️ TopBar: Ошибка инициализации авторизации:', error.message);
        if (isMountedRef.current) {
          setAuthError(error.message);
          setAuthInitialized(true); // Все равно помечаем как инициализированное
        }
      }
    };

    const timer = setTimeout(initializeAuth, 200); // Небольшая задержка
    return () => clearTimeout(timer);
  }, []);

  // НОВЫЙ: Подписка на изменения авторизации (ТОЛЬКО после инициализации)
  useEffect(() => {
    if (!authInitialized) return;
    
    try {
      console.log('🔐 TopBar: Настройка подписки на auth изменения...');
      
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMountedRef.current) return;
        
        console.log('🔄 TopBar: Auth событие:', event);
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            await fetchUserProfile(session.user);
            setLoginModalOpen(false);
            setAuthError(null);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setAuthError(null);
          }
        } catch (error) {
          console.warn('⚠️ TopBar: Ошибка обработки auth события:', error.message);
          setAuthError(error.message);
        }
      });
      
      authSubscriptionRef.current = data.subscription;
      
    } catch (error) {
      console.error('❌ TopBar: Ошибка настройки подписки:', error.message);
      setAuthError(error.message);
    }

    return () => {
      if (authSubscriptionRef.current) {
        console.log('🔐 TopBar: Очистка auth подписки');
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
    };
  }, [authInitialized]);

  // Безопасная загрузка профиля пользователя
  const fetchUserProfile = useCallback(async (authUser: any) => {
    try {
      if (!isMountedRef.current) return;
      
      console.log('👤 TopBar: Загрузка профиля пользователя...');
      
      // Быстрый таймаут для профиля
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile timeout')), 1500)
      );
      
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
        
      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]);
      
      if (!isMountedRef.current) return;
      
      // Создаем объект пользователя даже если профиль не найден
      const userData: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: profile?.name || authUser.user_metadata?.name || 'Пользователь',
        role: profile?.role,
        avatar: profile?.avatar
      };
      
      setUser(userData);
      console.log('✅ TopBar: Профиль пользователя загружен');
      
    } catch (error) {
      console.warn('⚠️ TopBar: Ошибка загрузки профиля:', error.message);
      
      // Создаем базовый профиль даже при ошибке
      if (isMountedRef.current && authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || 'Пользователь'
        });
      }
    }
  }, []);

  // Обработчик клика вне меню
  useEffect(() => {
    if (mobileMenuOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setMobileMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 TopBar: Выход из системы...');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ TopBar: Ошибка выхода:', error.message);
      setAuthError(error.message);
    }
  };

  const visibleNavItems = navItems.filter(item => item.visible);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          
          {/* Logo */}
          <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">SH</span>
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              Science Hub
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1 space-x-6">
            {visibleNavItems.map(item => (
              <Link 
                key={item.id}
                to={item.path} 
                className={`font-medium py-2 px-3 rounded-md transition-colors duration-200 ${
                  location.pathname === item.path 
                    ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            {/* AUTH CONTROLS */}
            {authInitialized ? (
              user ? (
                <UserProfileDropdown 
                  user={user} 
                  onLogout={handleLogout}
                />
              ) : (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Войти
                </button>
              )
            ) : (
              // Показываем простую заглушку пока инициализируется
              <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm">...</span>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div ref={menuRef} className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <nav className="space-y-2">
              {visibleNavItems.map(item => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-3 px-4 rounded-lg transition-colors duration-200 ${
                    location.pathname === item.path 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between py-3 px-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>Тема</span>
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Mobile Auth */}
              {authInitialized ? (
                user ? (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <div className="flex items-center gap-3 py-3 px-4">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.name[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
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
                    className="w-full mt-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    Войти
                  </button>
                )
              ) : (
                <div className="w-full mt-3 px-4 py-3 bg-gray-100 text-gray-500 rounded-lg text-center">
                  Загрузка...
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
      
      {/* Auth Error */}
      {authError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-2 text-xs">
          <span className="text-red-700">⚠️ Auth: {authError}</span>
        </div>
      )}
      
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-100 border-l-4 border-blue-500 p-1 text-xs">
          <span className="text-blue-700">
            🔐 TopBar + Auth | Навигация: ✅ | 
            Auth: {authInitialized ? (user ? `👤 ${user.name}` : '🔓 Гость') : '🔄 Загрузка'} |
            Курсы: ✅
          </span>
        </div>
      )}

      {/* Login Modal */}
      {loginModalOpen && (
        <LoginModal 
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
        />
      )}
    </header>
  );
};

export default TopBarWithAuth;