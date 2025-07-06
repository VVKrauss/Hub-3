// src/components/layout/TopBarStep2.tsx
// ШАГ 2: Добавляем загрузку навигации из API (ОСТОРОЖНО!)

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

// FALLBACK навигация - на случай ошибок API
const FALLBACK_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
  { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
  { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 }, // ← КУРСЫ ВКЛЮЧЕНЫ!
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
  { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
];

const TopBarStep2 = () => {
  const location = useLocation();
  
  // Состояния
  const [navItems, setNavItems] = useState<NavItem[]>(FALLBACK_NAV_ITEMS); // Начинаем с fallback
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(false); // НЕ true! Не блокируем рендеринг
  const [apiError, setApiError] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const apiLoadedRef = useRef(false); // Предотвращаем повторные загрузки

  // Инициализация темы (как раньше)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  // НОВЫЙ: Загрузка навигации из API - ОДИН РАЗ
  useEffect(() => {
    if (apiLoadedRef.current) return; // Предотвращаем повторные вызовы
    
    const loadNavigation = async () => {
      try {
        if (!isMountedRef.current) return;
        
        console.log('🔄 TopBar Step 2: Загружаем навигацию из API...');
        setLoading(true);
        setApiError(null);
        
        // БЕЗОПАСНЫЙ API вызов с таймаутом
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const apiCall = getNavigationItems();
        const response = await Promise.race([apiCall, timeoutPromise]);
        
        if (!isMountedRef.current) return; // Проверяем после async операции
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Сортируем по order
          const sortedItems = response.data.sort((a, b) => (a.order || 0) - (b.order || 0));
          setNavItems(sortedItems);
          console.log('✅ TopBar Step 2: Навигация загружена из API', sortedItems);
        } else {
          console.warn('⚠️ TopBar Step 2: API вернул пустые данные, используем fallback');
          setNavItems(FALLBACK_NAV_ITEMS);
        }
        
        apiLoadedRef.current = true; // Помечаем как загруженное
        
      } catch (error) {
        console.error('❌ TopBar Step 2: Ошибка загрузки навигации:', error);
        
        if (isMountedRef.current) {
          setApiError(error.message);
          setNavItems(FALLBACK_NAV_ITEMS); // Всегда fallback при ошибке
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadNavigation();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // КРИТИЧНО: пустой массив зависимостей!

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

  // Фильтруем видимые элементы
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
            
            {/* Показываем индикатор загрузки, если API еще не загрузился */}
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Загрузка...</span>
              </div>
            )}
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

              <button className="w-full mt-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Войти
              </button>
            </nav>
          </div>
        )}
      </div>
      
      {/* Debug Info */}
      <div className={`border-l-4 p-2 text-xs ${
        apiError ? 'bg-red-100 border-red-500' : 
        loading ? 'bg-yellow-100 border-yellow-500' : 
        'bg-blue-100 border-blue-500'
      }`}>
        <p className={`${
          apiError ? 'text-red-700' : 
          loading ? 'text-yellow-700' : 
          'text-blue-700'
        }`}>
          🔄 TopBar Step 2 (API навигация) | 
          Источник: {apiLoadedRef.current ? 'API' : 'Fallback'} | 
          Элементов: {visibleNavItems.length} | 
          {loading && 'Загружается...'} 
          {apiError && `Ошибка: ${apiError}`}
          {!loading && !apiError && 'Готов'}
        </p>
      </div>
    </header>
  );
};

export default TopBarStep2;