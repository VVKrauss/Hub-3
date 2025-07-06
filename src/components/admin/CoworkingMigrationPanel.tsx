// src/components/admin/CoworkingMigrationPanel.tsx
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Upload, 
  Trash2,
  Eye,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  migrateLegacyCoworkingData,
  fullMigrationWithBackup,
  restoreFromBackup,
  cleanupLegacyData,
  validateMigration,
  backupLegacyCoworkingData
} from '../../utils/coworkingMigration';
import { checkLegacyCoworkingData } from '../../api/coworking';

interface MigrationStatus {
  isRunning: boolean;
  step: string;
  progress: number;
  result?: 'success' | 'error' | null;
  errors: string[];
}

const CoworkingMigrationPanel: React.FC = () => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    isRunning: false,
    step: '',
    progress: 0,
    result: null,
    errors: []
  });

  const [legacyData, setLegacyData] = useState({
    hasLegacyHeader: false,
    hasLegacyServices: false,
    legacyServicesCount: 0
  });

  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    issues: string[];
  } | null>(null);

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkLegacyDataStatus();
  }, []);

  const checkLegacyDataStatus = async () => {
    try {
      const status = await checkLegacyCoworkingData();
      setLegacyData(status);
    } catch (error) {
      console.error('Error checking legacy data:', error);
    }
  };

  const updateMigrationStatus = (step: string, progress: number, errors: string[] = []) => {
    setMigrationStatus(prev => ({
      ...prev,
      step,
      progress,
      errors: [...prev.errors, ...errors]
    }));
  };

  const runFullMigration = async () => {
    setMigrationStatus({
      isRunning: true,
      step: 'Начинаем миграцию...',
      progress: 0,
      result: null,
      errors: []
    });

    try {
      updateMigrationStatus('Создание резервной копии...', 20);
      const success = await fullMigrationWithBackup();

      if (success) {
        updateMigrationStatus('Проверка целостности данных...', 80);
        const validation = await validateMigration();
        setValidationResult(validation);

        if (validation.isValid) {
          updateMigrationStatus('Миграция завершена успешно!', 100);
          setMigrationStatus(prev => ({ ...prev, result: 'success', isRunning: false }));
          toast.success('Миграция завершена успешно!');
          await checkLegacyDataStatus(); // Обновляем статус
        } else {
          updateMigrationStatus('Миграция завершена с предупреждениями', 100, validation.issues);
          setMigrationStatus(prev => ({ ...prev, result: 'error', isRunning: false }));
          toast.error('Миграция завершена с ошибками');
        }
      } else {
        updateMigrationStatus('Ошибка при миграции', 100, ['Не удалось выполнить миграцию']);
        setMigrationStatus(prev => ({ ...prev, result: 'error', isRunning: false }));
        toast.error('Ошибка при миграции');
      }
    } catch (error) {
      updateMigrationStatus('Критическая ошибка', 100, [String(error)]);
      setMigrationStatus(prev => ({ ...prev, result: 'error', isRunning: false }));
      toast.error('Критическая ошибка при миграции');
    }
  };

  const runSimpleMigration = async () => {
    setMigrationStatus({
      isRunning: true,
      step: 'Выполняем простую миграцию...',
      progress: 0,
      result: null,
      errors: []
    });

    try {
      updateMigrationStatus('Перенос данных...', 50);
      const success = await migrateLegacyCoworkingData();

      if (success) {
        updateMigrationStatus('Миграция завершена!', 100);
        setMigrationStatus(prev => ({ ...prev, result: 'success', isRunning: false }));
        toast.success('Простая миграция завершена!');
        await checkLegacyDataStatus();
      } else {
        updateMigrationStatus('Ошибка при миграции', 100, ['Не удалось выполнить миграцию']);
        setMigrationStatus(prev => ({ ...prev, result: 'error', isRunning: false }));
        toast.error('Ошибка при миграции');
      }
    } catch (error) {
      updateMigrationStatus('Ошибка', 100, [String(error)]);
      setMigrationStatus(prev => ({ ...prev, result: 'error', isRunning: false }));
      toast.error('Ошибка при миграции');
    }
  };

  const runBackup = async () => {
    try {
      toast.loading('Создаем резервную копию...');
      const success = await backupLegacyCoworkingData();
      
      if (success) {
        toast.success('Резервная копия создана!');
      } else {
        toast.error('Ошибка при создании резервной копии');
      }
    } catch (error) {
      toast.error('Ошибка при создании резервной копии');
    }
  };

  const runRestore = async () => {
    if (!confirm('Вы уверены, что хотите восстановить данные из резервной копии? Это перезапишет текущие данные.')) {
      return;
    }

    try {
      toast.loading('Восстанавливаем данные...');
      const success = await restoreFromBackup();
      
      if (success) {
        toast.success('Данные восстановлены из резервной копии!');
        await checkLegacyDataStatus();
      } else {
        toast.error('Ошибка при восстановлении данных');
      }
    } catch (error) {
      toast.error('Ошибка при восстановлении данных');
    }
  };

  const runCleanup = async () => {
    if (!confirm('Вы уверены, что хотите очистить старые данные? Это действие необратимо.')) {
      return;
    }

    try {
      toast.loading('Очищаем старые данные...');
      const success = await cleanupLegacyData();
      
      if (success) {
        toast.success('Старые данные очищены!');
        await checkLegacyDataStatus();
      } else {
        toast.error('Ошибка при очистке данных');
      }
    } catch (error) {
      toast.error('Ошибка при очистке данных');
    }
  };

  const runValidation = async () => {
    try {
      toast.loading('Проверяем целостность данных...');
      const result = await validateMigration();
      setValidationResult(result);
      
      if (result.isValid) {
        toast.success('Данные корректны!');
      } else {
        toast.error(`Найдено ${result.issues.length} проблем`);
      }
    } catch (error) {
      toast.error('Ошибка при валидации');
    }
  };

  const hasLegacyData = legacyData.hasLegacyHeader || legacyData.hasLegacyServices;

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-6 h-6 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Панель миграции коворкинга
        </h2>
      </div>

      {/* Статус старых данных */}
      <div className="mb-8 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Статус старых данных
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            {legacyData.hasLegacyHeader ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-gray-700 dark:text-gray-300">
              Заголовок в старой схеме: {legacyData.hasLegacyHeader ? 'Найден' : 'Не найден'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {legacyData.hasLegacyServices ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-gray-700 dark:text-gray-300">
              Услуги в старой схеме: {legacyData.legacyServicesCount} шт.
            </span>
          </div>
        </div>
      </div>

      {/* Прогресс миграции */}
      {migrationStatus.isRunning && (
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              {migrationStatus.step}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${migrationStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Результат миграции */}
      {migrationStatus.result && (
        <div className={`mb-8 p-4 rounded-lg border ${
          migrationStatus.result === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {migrationStatus.result === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={`font-medium ${
              migrationStatus.result === 'success' 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {migrationStatus.result === 'success' ? 'Миграция завершена успешно!' : 'Миграция завершена с ошибками'}
            </span>
          </div>
          {migrationStatus.errors.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                {showDetails ? 'Скрыть' : 'Показать'} подробности
              </button>
              {showDetails && (
                <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1">
                  {migrationStatus.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Результат валидации */}
      {validationResult && (
        <div className={`mb-8 p-4 rounded-lg border ${
          validationResult.isValid 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {validationResult.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
            <span className={`font-medium ${
              validationResult.isValid 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {validationResult.isValid ? 'Данные корректны' : `Найдено ${validationResult.issues.length} проблем`}
            </span>
          </div>
          {!validationResult.isValid && validationResult.issues.length > 0 && (
            <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              {validationResult.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Действия миграции */}
      <div className="space-y-6">
        {hasLegacyData && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Миграция данных
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={runFullMigration}
                disabled={migrationStatus.isRunning}
                className="flex items-center gap-3 p-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Полная миграция</div>
                  <div className="text-sm text-primary-100">С резервной копией и валидацией</div>
                </div>
              </button>

              <button
                onClick={runSimpleMigration}
                disabled={migrationStatus.isRunning}
                className="flex items-center gap-3 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Простая миграция</div>
                  <div className="text-sm text-blue-100">Только перенос данных</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Дополнительные действия */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Дополнительные действия
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={runBackup}
              disabled={migrationStatus.isRunning}
              className="flex items-center gap-3 p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Создать бэкап</div>
                <div className="text-xs text-gray-100">Резервная копия</div>
              </div>
            </button>

            <button
              onClick={runRestore}
              disabled={migrationStatus.isRunning}
              className="flex items-center gap-3 p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Восстановить</div>
                <div className="text-xs text-orange-100">Из бэкапа</div>
              </div>
            </button>

            <button
              onClick={runValidation}
              disabled={migrationStatus.isRunning}
              className="flex items-center gap-3 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Проверить</div>
                <div className="text-xs text-green-100">Валидация</div>
              </div>
            </button>

            <button
              onClick={runCleanup}
              disabled={migrationStatus.isRunning}
              className="flex items-center gap-3 p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Очистить</div>
                <div className="text-xs text-red-100">Старые данные</div>
              </div>
            </button>
          </div>
        </div>

        {/* Информация о процессе */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              Информация о миграции
            </h4>
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <p><strong>Полная миграция:</strong> Создает резервную копию, переносит данные и проверяет их целостность.</p>
            <p><strong>Простая миграция:</strong> Быстро переносит данные без дополнительных проверок.</p>
            <p><strong>Создать бэкап:</strong> Сохраняет текущие данные в резервную копию.</p>
            <p><strong>Восстановить:</strong> Восстанавливает данные из последней резервной копии.</p>
            <p><strong>Проверить:</strong> Проверяет корректность перенесенных данных.</p>
            <p><strong>Очистить:</strong> Удаляет старые данные после успешной миграции.</p>
          </div>
        </div>

        {/* Предупреждение */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">Важно:</p>
              <ul className="space-y-1 text-xs">
                <li>• Рекомендуется использовать "Полную миграцию" для максимальной безопасности</li>
                <li>• Перед миграцией убедитесь, что нет активных пользователей</li>
                <li>• После успешной миграции можно очистить старые данные</li>
                <li>• Резервная копия позволяет восстановить данные в случае проблем</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoworkingMigrationPanel;