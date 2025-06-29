// src/components/admin/AdminLayout.tsx
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  UserCog, // Новая иконка для пользователей
  Building2, 
  Briefcase,
  Info,
  BarChart3,
  Menu,
  LogOut,
  Download,
  Bell, 
  Settings,
  User,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  QrCode
} from 'lucide-react';

import { toast } from 'react-hot-toast';
import QRScanner from './QRScanner';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Проверяем размер экрана
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const navItems = [
    // Основные разделы
    { to: '/admin', icon: LayoutDashboard, label: 'Главная страница', shortLabel: 'Главная', end: true },
    { to: '/admin/events', icon: Calendar, label: 'Мероприятия', shortLabel: 'События' },
    { to: '/admin/speakers', icon: Users, label: 'Спикеры', shortLabel: 'Спикеры' },
    { to: '/admin/users', icon: UserCog, label: 'Пользователи', shortLabel: 'Польз.' }, // НОВЫЙ ПУНКТ
    { to: '/admin/attendance', icon: Users, label: 'Посещения', shortLabel: 'Посещения' },
    
    // Дополнительные разделы
    { to: '/admin/rent', icon: Building2, label: 'Аренда', shortLabel: 'Аренда' },
    { to: '/admin/coworking', icon: Briefcase, label: 'Коворкинг', shortLabel: 'Коворк' },
    { to: '/admin/about', icon: Info, label: 'О нас', shortLabel: 'О нас' },
    { to: '/admin/navigation', icon: Menu, label: 'Навигация', shortLabel: 'Навиг.' },
    { to: '/admin/calendar', icon: Calendar, label: 'Календарь', shortLabel: 'Календ.' },
    { to: '/admin/event-statistics', icon: TrendingUp, label: 'Статистика мероприятий', shortLabel: 'Стат. мер.' },
    { to: '/admin/export', icon: Download, label: 'Экспорт данных', shortLabel: 'Экспорт' }
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Вы вышли из системы');
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Ошибка при выходе');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const openQRScanner = () => {
    setShowQRScanner(true);
    closeMobileMenu();
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
  };

  const handleScanSuccess = (result: string) => {
    // Логика обработки QR кода
    console.log('Scanned QR:', result);
    toast.success(`QR код отсканирован: ${result}`);
    closeQRScanner();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">
      {/* Mobile menu overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 z-50
        transition-all duration-300 ease-in-out
        ${isMobile ? 
          `fixed inset-y-0 left-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
          : `${isSidebarCollapsed ? 'w-16' : 'w-64'}`
        }
      `}>
        {/* Sidebar header */}
        <div className={`
          h-12 flex items-center border-b border-gray-200 dark:border-dark-700
          ${isSidebarCollapsed && !isMobile ? 'justify-center px-2' : 'justify-between px-4'}
        `}>
          {(!isSidebarCollapsed || isMobile) && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Админ панель
              </h1>
            </div>
          )}
          
          {!isMobile && (
            <div className="flex items-center gap-2">
              {/* QR Scanner button always visible */}
              <button
                onClick={openQRScanner}
                className="p-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors"
                title="QR Сканер"
              >
                <QrCode className="h-4 w-4" />
              </button>
              
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          {isMobile && (
            <button
              onClick={closeMobileMenu}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick QR Scanner Access in sidebar */}
        {(!isSidebarCollapsed || isMobile) && (
          <div className="p-2 border-b border-gray-200 dark:border-dark-700">
            <button
              onClick={openQRScanner}
              className="w-full flex items-center gap-3 px-3 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
            >
              <QrCode className="h-5 w-5" />
              <span>QR Сканер</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end} // Используем проп end для точного совпадения пути
                  onClick={isMobile ? closeMobileMenu : undefined}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                    }
                    ${isSidebarCollapsed && !isMobile ? 'justify-center' : ''}
                  `}
                  title={isSidebarCollapsed && !isMobile ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {(!isSidebarCollapsed || isMobile) && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-gray-200 dark:border-dark-700 p-2">
          {(!isSidebarCollapsed || isMobile) && (
            <div className="space-y-2">
              <NavLink
                to="/"
                className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors"
                onClick={isMobile ? closeMobileMenu : undefined}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm">Вернуться на сайт</span>
              </NavLink>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Выйти</span>
              </button>
            </div>
          )}

          {isSidebarCollapsed && !isMobile && (
            <div className="space-y-2">
              <NavLink
                to="/"
                className="flex justify-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors"
                title="Вернуться на сайт"
              >
                <ExternalLink className="h-4 w-4" />
              </NavLink>
              
              <button
                onClick={handleLogout}
                className="w-full flex justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Выйти"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isMobile && (
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Панель управления
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Управление содержимым сайта
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openQRScanner}
                className="p-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors md:hidden"
                title="QR Сканер"
              >
                <QrCode className="h-5 w-5" />
              </button>
              
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 relative">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </button>
              
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onClose={closeQRScanner}
        />
      )}
    </div>
  );
};

export default AdminLayout;