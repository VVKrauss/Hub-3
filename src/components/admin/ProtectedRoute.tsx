import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import LoginModal from '../auth/LoginModal';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        checkUserRole(session?.user.id);
        setIsAuthenticated(true);
        setShowLoginModal(false);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsAuthorized(false);
        setShowLoginModal(true);
        navigate('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthed = !!session;
      setIsAuthenticated(isAuthed);
      
      if (isAuthed) {
        await checkUserRole(session.user.id);
      } else {
        setShowLoginModal(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setIsAuthorized(false);
      setShowLoginModal(true);
    }
  };

  const checkUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      const isAdmin = data?.role === 'Admin';
      setIsAuthorized(isAdmin);
      
      if (!isAdmin) {
        toast.error('У вас нет доступа к панели управления');
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsAuthorized(false);
      toast.error('Ошибка при проверке прав доступа');
      navigate('/');
    }
  };

  if (isAuthenticated === null || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated && (
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => {
            setShowLoginModal(false);
            navigate('/');
          }} 
        />
      )}
      {isAuthenticated && isAuthorized ? children : null}
    </>
  );
};

export default ProtectedRoute;