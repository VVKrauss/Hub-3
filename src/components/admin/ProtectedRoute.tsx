// src/components/admin/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthCheck } from '../../hooks/useAuthCheck';
import LoginModal from '../auth/LoginModal';
import { toast } from 'react-hot-toast';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasShownError, setHasShownError] = useState(false);

  const { 
    authStatus, 
    userRole, 
    isAuthorized, 
    user, 
    checkingRole 
  } = useAuthCheck({
    requireAuth: true,
    requireRole: 'Admin'
  });

  // Обработка неавторизованных пользователей
  useEffect(() => {
    if (authStatus === 'loading' || checkingRole) {
      return; // Ждем завершения проверок
    }

    if (authStatus === 'unauthenticated') {
      setShowLoginModal(true);
      return;
    }

    if (authStatus === 'authenticated' && user && userRole !== 'Admin' && !hasShownError) {
      toast.error('У вас нет доступа к панели управления');
      setHasShownError(true);
      navigate('/');
      return;
    }

    if (isAuthorized) {
      setShowLoginModal(false);
      setHasShownError(false);
    }
  }, [authStatus, userRole, isAuthorized, user, checkingRole, navigate, hasShownError]);

  // Показываем загрузку пока идут проверки
  if (authStatus === 'loading' || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Проверка прав доступа...
          </p>
        </div>
      </div>
    );
  }

  // Показываем контент только если пользователь авторизован
  return (
    <>
      {!isAuthorized && (
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => {
            setShowLoginModal(false);
            navigate('/');
          }} 
        />
      )}
      {isAuthorized ? children : null}
    </>
  );
};

export default ProtectedRoute;