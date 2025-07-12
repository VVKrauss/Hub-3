// src/components/layout/Layout.tsx - Оптимизированная версия с единым лоадером
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
  disablePageTransition?: boolean;
}

const Layout = ({ 
  children, 
  showTransition = true,
  transitionDuration = 150,
  disablePageTransition = false
}: LayoutProps) => {
  const location = useLocation();
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Эффект для быстрой загрузки при смене роута
  useEffect(() => {
    if (showTransition && !disablePageTransition) {
      setIsPageLoading(true);
      
      // Быстрая загрузка для лучшего UX
      const timer = setTimeout(() => {
        setIsPageLoading(false);
      }, transitionDuration);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, showTransition, transitionDuration, disablePageTransition]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex flex-col transition-colors duration-200">
      {/* Header */}
      <TopBar />
      
      {/* Main Content */}
      <main className="flex-1 relative">
        {showTransition && !disablePageTransition ? (
          <PageTransition 
            duration={transitionDuration}
            disableTransition={disablePageTransition}
          >
            <div className="animate-fade-in">
              {children}
            </div>
          </PageTransition>
        ) : (
          <div className="animate-fade-in">
            {children}
          </div>
        )}

        {/* Минимальный overlay для быстрых переходов */}
        {isPageLoading && showTransition && (
          <div className="absolute inset-0 bg-gray-500/30 dark:bg-dark-600/30 backdrop-blur-sm flex items-center justify-center z-30">
            <CustomLoader size="sm" />
          </div>
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;