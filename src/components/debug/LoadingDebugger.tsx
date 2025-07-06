// src/components/debug/LoadingDebugger.tsx
// Простой компонент для диагностики зависаний страниц

import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const LoadingDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({
    renderCount: 0,
    effectCalls: 0,
    currentPath: '',
    lastNavigation: '',
    activeRequests: new Set<string>(),
    errors: [] as string[],
    timestamp: Date.now()
  });
  
  const location = useLocation();
  const renderCountRef = useRef(0);

  // Отслеживаем рендеры
  useEffect(() => {
    renderCountRef.current++;
    setDebugInfo(prev => ({
      ...prev,
      renderCount: renderCountRef.current,
      currentPath: location.pathname,
      timestamp: Date.now()
    }));
  });

  // Отслеживаем вызовы useEffect
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      effectCalls: prev.effectCalls + 1
    }));
  });

  // Отслеживаем навигацию
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      lastNavigation: `${new Date().toLocaleTimeString()}: ${location.pathname}`,
      // Сброс счетчиков при смене страницы
      renderCount: 0,
      effectCalls: 0
    }));
    
    renderCountRef.current = 0;
    console.log(`🔄 Navigation to: ${location.pathname}`);
  }, [location.pathname]);

  // Перехватываем fetch запросы
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = args[0].toString();
      
      setDebugInfo(prev => ({
        ...prev,
        activeRequests: new Set([...prev.activeRequests, url])
      }));

      try {
        const response = await originalFetch(...args);
        
        setDebugInfo(prev => {
          const newActiveRequests = new Set(prev.activeRequests);
          newActiveRequests.delete(url);
          return {
            ...prev,
            activeRequests: newActiveRequests
          };
        });

        return response;
      } catch (error) {
        setDebugInfo(prev => {
          const newActiveRequests = new Set(prev.activeRequests);
          newActiveRequests.delete(url);
          return {
            ...prev,
            activeRequests: newActiveRequests,
            errors: [...prev.errors.slice(-4), `Fetch error: ${error.message}`]
          };
        });
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Перехватываем общие ошибки
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors.slice(-4), `JS Error: ${event.message}`]
      }));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors.slice(-4), `Promise rejection: ${event.reason}`]
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Показываем только в development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const activeRequestsArray = Array.from(debugInfo.activeRequests);

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded-lg z-50 text-xs max-w-sm font-mono">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-yellow-400">🔧 Debug</h4>
        <button 
          onClick={() => setDebugInfo(prev => ({ ...prev, renderCount: 0, effectCalls: 0, errors: [] }))}
          className="text-xs text-gray-400 hover:text-white"
        >
          Reset
        </button>
      </div>
      
      <div className="space-y-1">
        {/* Основные метрики */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            Renders: 
            <span className={debugInfo.renderCount > 10 ? 'text-red-400 font-bold ml-1' : 'text-green-400 ml-1'}>
              {debugInfo.renderCount}
            </span>
          </div>
          <div>
            Effects: 
            <span className={debugInfo.effectCalls > 20 ? 'text-red-400 font-bold ml-1' : 'text-green-400 ml-1'}>
              {debugInfo.effectCalls}
            </span>
          </div>
        </div>

        {/* Текущий путь */}
        <div className="text-blue-400 truncate">
          Path: {debugInfo.currentPath}
        </div>

        {/* Активные запросы */}
        <div>
          Active requests: 
          <span className={activeRequestsArray.length > 3 ? 'text-red-400 font-bold ml-1' : 'text-blue-400 ml-1'}>
            {activeRequestsArray.length}
          </span>
        </div>

        {/* Список активных запросов */}
        {activeRequestsArray.length > 0 && (
          <div className="text-orange-400">
            <div className="text-xs">Pending:</div>
            {activeRequestsArray.slice(0, 3).map((url, index) => (
              <div key={index} className="text-xs truncate pl-2">
                • {url.split('/').pop()}
              </div>
            ))}
            {activeRequestsArray.length > 3 && (
              <div className="text-xs pl-2">... +{activeRequestsArray.length - 3} more</div>
            )}
          </div>
        )}

        {/* Последние ошибки */}
        {debugInfo.errors.length > 0 && (
          <div className="text-red-400">
            <div className="text-xs">Recent errors:</div>
            {debugInfo.errors.slice(-2).map((error, index) => (
              <div key={index} className="text-xs truncate pl-2">
                • {error.substring(0, 40)}...
              </div>
            ))}
          </div>
        )}

        {/* Время последнего обновления */}
        <div className="text-gray-500 text-xs">
          Updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
        </div>

        {/* Предупреждения */}
        {debugInfo.renderCount > 15 && (
          <div className="text-red-400 font-bold animate-pulse">
            ⚠️ TOO MANY RENDERS!
          </div>
        )}
        
        {debugInfo.effectCalls > 30 && (
          <div className="text-red-400 font-bold animate-pulse">
            ⚠️ TOO MANY EFFECTS!
          </div>
        )}

        {activeRequestsArray.length > 5 && (
          <div className="text-red-400 font-bold animate-pulse">
            ⚠️ TOO MANY REQUESTS!
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingDebugger;