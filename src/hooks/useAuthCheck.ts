// src/hooks/useAuthCheck.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
type UserRole = 'Admin' | 'User' | null;

interface UseAuthCheckOptions {
  requireAuth?: boolean;
  requireRole?: UserRole;
  redirectOnFail?: boolean;
}

interface UseAuthCheckReturn {
  authStatus: AuthStatus;
  userRole: UserRole;
  isAuthorized: boolean;
  user: any;
  checkingRole: boolean;
}

export const useAuthCheck = (options: UseAuthCheckOptions = {}): UseAuthCheckReturn => {
  const { 
    requireAuth = false, 
    requireRole = null, 
    redirectOnFail = false 
  } = options;

  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [checkingRole, setCheckingRole] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  // Определяем статус авторизации
  useEffect(() => {
    if (!authLoading) {
      setAuthStatus(user ? 'authenticated' : 'unauthenticated');
    }
  }, [user, authLoading]);

  // Получаем роль пользователя, если он авторизован
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user || !requireRole) {
        setUserRole(null);
        return;
      }

      setCheckingRole(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Ошибка получения роли пользователя:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
        }
      } catch (error) {
        console.error('Ошибка при запросе роли:', error);
        setUserRole(null);
      } finally {
        setCheckingRole(false);
      }
    };

    fetchUserRole();
  }, [user, requireRole]);

  // Определяем, авторизован ли пользователь согласно требованиям
  const isAuthorized = (() => {
    // Если загрузка еще идет
    if (authLoading || (requireRole && checkingRole)) {
      return false;
    }

    // Если требуется авторизация, но пользователь не авторизован
    if (requireAuth && !user) {
      return false;
    }

    // Если требуется определенная роль
    if (requireRole && userRole !== requireRole) {
      return false;
    }

    return true;
  })();

  return {
    authStatus,
    userRole,
    isAuthorized,
    user,
    checkingRole
  };
};