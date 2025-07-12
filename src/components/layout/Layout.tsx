// src/components/layout/Layout.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ с плавными переходами
import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Footer from './Footer';
import PageTransition from '../ui/PageTransition';
import CustomLoader from '../ui/CustomLoader';

interface LayoutProps {
  children: ReactNode;
  showTransition?: boolean;
  transitionDuration?: number;
}

const Layout = ({ 
  children, 
  showTransition = true,
  transitionDuration = 200 
}: LayoutProps) => {
  const location = useLocation();
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Эффект плавной загрузки при смене роута
  useEffect(() => {
    if (showTransition) {
      setIsPageLoading(true);
      
      // Имитируем время загрузки для плавности
      const timer = setTimeout(() => {
        setIsPageLoading(false);
      }, transitionDuration);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, showTransition, transitionDuration]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex flex-col transition-colors duration-200">
      {/* Header */}
      <TopBar />
      
      {/* Main Content */}
      <main className="flex-1 relative">
        {showTransition ? (
          <PageTransition duration={transitionDuration}>
            <div className="animate-fade-in">
              {children}
            </div>
          </PageTransition>
        ) : (
          <div className="animate-fade-in">
            {children}
          </div>
        )}

        {/* Overlay загрузки для быстрых переходов */}
        {isPageLoading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-30">
            <CustomLoader size="md" showText text="Загружаем..." />
          </div>
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;