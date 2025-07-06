// src/components/layout/TopBarMinimal.tsx
// МИНИМАЛЬНАЯ ВЕРСИЯ TopBar - начинаем с самого простого

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';

// Простые типы без сложной логики
interface SimpleNavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
}

// СТАТИЧЕСКАЯ навигация без API вызовов
const STATIC_NAV_ITEMS: SimpleNavItem[] = [
  { id: 'home', label: 'Главная', path: '/', visible: true },
  { id: 'events', label: 'События', path: '/events', visible: true },
  { id: 'courses', label: 'Курсы', path: '/courses', visible: true },
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true },
  { id: 'about', label: 'О нас', path: '/about', visible: true }
];

const TopBarMinimal = () => {
  const location = useLocation();
  
  // МИНИМАЛЬНОЕ состояние - только необходимое
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Простой ref для меню без сложной логики
  const menuRef = useRef<HTMLDivElement>(null);

  // ЕДИНСТВЕННЫЙ useEffect - только для темы из localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []); // Пустой массив зависимостей!

  // Простой обработчик клика вне меню БЕЗ useEffect
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setMobileMenuOpen(false);
    }
  };

  // Добавляем/удаляем слушатель только при открытии/закрытии меню
  useEffect(() => {
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Простая функция переключения темы
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Фильтруем видимые элементы БЕЗ useMemo
  const visibleNavItems = STATIC_NAV_ITEMS.filter(item => item.visible);

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
          
          {/* Desktop Navigation - СТАТИЧЕСКАЯ */}
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
            
            {/* Простая кнопка входа */}
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Войти
            </button>
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
            className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4"
          >
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
              
              {/* Mobile Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between py-3 px-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>Тема</span>
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Mobile Login */}
              <button className="w-full mt-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Войти
              </button>
            </nav>
          </div>
        )}
      </div>
      
      {/* Debug Info */}
      <div className="bg-green-100 border-l-4 border-green-500 p-2 text-xs">
        <p className="text-green-700">
          ✅ TopBar Minimal работает | 
          Тема: {theme} | 
          Мобильное меню: {mobileMenuOpen ? 'открыто' : 'закрыто'} |
          Текущая страница: {location.pathname}
        </p>
      </div>
    </header>
  );
};

export default TopBarMinimal;