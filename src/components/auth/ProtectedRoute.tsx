// src/components/auth/ProtectedRoute.tsx
// ИСПРАВЛЕНО: используем единственный экземпляр Supabase

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase'; // ← ИСПОЛЬЗУЕМ ЕДИНСТВЕННЫЙ ЭКЗЕМПЛЯР
// НЕ СОЗДАЕМ НОВЫЙ: const supabase = createClient(...)

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setAuthenticated(true);
          
          if (requireAdmin) {
            // Проверяем права администратора
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            setIsAdmin(profile?.role === 'admin');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Подписка на изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuthenticated(false);
        setIsAdmin(false);
      } else if (event === 'SIGNED_IN' && session) {
        setAuthenticated(true);
        
        if (requireAdmin) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setIsAdmin(profile?.role === 'admin');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [requireAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// ВАЖНО: Убедитесь что в ProtectedRoute.tsx НЕТ строки:
// const supabase = createClient(supabaseUrl, supabaseKey);
//
// Должен быть только импорт:
// import { supabase } from '../../lib/supabase';