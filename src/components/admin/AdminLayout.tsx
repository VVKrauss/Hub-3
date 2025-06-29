// src/pages/admin/AdminLayout.tsx - Обновленная навигация

import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  BarChart3, 
  FileText, 
  UserCog,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser({
          ...session.user,
          profile
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Вы вышли из системы');
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Ошибка при выходе');
    }
  };

  const navigationItems = [
    {
      name: 'Главная страница',
      href: '/admin',
      icon: Home,
      current: location.pathname === '/admin'
    },
    {
      name: 'Мероприятия',
      href: '/admin/events',
      icon: Calendar,
      current: location.pathname.startsWith('/admin/events')
    },
    {
      name: 'Спикеры',
      href: '/admin/speakers',
      icon: Users,
      current: location.pathname.startsWith('/admin/speakers')
    },
    {
      name: 'Пользователи',
      href: '/admin/users',
      icon: UserCog,
      current: location.pathname.startsWith('/admin/users')
    },
    {
      name: 'Отчеты',
      href: '/admin/reports',
      icon: BarChart3,
      current: location.pathname.startsWith('/admin/reports')
    },
    {
      name: 'Страницы',
      href: '/admin/pages',
      icon: FileText,
      current: location.pathname.startsWith('/admin/pages')
    },
    {
      name: 'Настройки',
      href: '/admin/settings',
      icon: Settings,
      current: location.pathname.startsWith('/admin/settings')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
        />
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-dark-800 shadow-xl transform transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent navigationItems={navigationItems} user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent navigationItems={navigationItems} user={user} onLogout={handleLogout} />
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-dark-800 shadow border-b border-gray-200 dark:border-dark-700">
          <button
            className="px-4 border-r border-gray-200 dark:border-dark-700 text-gray-500 dark:text-dark-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Панель управления
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.profile?.name || user.email}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-dark-400">
                      {user.profile?.role}
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {(user.profile?.name || user.email)?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const SidebarContent = ({ navigationItems, user, onLogout }: any) => {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700">
      <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Админ панель
          </span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                item.current
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-dark-300 hover:bg-gray-50 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <item.icon
                className={`mr-3 flex-shrink-0 h-5 w-5 ${
                  item.current
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-dark-400 group-hover:text-gray-500 dark:group-hover:text-dark-300'
                }`}
              />
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* User info and logout */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-dark-700">
          {user && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2">
                <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    {(user.profile?.name || user.email)?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.profile?.name || user.email}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-400">
                    {user.profile?.role}
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;