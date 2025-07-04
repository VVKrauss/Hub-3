// src/components/debug/LoadingDebug.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const LoadingDebug = () => {
  const { user, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState({
    timestamp: Date.now(),
    supabaseConnected: false,
    networkStatus: 'unknown',
    sessionCheck: 'pending'
  });

  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        setDebugInfo(prev => ({
          ...prev,
          supabaseConnected: !error,
          sessionCheck: error ? 'failed' : 'success'
        }));
      } catch (error) {
        setDebugInfo(prev => ({
          ...prev,
          supabaseConnected: false,
          sessionCheck: 'error'
        }));
      }
    };

    const checkNetworkStatus = () => {
      setDebugInfo(prev => ({
        ...prev,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      }));
    };

    checkSupabaseConnection();
    checkNetworkStatus();

    window.addEventListener('online', checkNetworkStatus);
    window.addEventListener('offline', checkNetworkStatus);

    return () => {
      window.removeEventListener('online', checkNetworkStatus);
      window.removeEventListener('offline', checkNetworkStatus);
    };
  }, []);

  // Показываем только в режиме разработки
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-50 text-xs max-w-xs">
      <h4 className="font-bold mb-2">🔧 Отладка загрузки</h4>
      <div className="space-y-1">
        <div>Auth Loading: <span className={loading ? 'text-red-400' : 'text-green-400'}>{loading ? 'Да' : 'Нет'}</span></div>
        <div>User: <span className={user ? 'text-green-400' : 'text-gray-400'}>{user ? '✓' : '✗'}</span></div>
        <div>Supabase: <span className={debugInfo.supabaseConnected ? 'text-green-400' : 'text-red-400'}>{debugInfo.supabaseConnected ? '✓' : '✗'}</span></div>
        <div>Network: <span className={debugInfo.networkStatus === 'online' ? 'text-green-400' : 'text-red-400'}>{debugInfo.networkStatus}</span></div>
        <div>Session: <span className={debugInfo.sessionCheck === 'success' ? 'text-green-400' : 'text-red-400'}>{debugInfo.sessionCheck}</span></div>
        <div className="text-gray-400">
          Время: {new Date(debugInfo.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default LoadingDebug;