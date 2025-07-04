// src/components/layout/TopBar.tsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Menu, 
  X, 
  Sun, 
  Moon, 
  User, 
  LogIn, 
  LogOut, 
  Settings,
  Calendar,
  BookOpen,
  Users,
  Building,
  Coffee,
  Info,
  Home
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order?: number;
  badge?: number;
  icon?: string;
  external?: boolean;
}

interface TopBarSettings {
  alignment: 'left' | 'center' | 'right' | 'space-between';
  style: 'classic' | 'modern' | 'minimal' | 'rounded';
  spacing: 'compact' | 'normal' | 'relaxed';
  height: 'compact' | 'normal' | 'large';
  showBorder: boolean;
  showShadow: boolean;
  backgroundColor: 'white' | 'blur' | 'transparent';
  animation: 'none' | 'slide' | 'fade' | 'bounce';
  mobileCollapse: boolean;
  showIcons: boolean;
  showBadges: boolean;
  stickyHeader: boolean;
  maxWidth: 'container' | 'full';
}

const TopBar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [topbarSettings, setTopbarSettings] = useState<TopBarSettings>({
    alignment: 'center',
    style: 'classic',
    spacing: 'normal',
    height: 'normal',
    showBorder: true,
    showShadow: true,
    backgroundColor: 'white',
    animation: 'slide',
    mobileCollapse: true,
    showIcons: false,
    showBadges: true,
    stickyHeader: true,
    maxWidth: 'container'
  });
  const [loading, setLoading] = useState(true);

  // Дефолтные пункты навигации
  const defaultNavItems: NavigationItem[] = [
    { id: 'events', label: 'Мероприятия', path: '/events', visible: true, order: 0 },
    { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 1 },
    { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 2 },
    { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 3 },
    { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
    { id: 'about', label: 'О нас', path: '/about', visible: true, order: 5 }
  ];

  // Иконки для навигации
  const iconMap = {
    'home': Home,
    'events': Calendar,
    'courses': BookOpen,
    'speakers': Users,
    'rent': Building,
    'coworking': Coffee,
    'about': Info
  };

  useEffect(() => {
    fetchNavigationSettings();
  }, []);

  const fetchNavigationSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('site_settings')
        .select('navigation_items, topbar_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        setNavigationItems(defaultNavItems);
        return;
      }

      // Обработка навигационных элементов
      if (data?.navigation_items && Array.isArray(data.navigation_items) && data.navigation_items.length > 0) {
        const navItemsWithOrder = data.navigation_items.map((item: any, index: number) => ({
          ...item,
          order: item.order !== undefined ? item.order : index
        })).sort((a: any, b: any) => a.order - b.order);
        
        setNavigationItems(navItemsWithOrder);
      } else {
        setNavigationItems(defaultNavItems);
      }

      // Обработка настроек топбара
      if (data?.topbar_settings) {
        setTopbarSettings(prev => ({
          ...prev,
          ...data.topbar_settings
        }));
      }

    } catch (error) {
      console.error('Error fetching navigation settings:', error);
      setNavigationItems(defaultNavItems);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Получение классов для топбара
  const getTopbarClasses = () => {
    const baseClasses = ['topbar'];
    
    if (topbarSettings.stickyHeader) {
      baseClasses.push('sticky', 'top-0', 'z-50');
    }
    
    // Фон
    switch (topbarSettings.backgroundColor) {
      case 'blur':
        baseClasses.push('backdrop-blur-sm', 'bg-white/80', 'dark:bg-dark-900/80');
        break;
      case 'transparent':
        baseClasses.push('bg-transparent');
        break;
      default:
        baseClasses.push('bg-white', 'dark:bg-dark-900');
    }

    // Тень и граница
    if (topbarSettings.showShadow) {
      baseClasses.push('shadow-sm');
    }
    if (topbarSettings.showBorder) {
      baseClasses.push('border-b', 'border-gray-200', 'dark:border-dark-700');
    }

    // Высота
    baseClasses.push(`topbar-${topbarSettings.height}`);

    baseClasses.push('transition-colors', 'duration-200');

    return baseClasses.join(' ');
  };

  // Получение классов для контейнера
  const getContainerClasses = () => {
    const baseClasses = ['flex', 'items-center'];
    
    // Выравнивание
    switch (topbarSettings.alignment) {
      case 'left':
        baseClasses.push('justify-start');
        break;
      case 'right':
        baseClasses.push('justify-end');
        break;
      case 'space-between':
        baseClasses.push('justify-between');
        break;
      default:
        baseClasses.push('justify-between'); // По умолчанию используем space-between для лого и меню
    }

    // Ширина контейнера
    if (topbarSettings.maxWidth === 'container') {
      baseClasses.push('container', 'mx-auto', 'px-4', 'md:px-6');
    } else {
      baseClasses.push('w-full', 'px-4', 'md:px-6');
    }

    // Отступы в зависимости от размера
    switch (topbarSettings.spacing) {
      case 'compact':
        baseClasses.push('py-1');
        break;
      case 'relaxed':
        baseClasses.push('py-4');
        break;
      default:
        baseClasses.push('py-2');
    }

    return baseClasses.join(' ');
  };

  // Получение классов для мобильного меню
  const getMobileMenuClasses = () => {
    const baseClasses = ['mobile-menu'];
    baseClasses.push(`mobile-menu-${topbarSettings.height}`);
    return baseClasses.join(' ');
  };

  if (loading) {
    return (
      <header className={getTopbarClasses()}>
        <div className={getContainerClasses()}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  const visibleNavItems = navigationItems.filter(item => item.visible);

  return (
    <>
      <header className={getTopbarClasses()}>
        <div className={getContainerClasses()}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={closeMobileMenu}>
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SH</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Science Hub
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className={`hidden md:flex items-center space-x-8 ${
            topbarSettings.alignment === 'center' ? 'flex-1 justify-center' : ''
          }`}>
            {visibleNavItems.map((item, index) => {
              const Icon = topbarSettings.showIcons && item.icon ? iconMap[item.icon as keyof typeof iconMap] : null;
              
              return (
                <Link 
                  key={item.id}
                  to={item.path} 
                  className={`
                    font-medium relative py-4 transition-all duration-200 flex items-center gap-2
                    ${isActivePath(item.path) 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                    }
                    ${topbarSettings.animation === 'slide' ? 'hover:transform hover:-translate-y-0.5' : ''}
                    ${topbarSettings.animation === 'fade' ? 'hover:opacity-70' : ''}
                    ${topbarSettings.animation === 'bounce' ? 'hover:animate-pulse' : ''}
                    ${topbarSettings.style === 'rounded' ? 'hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-full px-3 py-2' : ''}
                  `}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                  {topbarSettings.showBadges && item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {isActivePath(item.path) && topbarSettings.style === 'classic' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"></span>
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors"
              title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors"
                >
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Профиль
                  </span>
                </Link>
                
                <Link
                  to="/admin"
                  className="flex items-center gap-2 p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                >
                  <Settings className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    Админка
                  </span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    Выйти
                  </span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth/login"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Войти
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && topbarSettings.mobileCollapse && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={closeMobileMenu}
          />
          
          {/* Menu Panel */}
          <div className={`fixed ${getMobileMenuClasses()} left-0 right-0 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700 z-50 md:hidden`}>
            <div className="container mx-auto px-4 py-4">
              {/* Navigation Links */}
              <nav className="space-y-2 mb-6">
                {visibleNavItems.map((item) => {
                  const Icon = iconMap[item.id as keyof typeof iconMap];
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                        isActivePath(item.path)
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
                      }`}
                    >
                      {Icon && <Icon className="h-5 w-5" />}
                      <span>{item.label}</span>
                      {topbarSettings.showBadges && item.badge && item.badge > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile User Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
                {user ? (
                  <div className="space-y-2">
                    <Link
                      to="/profile"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 font-medium transition-colors"
                    >
                      <User className="h-5 w-5" />
                      <span>Профиль</span>
                    </Link>
                    
                    <Link
                      to="/admin"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium transition-colors"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Админка</span>
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Выйти</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/auth/login"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-600 text-white font-medium transition-colors"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Войти</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TopBar;