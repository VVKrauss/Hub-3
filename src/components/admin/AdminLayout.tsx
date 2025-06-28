// src/components/admin/AdminLayout.tsx
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
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
    { to: '/admin', icon: LayoutDashboard, label: 'Главная страница', shortLabel: 'Главная' },
    { to: '/admin/events', icon: Calendar, label: 'Мероприятия', shortLabel: 'События' },
    { to: '/admin/speakers', icon: Users, label: 'Спикеры', shortLabel: 'Спикеры' },
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/');
      toast.success('Вы успешно вышли из системы');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Ошибка при выходе из системы');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const openQRScanner = () => {
    setShowQRScanner(true);
    if (isMobile) {
      closeMobileMenu();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Top bar for mobile */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 z-30 h-14 flex items-center justify-between px-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <h1 className="text-lg font-semibold">Админ панель</h1>
          
          {/* QR Scanner button in mobile header */}
          <button
            onClick={openQRScanner}
            className="p-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white"
            title="QR Сканер"
          >
            <QrCode className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 z-50
        transition-all duration-300 ease-in-out
        ${isMobile 
          ? `${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
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
              const isActive = location.pathname === item.to || 
                (item.to === '/admin' && location.pathname === '/admin');
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={isMobile ? closeMobileMenu : undefined}
                  className={({ isActive: navIsActive }) => `
                    group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${navIsActive || isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }
                    ${isSidebarCollapsed && !isMobile ? 'justify-center' : ''}
                  `}
                  title={isSidebarCollapsed && !isMobile ? item.label : ''}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {(!isSidebarCollapsed || isMobile) && (
                    <span className="text-sm font-medium">
                      {item.label}
                    </span>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isSidebarCollapsed && !isMobile && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Logout button */}
        <div className="border-t border-gray-200 dark:border-dark-700 p-2">
          <button
            onClick={handleLogout}
            className={`
              group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
              transition-all duration-200
              ${isSidebarCollapsed && !isMobile ? 'justify-center' : ''}
            `}
            title={isSidebarCollapsed && !isMobile ? 'Выйти' : ''}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {(!isSidebarCollapsed || isMobile) && <span className="text-sm">Выйти</span>}
            
            {/* Tooltip for collapsed state */}
            {isSidebarCollapsed && !isMobile && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Выйти
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`
        transition-all duration-300 ease-in-out
        ${isMobile 
          ? 'ml-0 pt-14' 
          : `${isSidebarCollapsed ? 'ml-16' : 'ml-64'} pt-12`
        }
        p-3 md:p-4
      `}>
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-3 md:p-6 min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
      </main>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;