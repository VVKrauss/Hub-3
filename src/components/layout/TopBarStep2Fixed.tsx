// src/components/layout/TopBarFinal.tsx
// ФИНАЛЬНАЯ ВЕРСИЯ - максимально быстрая и стабильная

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

// РАБОЧАЯ навигация с курсами - используется как основная
const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
  { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
  { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
  { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
];

const TopBarFinal = () => {
  const location = useLocation();
  
  // Начинаем сразу с рабочей навигации - никаких задержек!
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [apiLoaded, setApiLoaded] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Инициализация темы
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  // ФОНОВАЯ загрузка API - НЕ блокирует интерфейс
  useEffect(() => {
    const loadNavigationInBackground = async () => {
      try {
        console.log('🔄 TopBar Final: Фоновая загрузка API...');
        
        // Короткий таймаут - если не загрузится быстро, забиваем
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Background timeout')), 1500)
        );
        
        const response = await Promise.race([getNavigationItems(), timeoutPromise]);
        
        if (!isMountedRef.current) return;
        
        if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
          const sortedItems = response.data.sort((a, b) => (a.order || 0) - (b.order || 0));
          
          // Проверяем, отличается ли от текущей навигации
          const currentIds = navItems.map(item => item.id).sort();
          const newIds = sortedItems.map(item => item.id).sort();
          
          if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
            setNavItems(sortedItems);
            console.log('✅ TopBar Final: API обновил навигацию', sortedItems);
          } else {
            console.log('✅ TopBar Final: API подтвердил текущую навигацию');
          }
          
          setApiLoaded(true);
        }
        
      } catch (error) {
        // Тихо игнорируем ошибки фоновой загрузки
        console.log('ℹ️ TopBar Final: Фоновая загрузка API не удалась, используем дефолт');
      }
    };

    // Запускаем фоновую загрузку с небольшой задержкой
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
          
          {/* Desktop Navigation - ВСЕГДА готова к использованию */}
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
      
      {/* Минимальная debug info - только в development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-green-100 border-l-4 border-green-500 p-1 text-xs">
          <span className="text-green-700">
            ✅ TopBar Final | Элементов: {visibleNavItems.length} | 
            API: {apiLoaded ? '🔗 Синхронизирован' : '🔄 Фон'} |
            Курсы: ✅
          </span>
        </div>
      )}
    </header>
  );
};

export default TopBarFinal;