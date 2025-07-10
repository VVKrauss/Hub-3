// src/components/AppRecovery.tsx - УПРОЩЕННАЯ ВЕРСИЯ
import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Упрощенный компонент восстановления приложения
 * Работает совместно с AuthContext, не дублирует функциональность
 */
const AppRecovery = () => {
  const { forceQuickCheck, loading, isQuickReturn } = useAuth();
  const [showRecovery, setShowRecovery] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const lastActiveTime = useRef(Date.now());
  const recoveryTriggered = useRef(false);

  // Отслеживание активности вкладки
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Вкладка стала неактивной
        lastActiveTime.current = Date.now();
        console.log('😴 AppRecovery: Вкладка стала неактивной');
        recoveryTriggered.current = false;
      } else {
        // Вкладка стала активной
        const inactiveTime = Date.now() - lastActiveTime.current;
        console.log(`👁️ AppRecovery: Вкладка стала активной (была неактивна ${Math.round(inactiveTime / 1000)}с)`);
        
        // Если была неактивна больше 2 минут и восстановление не запущено
        if (inactiveTime > 120000 && !recoveryTriggered.current && !loading) {
          console.log('⚠️ AppRecovery: Длительная неактивность - запускаем мягкое восстановление');
          handleSoftRecovery();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading]);

  // Мягкое восстановление (через AuthContext)
  const handleSoftRecovery = async () => {
    if (recoveryTriggered.current) return;
    
    recoveryTriggered.current = true;
    setShowRecovery(true);

    try {
      console.log('🔄 AppRecovery: Запуск мягкого восстановления');
      
      // Используем метод быстрой проверки из AuthContext
      await forceQuickCheck();
      
      // Показываем успех
      setShowRecovery(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      console.log('✅ AppRecovery: Мягкое восстановление завершено');

    } catch (error) {
      console.error('❌ AppRecovery: Ошибка мягкого восстановления:', error);
      setShowRecovery(false);
      
      // При ошибке даем пользователю знать
      setTimeout(() => {
        setShowRecovery(false);
      }, 5000);
    }
  };

  // Не показываем ничего если AuthContext активен
  if (loading || isQuickReturn) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {showRecovery && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-800 text-sm">
                Проверка подключения
              </h4>
              <p className="text-blue-600 text-xs mt-1">
                Обновляем состояние после длительного бездействия...
              </p>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-800 text-sm">
                Подключение обновлено
              </h4>
              <p className="text-green-600 text-xs mt-1">
                Все системы работают нормально
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppRecovery;