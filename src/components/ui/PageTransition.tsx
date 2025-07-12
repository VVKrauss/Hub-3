// src/components/ui/PageTransition.tsx - Полностью переписанный компонент с единым лоадером
import { useState, useEffect, ReactNode, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import CustomLoader from './CustomLoader';

interface PageTransitionProps {
  children: ReactNode;
  duration?: number;
  showLoader?: boolean;
  disableTransition?: boolean;
  loadingText?: string;
}

const PageTransition = ({ 
  children, 
  duration = 250,
  showLoader = true,
  disableTransition = false,
  loadingText = "Загружаем страницу..."
}: PageTransitionProps) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [showContent, setShowContent] = useState(true);
  const transitionRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Очищаем предыдущие таймеры
    if (transitionRef.current) clearTimeout(transitionRef.current);
    if (contentRef.current) clearTimeout(contentRef.current);

    // Если переходы отключены, просто обновляем контент
    if (disableTransition) {
      setDisplayChildren(children);
      setShowContent(true);
      setIsTransitioning(false);
      return;
    }

    // Начинаем переход
    setIsTransitioning(true);
    setShowContent(false);

    // Фаза 1: Скрываем старый контент (быстро)
    contentRef.current = setTimeout(() => {
      setDisplayChildren(children);
    }, duration / 3);

    // Фаза 2: Показываем новый контент
    transitionRef.current = setTimeout(() => {
      setShowContent(true);
      setIsTransitioning(false);
    }, duration);

    return () => {
      if (transitionRef.current) clearTimeout(transitionRef.current);
      if (contentRef.current) clearTimeout(contentRef.current);
    };
  }, [location.pathname, children, duration, disableTransition]);

  // Если переходы отключены
  if (disableTransition) {
    return (
      <div className="animate-fade-in">
        {displayChildren}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Основной контент страницы */}
      <div 
        className={`transition-all ease-out ${
          showContent 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-2'
        }`}
        style={{ 
          transitionDuration: `${duration}ms`,
          transitionProperty: 'opacity, transform'
        }}
      >
        {displayChildren}
      </div>

      {/* Overlay с кастомным лоадером во время перехода */}
      {isTransitioning && showLoader && (
        <div 
          className={`fixed inset-0 z-50 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            background: 'rgba(107, 114, 128, 0.75)' // gray-500 с прозрачностью
          }}
        >
          <div className="min-h-screen flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-xl">
              <CustomLoader 
                size="lg" 
                showText 
                text={loadingText}
                className="text-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* Дополнительный fade для плавности */}
      {isTransitioning && (
        <div 
          className="fixed inset-0 pointer-events-none z-40"
          style={{
            background: `linear-gradient(45deg, 
              rgba(107, 114, 128, 0.1), 
              rgba(75, 85, 99, 0.1)
            )`,
            animation: `fadeInOut ${duration}ms ease-in-out`
          }}
        />
      )}

      <style jsx>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PageTransition;