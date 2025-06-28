import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../ui/Logo';
import LoginModal from '../auth/LoginModal';
import UserProfileDropdown from '../ui/UserProfileDropdown';

type NavItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
};

type UserData = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
} | null;

type TopbarHeight = 'compact' | 'standard' | 'large';

const TopBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<UserData>(null);
  const [topbarHeight, setTopbarHeight] = useState<TopbarHeight>('standard');
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNavItems();
    fetchTopbarSettings();
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // Close mobile menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      
      setUser({
        id: userId,
        email: session?.user.email || '',
        name: profile?.name || session?.user.user_metadata?.name,
        role: profile?.role,
        avatar: profile?.avatar
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Still set basic user info even if profile fetch fails
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name
        });
      }
    }
  };

  const fetchNavItems = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('navigation_items')
        .single();

      if (error) throw error;

      if (data?.navigation_items) {
        setNavItems(data.navigation_items);
      }
    } catch (error) {
      console.error('Error fetching navigation items:', error);
    }
  };

  const fetchTopbarSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('topbar_settings')
        .single();

      if (error) throw error;

      if (data?.topbar_settings?.height) {
        setTopbarHeight(data.topbar_settings.height);
      }
    } catch (error) {
      console.error('Error fetching topbar settings:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const visibleNavItems = navItems.filter(item => item.visible);

  // Определяем класс высоты топбара
  const topbarHeightClass = `topbar-${topbarHeight}`;

  // Определяем высоту для мобильного меню в зависимости от размера топбара
  const getMobileMenuTop = () => {
    switch (topbarHeight) {
      case 'compact': return 'top-12';
      case 'standard': return 'top-14';
      case 'large': return 'top-20';
      default: return 'top-16';
    }
  };

  return (
    <header className={`topbar ${topbarHeightClass}`}>
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
          <Logo className="h-10 w-auto" inverted={theme === 'dark'} />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
          {visibleNavItems.map(item => (
            <Link 
              key={item.id}
              to={item.path} 
              className={`font-medium relative py-4 ${
                location.pathname === item.path 
                  ? 'text-primary dark:text-primary-400 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400' 
                  : 'hover:text-primary dark:hover:text-primary-400'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="flex md:flex-none items-center gap-4">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full hover:bg-dark-100 dark:hover:bg-dark-800"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {user ? (
            <UserProfileDropdown 
              user={user} 
              onLogout={handleLogout} 
            />
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-2 p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md"
            >
              <LogIn className="h-5 w-5" />
              <span className="hidden sm:inline">Войти</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 md:hidden rounded-md text-dark-900 dark:text-white hover:bg-dark-100 dark:hover:bg-dark-800"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div 
            ref={menuRef}
            className={`mobile-menu md:hidden absolute ${getMobileMenuTop()} left-0 right-0 bg-white dark:bg-dark-900 shadow-lg z-50 animate-fade-in`}
          >
            <nav className="container py-5 flex flex-col space-y-4">
              {visibleNavItems.map(item => (
                <Link 
                  key={item.id}
                  to={item.path} 
                  className={`py-2 font-medium ${
                    location.pathname === item.path 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {!user && (
                <button
                  onClick={() => {
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="py-2 font-medium text-left text-primary-600 dark:text-primary-400"
                >
                  Войти / Зарегистрироваться
                </button>
              )}
              {user && (
                <>
                  <Link
                    to="/profile"
                    className="py-2 font-medium hover:text-primary-600 dark:hover:text-primary-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Мой профиль
                  </Link>
                  {user.role === 'Admin' && (
                    <Link
                      to="/admin"
                      className="py-2 font-medium hover:text-primary-600 dark:hover:text-primary-400"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Панель управления
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 font-medium text-left text-red-600 dark:text-red-400"
                  >
                    Выйти
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </header>
  );
};

export default TopBar;