// src/components/admin/AdminLayout.tsx - Обновленный с пунктом управления пользователями
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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
  QrCode,
  Shield,      // НОВАЯ ИКОНКА для управления пользователями
  ArrowRight   // НОВАЯ ИКОНКА для миграции
} from 'lucide-react';

import { toast } from 'react-hot-toast';
import QRScanner from './QRScanner';

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
    { to: '/admin/attendance', icon: Users, label: 'Посещения', shortLabel: 'Посещения' },
    
    // Дополнительные разделы
    { to: '/admin/rent', icon: Building2, label: 'Аренда', shortLabel: 'Аренда' },
    { to: '/admin/coworking', icon: Briefcase, label: 'Коворкинг', shortLabel: 'Коворк' },
    { to: '/admin/about', icon: Info, label: 'О нас', shortLabel: 'О нас' },
    { to: '/admin/navigation', icon: Menu, label: 'Навигация', shortLabel: 'Навиг.' },
    { to: '/admin/calendar', icon: Calendar, label: 'Календарь', shortLabel: 'Календ.' },
    { to: '/admin/event-statistics', icon: TrendingUp, label: 'Статистика мероприятий', shortLabel: 'Стат. мер.' },
    
    // НОВЫЕ ПУНКТЫ МЕНЮ
    { to: '/admin/users', icon: Shield, label: 'Управление пользователями', shortLabel: 'Пользов.' },
    { to: '/admin/speakers-migration', icon: ArrowRight, label: 'Миграция спикеров', shortLabel: 'Миграция' },
    
    // Служебные разделы
    { to: '/admin/export', icon: Download, label: 'Экспорт данных', shortLabel: 'Экспорт' }
  ];

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
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

  const openMobileMenu = () => {
    setIsMobileMenuOpen(true);
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

  const closeQRScanner = () => {
    setShowQRScanner(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">
      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner onClose={closeQRScanner} />
      )}

      {/* Mobile menu backdrop */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static top-0 left-0 z-50 h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 transition-all duration-300
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
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={isMobile ? closeMobileMenu : undefined}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group
                    ${isActive 
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isSidebarCollapsed && !isMobile ? 'mx-auto' : ''}`} />
                  {(!isSidebarCollapsed || isMobile) && (
                    <span className="font-medium truncate">
                      {item.label}
                    </span>
                  )}
                  {(!isSidebarCollapsed || isMobile) && item.to.includes('speakers-migration') && (
                    <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Новое
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-gray-200 dark:border-dark-700 p-2">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
              ${isSidebarCollapsed && !isMobile ? 'justify-center' : ''}
            `}
          >
            <LogOut className="h-5 w-5" />
            {(!isSidebarCollapsed || isMobile) && (
              <span className="font-medium">Выйти</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-12 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button
                onClick={openMobileMenu}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {location.pathname.replace('/admin/', '').replace('/admin', 'dashboard') || 'dashboard'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;