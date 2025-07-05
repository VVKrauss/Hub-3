// src/components/debug/LoadingDebug.tsx
// Добавьте этот компонент в Layout для отладки

import { useEffect, useState } from 'react';

const LoadingDebug = () => {
  const [debugInfo, setDebugInfo] = useState({
    timestamp: Date.now(),
    effectCalls: 0,
    networkCalls: 0,
    lastError: null as string | null,
    activeRequests: new Set<string>()
  });

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
        setDebugInfo(prev => ({
          ...prev,
          lastError: error.message,
          activeRequests: new Set([...prev.activeRequests].filter(r => r !== url))
        }));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Отслеживаем активность useEffect
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      effectCalls: prev.effectCalls + 1,
      timestamp: Date.now()
    }));
  });

  // Показываем только в development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const activeRequestsArray = Array.from(debugInfo.activeRequests);

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-90 text-white p-3 rounded-lg z-50 text-xs max-w-xs">
      <h4 className="font-bold mb-2 text-yellow-400">🔧 Отладка зависаний</h4>
      <div className="space-y-1">
        <div>
          Effect вызовы: 
          <span className={debugInfo.effectCalls > 50 ? 'text-red-400 font-bold' : 'text-green-400'}>
            {debugInfo.effectCalls}
          </span>
        </div>
        
        <div>
          Сетевые запросы: 
          <span className={debugInfo.networkCalls > 100 ? 'text-red-400' : 'text-blue-400'}>
            {debugInfo.networkCalls}
          </span>
        </div>
        
        <div>
          Активные запросы: 
          <span className={activeRequestsArray.length > 5 ? 'text-red-400' : 'text-green-400'}>
            {activeRequestsArray.length}
          </span>
        </div>

        {activeRequestsArray.length > 0 && (
          <div className="mt-2">
            <div className="text-yellow-400 font-bold">Активные:</div>
            {activeRequestsArray.slice(0, 3).map((url, i) => (
              <div key={i} className="text-xs text-gray-300 truncate">
                {url.split('/').pop()}
              </div>
            ))}
            {activeRequestsArray.length > 3 && (
              <div className="text-xs text-gray-400">
                ...и еще {activeRequestsArray.length - 3}
              </div>
            )}
          </div>
        )}

        {debugInfo.lastError && (
          <div className="mt-2">
            <div className="text-red-400 font-bold">Последняя ошибка:</div>
            <div className="text-xs text-red-300 break-words">
              {debugInfo.lastError}
            </div>
          </div>
        )}

        <div className="text-gray-400 mt-2">
          {new Date(debugInfo.timestamp).toLocaleTimeString()}
        </div>

        {debugInfo.effectCalls > 50 && (
          <div className="bg-red-800 text-white p-1 rounded mt-2 text-center">
            ⚠️ ВОЗМОЖНА УТЕЧКА!
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingDebug;// src/components/debug/LoadingDebug.tsx
// Добавьте этот компонент в Layout для отладки

import { useEffect, useState } from 'react';

const LoadingDebug = () => {
  const [debugInfo, setDebugInfo] = useState({
    timestamp: Date.now(),
    effectCalls: 0,
    networkCalls: 0,
    lastError: null as string | null,
    activeRequests: new Set<string>()
  });

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
        setDebugInfo(prev => ({
          ...prev,
          lastError: error.message,
          activeRequests: new Set([...prev.activeRequests].filter(r => r !== url))
        }));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Отслеживаем активность useEffect
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      effectCalls: prev.effectCalls + 1,
      timestamp: Date.now()
    }));
  });

  // Показываем только в development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const activeRequestsArray = Array.from(debugInfo.activeRequests);

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-90 text-white p-3 rounded-lg z-50 text-xs max-w-xs">
      <h4 className="font-bold mb-2 text-yellow-400">🔧 Отладка зависаний</h4>
      <div className="space-y-1">
        <div>
          Effect вызовы: 
          <span className={debugInfo.effectCalls > 50 ? 'text-red-400 font-bold' : 'text-green-400'}>
            {debugInfo.effectCalls}
          </span>
        </div>
        
        <div>
          Сетевые запросы: 
          <span className={debugInfo.networkCalls > 100 ? 'text-red-400' : 'text-blue-400'}>
            {debugInfo.networkCalls}
          </span>
        </div>
        
        <div>
          Активные запросы: 
          <span className={activeRequestsArray.length > 5 ? 'text-red-400' : 'text-green-400'}>
            {activeRequestsArray.length}
          </span>
        </div>

        {activeRequestsArray.length > 0 && (
          <div className="mt-2">
            <div className="text-yellow-400 font-bold">Активные:</div>
            {activeRequestsArray.slice(0, 3).map((url, i) => (
              <div key={i} className="text-xs text-gray-300 truncate">
                {url.split('/').pop()}
              </div>
            ))}
            {activeRequestsArray.length > 3 && (
              <div className="text-xs text-gray-400">
                ...и еще {activeRequestsArray.length - 3}
              </div>
            )}
          </div>
        )}

        {debugInfo.lastError && (
          <div className="mt-2">
            <div className="text-red-400 font-bold">Последняя ошибка:</div>
            <div className="text-xs text-red-300 break-words">
              {debugInfo.lastError}
            </div>
          </div>
        )}

        <div className="text-gray-400 mt-2">
          {new Date(debugInfo.timestamp).toLocaleTimeString()}
        </div>

        {debugInfo.effectCalls > 50 && (
          <div className="bg-red-800 text-white p-1 rounded mt-2 text-center">
            ⚠️ ВОЗМОЖНА УТЕЧКА!
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingDebug;