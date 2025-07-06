// src/components/debug/LoadingDebugger.tsx
// УЛУЧШЕННАЯ ВЕРСИЯ существующего отладчика

import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const LoadingDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({
    renderCount: 0,
    effectCalls: 0,
    networkCalls: 0,
    activeRequests: new Set<string>(),
    lastError: null as string | null,
    timestamp: Date.now()
  });
  
  const location = useLocation();
  const renderCountRef = useRef(0);

  // ДОБАВЛЯЕМ: Считаем рендеры
  renderCountRef.current++;
  setDebugInfo(prev => ({
    ...prev,
    renderCount: renderCountRef.current,
    timestamp: Date.now()
  }));

  // Считаем effects
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      effectCalls: prev.effectCalls + 1
    }));
  });

  // Сброс при смене страницы
  useEffect(() => {
    renderCountRef.current = 0;
    setDebugInfo(prev => ({
      ...prev,
      renderCount: 0,
      effectCalls: 0,
      networkCalls: 0,
      activeRequests: new Set()
    }));
  }, [location.pathname]);

  // Перехватываем fetch запросы
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = args[0].toString();
      
      setDebugInfo(prev => ({
        ...prev,
        networkCalls: prev.networkCalls + 1,
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
            lastError: error.message,
            activeRequests: newActiveRequests
          };
        });
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Показываем только в development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const activeRequestsArray = Array.from(debugInfo.activeRequests);

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded-lg z-50 text-xs font-mono max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-yellow-400">🔧 Debug</h4>
        <button 
          onClick={() => {
            renderCountRef.current = 0;
            setDebugInfo(prev => ({ 
              ...prev, 
              renderCount: 0, 
              effectCalls: 0, 
              networkCalls: 0,
              activeRequests: new Set(),
              lastError: null
            }));
          }}
          className="text-xs text-gray-400 hover:text-white"
        >
          Reset
        </button>
      </div>
      
      <div className="space-y-1">
        {/* ГЛАВНЫЕ МЕТРИКИ */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            Renders: 
            <span className={debugInfo.renderCount > 15 ? 'text-red-400 font-bold ml-1' : 'text-green-400 ml-1'}>
              {debugInfo.renderCount}
            </span>
          </div>
          <div>
            Effects: 
            <span className={debugInfo.effectCalls > 30 ? 'text-red-400 font-bold ml-1' : 'text-green-400 ml-1'}>
              {debugInfo.effectCalls}
            </span>
          </div>
        </div>

        <div>
          Network: 
          <span className={debugInfo.networkCalls > 20 ? 'text-red-400 ml-1' : 'text-blue-400 ml-1'}>
            {debugInfo.networkCalls}
          </span>
        </div>
        
        <div>
          Active: 
          <span className={activeRequestsArray.length > 3 ? 'text-red-400 font-bold ml-1' : 'text-green-400 ml-1'}>
            {activeRequestsArray.length}
          </span>
        </div>

        {/* Путь */}
        <div className="text-blue-400 truncate text-xs">
          {location.pathname}
        </div>

        {/* Активные запросы */}
        {activeRequestsArray.length > 0 && (
          <div className="text-orange-400">
            <div className="text-xs">Pending:</div>
            {activeRequestsArray.slice(0, 2).map((url, i) => (
              <div key={i} className="text-xs truncate pl-1">
                • {url.split('/').pop()}
              </div>
            ))}
            {activeRequestsArray.length > 2 && (
              <div className="text-xs pl-1">+{activeRequestsArray.length - 2} more</div>
            )}
          </div>
        )}

        {/* Ошибки */}
        {debugInfo.lastError && (
          <div className="text-red-400">
            <div className="text-xs">Error:</div>
            <div className="text-xs truncate pl-1">
              {debugInfo.lastError.substring(0, 30)}...
            </div>
          </div>
        )}

        {/* Время */}
        <div className="text-gray-500 text-xs">
          {new Date(debugInfo.timestamp).toLocaleTimeString()}
        </div>

        {/* КРИТИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ */}
        {debugInfo.renderCount > 20 && (
          <div className="text-red-400 font-bold animate-pulse">
            ⚠️ TOO MANY RENDERS!
          </div>
        )}
        
        {debugInfo.effectCalls > 50 && (
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