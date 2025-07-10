// src/components/QuickDiagnostics.tsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Database, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DiagnosticStatus {
  db: boolean | null;
  auth: boolean | null;
  lastCheck: string | null;
  checking: boolean;
}

const QuickDiagnostics: React.FC = () => {
  const [status, setStatus] = useState<DiagnosticStatus>({
    db: null,
    auth: null,
    lastCheck: null,
    checking: false
  });

  const checkConnections = async () => {
    setStatus(prev => ({ ...prev, checking: true }));
    
    try {
      console.log('🔍 Starting connection check...');
      
      // Проверяем БД
      const { data: dbData, error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      // Проверяем авторизацию
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      const dbStatus = !dbError;
      const authStatus = !authError && !!authData.session;
      
      setStatus({
        db: dbStatus,
        auth: authStatus,
        lastCheck: new Date().toLocaleTimeString(),
        checking: false
      });
      
      // Логируем результат
      console.log('🔍 Connection check result:', {
        database: dbStatus,
        auth: authStatus,
        dbError,
        authError,
        timestamp: new Date().toISOString()
      });
      
      // Если есть проблемы, логируем детали
      if (!dbStatus) {
        console.error('❌ Database connection failed:', dbError);
      }
      if (!authStatus) {
        console.warn('⚠️ Auth session issue:', authError || 'No session');
      }
      
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      setStatus({
        db: false,
        auth: false,
        lastCheck: new Date().toLocaleTimeString(),
        checking: false
      });
    }
  };

  // Автоматическая проверка каждые 15 секунд
  useEffect(() => {
    checkConnections();
    const interval = setInterval(checkConnections, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (isOk: boolean | null) => {
    if (isOk === null) return <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse" />;
    return isOk ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = (isOk: boolean | null) => {
    if (isOk === null) return 'border-gray-300 bg-gray-50';
    return isOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50';
  };

  const getStatusText = (isOk: boolean | null) => {
    if (isOk === null) return 'Проверка...';
    return isOk ? 'ОК' : 'Ошибка';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-lg border-2 p-4 min-w-[280px] ${
        status.db === false || status.auth === false ? 'border-red-200' : 'border-green-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-800">Диагностика подключения</h3>
          <button 
            onClick={checkConnections}
            disabled={status.checking}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Проверить подключение"
          >
            <RefreshCw className={`w-4 h-4 ${status.checking ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2">
          <div className={`flex items-center gap-2 p-2 rounded border ${getStatusColor(status.db)}`}>
            <Database className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium flex-1">База данных</span>
            <span className="text-xs">{getStatusText(status.db)}</span>
            {getStatusIcon(status.db)}
          </div>

          <div className={`flex items-center gap-2 p-2 rounded border ${getStatusColor(status.auth)}`}>
            <Shield className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium flex-1">Авторизация</span>
            <span className="text-xs">{getStatusText(status.auth)}</span>
            {getStatusIcon(status.auth)}
          </div>
        </div>

        {status.lastCheck && (
          <div className="text-xs text-gray-500 mt-2 text-center">
            Последняя проверка: {status.lastCheck}
          </div>
        )}

        {/* Предупреждение о проблемах */}
        {(status.db === false || status.auth === false) && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-yellow-800 font-medium">
                Обнаружены проблемы с подключением
              </span>
            </div>
            <div className="text-xs text-yellow-700 mt-1">
              Попробуйте перезагрузить страницу
            </div>
          </div>
        )}

        {/* Индикатор мониторинга */}
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Автопроверка каждые 15 сек</span>
        </div>
      </div>
    </div>
  );
};

export default QuickDiagnostics;