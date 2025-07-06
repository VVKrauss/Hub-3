// src/components/layout/TopBar.tsx
// ЕДИНСТВЕННЫЙ ФАЙЛ TopBar - все изменения делаем здесь!

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { getNavigationItems } from '../../api/settings';

interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order?: number;
}

// Рабочая навигация с курсами
const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
  { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
  { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
  { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
];

const TopBar = () => {
  const location = useLocation();
  
  // Основные состояния
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Состояния для отладки
  const [debugInfo, setDebugInfo] = useState({
    apiLoaded: false,
    supabaseIssues: false,
    version: 'stable-no-auth'
  });
  
  const menuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // ШАГИ ДОБАВЛЕНИЯ ФУНКЦИЙ:
  // 1. Базовый TopBar (ТЕКУЩИЙ) ✅
  // 2. + API навигация 
  // 3. + Авторизация
  // 4. + ThemeContext
  // 5. + Дополнительные функции

  // Инициализация темы
  useEffect(() => {
    console.log('🎨 TopBar: Инициализация темы...');
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  // Фоновая загрузка навигации из API
  useEffect(() => {
    const loadNavigationInBackground = async () => {
      try {
        console.log('🔄 TopBar: Фоновая загрузка навигации из API...');
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 1500)
        );
        
        const response = await Promise.race([getNavigationItems(), timeoutPromise]);
        
        if (!isMountedRef.current) return;
        
        if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
          const sortedItems = response.data.sort((a, b) => (a.order || 0) - (b.order || 0));
          setNavItems(sortedItems);
          setDebugInfo(prev => ({ ...prev, apiLoaded: true }));
          console.log('✅ TopBar: API навигация загружена', sortedItems);
        } else {
          console.log('ℹ️ TopBar: API вернул пустые данные, используем дефолт');
        }
      } catch (error) {
        console.log('ℹ️ TopBar: Фоновая загрузка API не удалась:', error.message);
        // Проверяем на проблемы с Supabase
        if (error.message.includes('Multiple GoTrueClient')) {
          setDebugInfo(prev => ({ ...prev, supabaseIssues: true }));
        }
      }
    };

    // Небольшая задержка чтобы не блокировать первый рендер
    const timer = setTimeout(loadNavigationInBackground, 100);
    
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
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

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
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
            
            {/* Простая кнопка входа - ПОКА без авторизации */}
            <Link
              to="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Войти
            </Link>
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

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full mt-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Войти
              </Link>
            </nav>
          </div>
        )}
      </div>
      
      {/* Debug Panel - показывает статус и проблемы */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`border-l-4 p-1 text-xs ${
          debugInfo.supabaseIssues ? 'bg-red-100 border-red-500' : 'bg-blue-100 border-blue-500'
        }`}>
          <span className={debugInfo.supabaseIssues ? 'text-red-700' : 'text-blue-700'}>
            🔧 TopBar v{debugInfo.version} | 
            Навигация: ✅ ({visibleNavItems.length}) | 
            API: {debugInfo.apiLoaded ? '🔗 Загружен' : '📦 Дефолт'} |
            Курсы: ✅ |
            {debugInfo.supabaseIssues && ' ⚠️ Supabase конфликты!'}
          </span>
        </div>
      )}
    </header>
  );
};

export default TopBar;

/*
ПЛАН РАЗВИТИЯ ЭТОГО ФАЙЛА:

✅ ШАГ 1: Базовый TopBar с навигацией и темой (ТЕКУЩИЙ)
  - Статическая навигация с курсами
  - Переключение темы
  - Мобильное меню
  - Фоновая загрузка API

🔄 ШАГ 2: Добавить авторизацию (СЛЕДУЮЩИЙ)
  - import { supabase } from '../../lib/supabase'
  - Состояния user, authInitialized
  - Auth логика в отдельных useEffect
  - Компоненты LoginModal, UserProfileDropdown

🔄 ШАГ 3: Интеграция с ThemeContext
  - import { useTheme } from '../../contexts/ThemeContext'
  - Замена локального state темы

🔄 ШАГ 4: Настройки TopBar
  - Загрузка настроек внешнего вида
  - Динамическая высота, стили

ВСЕ ИЗМЕНЕНИЯ ТОЛЬКО В ЭТОМ ФАЙЛЕ!
*/