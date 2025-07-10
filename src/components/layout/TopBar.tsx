// src/components/layout/TopBar.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Logo from '../ui/Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { useTopBar } from '../../contexts/TopBarContext';
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
        setAuthMode('login');
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
      await supabase.auth.signOut();
      setUserDropdownOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Ошибка выхода');
    }
  };

  // РЕНДЕР УПРОЩЕННОЙ ВЕРСИИ ПРИ ЗАГРУЗКЕ
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
    <>
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
                {item.label || item.name}
                {location.pathname === item.path && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 dark:bg-primary-400"></span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
              title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                >
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name || user.email}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                  )}
                  <span className="hidden md:block font-medium text-gray-900 dark:text-white">
                    {user.name || 'Пользователь'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700">
                      <p className="font-medium text-gray-900 dark:text-white">{user.name || 'Пользователь'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Профиль
                    </Link>
                    
                    {user.role === 'Admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Панель управления
                      </Link>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Войти</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div 
            ref={menuRef}
            className="md:hidden bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-dark-700 shadow-lg"
          >
            <nav className="container mx-auto px-4 py-4 space-y-2">
              {visibleNavItems.map(item => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`block py-2 px-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label || item.name}
                </Link>
              ))}
              
              {user ? (
                <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-dark-700">
                  <div className="flex items-center space-x-3 py-2">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name || user.email}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.name || 'Пользователь'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  
                  <Link
                    to="/profile"
                    className="flex items-center py-2 text-gray-700 dark:text-gray-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Профиль
                  </Link>
                  
                  {user.role === 'Admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center py-2 text-gray-700 dark:text-gray-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Панель управления
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center py-2 text-red-600 w-full text-left"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Выйти
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Войти</span>
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Модальное окно авторизации вынесено за пределы header */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
      />
    </>
  );
};

export default TopBar;