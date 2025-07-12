// src/components/layout/TopBar.tsx - ПОЛНАЯ ВЕРСИЯ с уведомлениями
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Logo from '../ui/Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { useTopBar } from '../../contexts/TopBarContext';
import NotificationBell from '../comments/NotificationBell';
import { toast } from 'react-hot-toast';
import LoginModal from '../auth/LoginModal';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  name: string;
}

const TopBar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { navItems, topbarHeight, user, mounted, loading } = useTopBar();
  
  // Local state только для UI
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState<LoginFormData>({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({ email: '', password: '', name: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Refs
  const menuRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  console.log('🎨 TopBar: Рендер компонента (данные из контекста)');

  // КЛИК ВНЕ МЕНЮ
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ФУНКЦИИ АВТОРИЗАЦИИ
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error('Заполните все поля');
      return;
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) throw error;
      
      setLoginForm({ email: '', password: '' });
      setLoginModalOpen(false);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Ошибка входа');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.email || !registerForm.password || !registerForm.name) {
      toast.error('Заполните все поля');
      return;
    }

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            name: registerForm.name,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Создаем профиль пользователя
        await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              name: registerForm.name,
              email: registerForm.email,
              role: 'User'
            }
          ]);

        toast.success('Регистрация успешна! Проверьте email для подтверждения.');
        setRegisterForm({ email: '', password: '', name: '' });
        setLoginModalOpen(false);
      }
    } catch (error: any) {
      console.error('Register error:', error);
      toast.error(error.message || 'Ошибка регистрации');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserDropdownOpen(false);
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Ошибка при выходе');
    }
  };

  // ПОКАЗЫВАЕМ СКЕЛЕТОН ЕСЛИ ДАННЫХ ЕЩЕ НЕТ
  if (!mounted) {
    return (
      <div className="topbar">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-32 h-8 rounded"></div>
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-64 h-8 rounded"></div>
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-24 h-8 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`topbar topbar-${topbarHeight}`}>
        <div className="container">
          {/* Левая часть - логотип */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Logo className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Science Hub
              </span>
            </Link>
          </div>

          {/* Центральная часть - навигация для десктопа */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems
              .filter(item => item.visible)
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
          </nav>

          {/* Правая часть - авторизация и пользователь */}
          <div className="flex items-center space-x-4">
            {/* Переключатель темы */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {!user ? (
              // Кнопки авторизации для неавторизованных пользователей
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setLoginModalOpen(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:block">Войти</span>
                </button>
                
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setLoginModalOpen(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:block">Регистрация</span>
                </button>
              </div>
            ) : (
              // Меню для авторизованных пользователей
              <div className="flex items-center space-x-2">
                {/* НОВЫЙ КОМПОНЕНТ: Уведомления */}
                <NotificationBell />

                {/* Dropdown пользователя */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name || user.email} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                    <span className="hidden md:block font-medium">
                      {user.name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Dropdown меню пользователя */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-600 py-1 z-50">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Профиль
                      </Link>
                      
                      {(user.role === 'admin' || user.role === 'Administrator') && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Админ-панель
                        </Link>
                      )}
                      
                      <hr className="my-1 border-gray-200 dark:border-dark-600" />
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Выйти
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Кнопка мобильного меню */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div 
            ref={menuRef}
            className={`lg:hidden bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 shadow-lg mobile-menu mobile-menu-${topbarHeight}`}
          >
            <div className="container py-4">
              <nav className="space-y-2">
                {navItems
                  .filter(item => item.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                        location.pathname === item.path
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
              </nav>

              {/* Мобильные кнопки авторизации */}
              {!user && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-dark-700 space-y-2">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setLoginModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-primary-600 dark:text-primary-400 border border-primary-600 dark:border-primary-400 rounded-lg font-medium transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Войти</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setAuthMode('register');
                      setLoginModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Регистрация</span>
                  </button>
                </div>
              )}

              {/* Мобильное пользовательское меню */}
              {user && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-dark-700">
                  <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-dark-700 rounded-lg mb-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name || user.email} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.name || user.email?.split('@')[0]}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Профиль
                    </Link>

                    {(user.role === 'admin' || user.role === 'Administrator') && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Админ-панель
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal для авторизации */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
        loginForm={loginForm}
        onLoginFormChange={setLoginForm}
        registerForm={registerForm}
        onRegisterFormChange={setRegisterForm}
        onLogin={handleLogin}
        onRegister={handleRegister}
        loading={authLoading}
      />
    </>
  );
};

export default TopBar;