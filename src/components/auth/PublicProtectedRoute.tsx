// src/components/auth/PublicProtectedRoute.tsx
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthCheck } from '../../hooks/useAuthCheck';
import LoginModal from './LoginModal';

type PublicProtectedRouteProps = {
  children: React.ReactNode;
};

const PublicProtectedRoute = ({ children }: PublicProtectedRouteProps) => {
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const { authStatus, isAuthorized } = useAuthCheck({
    requireAuth: true
  });

  // Показываем загрузку пока идет проверка
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Проверка авторизации...
          </p>
        </div>
      </div>
    );
  }

  // Если не авторизован, показываем модальное окно
  if (authStatus === 'unauthenticated') {
    return (
      <>
        <LoginModal 
          isOpen={true} 
          onClose={() => {
            // При закрытии модального окна перенаправляем на главную
          }} 
        />
        <Navigate to="/" state={{ from: location }} replace />
      </>
    );
  }

  // Если авторизован, показываем контент
  return <>{children}</>;
};

export default PublicProtectedRoute;