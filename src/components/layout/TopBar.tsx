// src/components/layout/TopBar.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ с темной темой
import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Logo from '../ui/Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { useTopBar } from '../../contexts/TopBarContext';
import { toast } from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  name: string;
}

const TopBar = memo(() => {
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
  const renderCountRef = useRef(0);

  // ОГРАНИЧИВАЕМ ЛОГИРОВАНИЕ ЕЩЕ БОЛЬШЕ
  renderCountRef.current++;
  if (renderCountRef.current === 1 || renderCountRef.current % 50 === 0) { // Только первый и каждый 50-й
    console.log(`🎨 TopBar: Render #${renderCountRef.current}`);
  }

  // Мемоизируем вычисляемые значения
  const isHomePage = useMemo(() => location.pathname === '/', [location.pathname]);
  
  const topBarClasses = useMemo(() => {
    const baseClasses = 'w-full z-50 transition-all duration-300';
    const heightClass = topbarHeight === 'compact' ? 'h-14' : 
                       topbarHeight === 'large' ? 'h-20' : 'h-16';
    const bgClass = theme === 'dark' 
      ? (isHomePage ? 'bg-dark-900/90 backdrop-blur-sm' : 'bg-dark-900')
      : (isHomePage ? 'bg-white/90 backdrop-blur-sm' : 'bg-white');
    const borderClass = theme === 'dark' ? 'border-dark-700' : 'border-gray-200';
    
    return `${baseClasses} ${heightClass} ${bgClass} shadow-sm border-b ${borderClass}`;
  }, [topbarHeight, isHomePage, theme]);

  // Мемоизируем обработчики
  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const handleLoginModalToggle = useCallback(() => {
    setLoginModalOpen(prev => !prev);
    if (loginModalOpen) {
      setAuthMode('login');
      setLoginForm({ email: '', password: '' });
      setRegisterForm({ email: '', password: '', name: '' });
    }
  }, [loginModalOpen]);

  const handleUserDropdownToggle = useCallback(() => {
    setUserDropdownOpen(prev => !prev);
  }, []);

  // КЛИК ВНЕ МЕНЮ - только когда нужно
  useEffect(() => {
    if (!mobileMenuOpen && !userDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (mobileMenuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
      if (userDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, userDropdownOpen]);

  // ФУНКЦИИ АВТОРИЗАЦИИ
  const handleLogin = useCallback(async (e: React.FormEvent) => {
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
      toast.success('Вход выполнен успешно');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Ошибка входа');
    } finally {
      setAuthLoading(false);
    }
  }, [loginForm.email, loginForm.password]);

  const handleRegister = useCallback(async (e: React.FormEvent) => {
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
          data: { name: registerForm.name }
        }
      });

      if (error) throw error;

      if (data.user) {
        await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            name: registerForm.name,
            email: registerForm.email,
            role: 'User'
          }]);

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
  }, [registerForm]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUserDropdownOpen(false);
      toast.success('Выход выполнен успешно');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Ошибка при выходе');
    }
  }, []);

  // Ранний возврат если не загружено
  if (!mounted || loading) {
    return (
      <div className={topBarClasses}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="animate-pulse bg-gray-200 dark:bg-dark-600 h-8 w-32 rounded"></div>
          <div className="animate-pulse bg-gray-200 dark:bg-dark-600 h-8 w-24 rounded"></div>
        </div>
      </div>
    );
  }

  // Цвета для темной темы
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-700';
  const hoverTextColor = theme === 'dark' ? 'hover:text-primary-400' : 'hover:text-primary-600';
  const bgHover = theme === 'dark' ? 'hover:bg-dark-700' : 'hover:bg-gray-50';

  return (
    <header className={topBarClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <Logo className="h-8 w-auto" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.filter(item => item.visible).map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? `text-primary-600 ${theme === 'dark' ? 'bg-dark-700' : 'bg-primary-50'}`
                    : `${textColor} ${hoverTextColor} ${bgHover}`
                }`}
              >
                {item.label}
                {item.badge && item.badge > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 ${textColor} ${hoverTextColor} transition-colors`}
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Auth Section */}
            {user ? (
              /* User Menu */
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={handleUserDropdownToggle}
                  className={`flex items-center space-x-2 ${textColor} ${hoverTextColor} transition-colors`}
                >
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className={`absolute right-0 mt-2 w-48 ${theme === 'dark' ? 'bg-dark-800' : 'bg-white'} rounded-md shadow-lg py-1 z-50`}>
                    <div className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-white border-dark-600' : 'text-gray-900 border-gray-200'} border-b`}>
                      <div className="font-medium">{user.name || 'Пользователь'}</div>
                      <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{user.email}</div>
                    </div>
                    
                    <Link
                      to="/profile"
                      className={`flex items-center px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-dark-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <User className="mr-3 h-4 w-4" />
                      Профиль
                    </Link>
                    
                    {user.role === 'Admin' && (
                      <Link
                        to="/admin"
                        className={`flex items-center px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-dark-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Панель управления
                      </Link>
                    )}
                    
                    <button
                      onClick={handleSignOut}
                      className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-dark-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Login Button */
              <button
                onClick={handleLoginModalToggle}
                className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Войти</span>
              </button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={handleMobileMenuToggle}
                className={`${textColor} ${hoverTextColor} transition-colors`}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div ref={menuRef} className={`md:hidden ${theme === 'dark' ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'} border-t`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.filter(item => item.visible).map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  location.pathname === item.path
                    ? `text-primary-600 ${theme === 'dark' ? 'bg-dark-700' : 'bg-primary-50'}`
                    : `${textColor} ${hoverTextColor} ${bgHover}`
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Login Modal - остается как было, но с поддержкой темной темы */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleLoginModalToggle}></div>
            
            <div className={`inline-block align-bottom ${theme === 'dark' ? 'bg-dark-800' : 'bg-white'} rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full`}>
              <div className={`${theme === 'dark' ? 'bg-dark-800' : 'bg-white'} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {authMode === 'login' ? 'Вход в систему' : 'Регистрация'}
                  </h3>
                  <button
                    onClick={handleLoginModalToggle}
                    className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label htmlFor="email" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                      <input
                        type="email"
                        id="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className={`mt-1 block w-full px-3 py-2 border ${theme === 'dark' ? 'border-dark-600 bg-dark-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Пароль</label>
                      <input
                        type="password"
                        id="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className={`mt-1 block w-full px-3 py-2 border ${theme === 'dark' ? 'border-dark-600 bg-dark-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setAuthMode('register')}
                        className="text-sm text-primary-600 hover:text-primary-500"
                      >
                        Нет аккаунта? Регистрация
                      </button>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        {authLoading ? 'Вход...' : 'Войти'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label htmlFor="name" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Имя</label>
                      <input
                        type="text"
                        id="name"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className={`mt-1 block w-full px-3 py-2 border ${theme === 'dark' ? 'border-dark-600 bg-dark-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-email" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                      <input
                        type="email"
                        id="reg-email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className={`mt-1 block w-full px-3 py-2 border ${theme === 'dark' ? 'border-dark-600 bg-dark-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-password" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Пароль</label>
                      <input
                        type="password"
                        id="reg-password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className={`mt-1 block w-full px-3 py-2 border ${theme === 'dark' ? 'border-dark-600 bg-dark-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setAuthMode('login')}
                        className="text-sm text-primary-600 hover:text-primary-500"
                      >
                        Есть аккаунт? Войти
                      </button>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        {authLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;