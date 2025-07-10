// src/components/ui/PageTransition.tsx - Компонент плавных переходов
import { useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import CustomLoader from './CustomLoader';

interface PageTransitionProps {
  children: ReactNode;
  duration?: number;
  showLoader?: boolean;
}

const PageTransition = ({ 
  children, 
  duration = 300,
  showLoader = true 
}: PageTransitionProps) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // Запускаем переход при изменении роута
    setIsTransitioning(true);

    // Небольшая задержка для плавности
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsTransitioning(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [location.pathname, children, duration]);

  return (
    <div className="relative min-h-screen">
      {/* Контент страницы */}
      <div 
        className={`transition-opacity duration-${duration} ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {displayChildren}
      </div>

      {/* Overlay с загрузчиком при переходе */}
      {isTransitioning && showLoader && (
        <div 
          className={`fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm 
            flex items-center justify-center z-40 transition-opacity duration-${duration}`}
        >
          <div className="text-center">
            <CustomLoader size="lg" showText text="Загружаем страницу..." />
          </div>
        </div>
      )}
    </div>
  );
};

export default PageTransition;