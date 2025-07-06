// src/components/admin/CoworkingMigrationPanel.tsx
// Панель для управления миграцией данных коворкинга

import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, CheckCircle, AlertTriangle, Download, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  checkMigrationNeeded, 
  migrateCoworkingData, 
  backupOldData, 
  validateMigration,
  type MigrationResult 
} from '../../utils/coworkingMigration';

const CoworkingMigrationPanel: React.FC = () => {
  const [migrationNeeded, setMigrationNeeded] = useState<boolean | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [backing, setBacking] = useState(false);
  const [validating, setValidating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      const needed = await checkMigrationNeeded();
      setMigrationNeeded(needed);
    } catch (error) {
      console.error('Error checking migration status:', error);
      toast.error('Ошибка проверки статуса миграции');
    }
  };

  const handleBackup = async () => {
    setBacking(true);
    try {
      const result = await backupOldData();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Ошибка создания резервной копии');
    } finally {
      setBacking(false);
    }
  };

  const handleMigration = async () => {
    if (!confirm('Запустить миграцию данных коворкинга? Это действие нельзя отменить.')) {
      return;
    }

    setMigrating(true);
    try {
      const result = await migrateCoworkingData();
      setMigrationResult(result);
      
      if (result.success) {
        toast.success(result.message);
        await checkMigrationStatus(); // Обновляем статус
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Ошибка миграции данных');
    } finally {
      setMigrating(false);
    }
  };

  const handleValidation = async () => {
    setValidating(true);
    try {
      const result = await validateMigration();
      setValidationResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Ошибка валидации данных');
    } finally {
      setValidating(false);
    }
  };

  if (migrationNeeded === null) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
          <span className="text-gray-600 dark:text-gray-300">Проверка статуса миграции...</span>
        </div>
      </div>
    );
  }

  if (!migrationNeeded && !migrationResult) {
    return (
      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="text-green-800 dark:text-green-300 font-medium">
              Миграция не требуется
            </h3>
            <p className="text-green-700 dark:text-green-400 text-sm mt-1">
              Данные коворкинга уже используют новую схему БД
            </p>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handleValidation}
            disabled={validating}
            className="btn-secondary flex items-center gap-2"
          >
            {validating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Проверить данные
          </button>
        </div>

        {validationResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            validationResult.success 
              ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
              : 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <h4 className={`font-medium ${
              validationResult.success ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'
            }`}>
              Результат валидации
            </h4>
            <p className={`text-sm mt-1 ${
              validationResult.success ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
            }`}>
              {validationResult.message}
            </p>
            
            {validationResult.issues && validationResult.issues.length > 0 && (
              <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-400 list-disc list-inside">
                {validationResult.issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-6">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div>
          <h3 className="text-yellow-800 dark:text-yellow-300 font-medium">
            Требуется миграция данных коворкинга
          </h3>
          <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
            Обнаружены данные в старой схеме БД. Рекомендуется выполнить миграцию для использования новой системы.
          </p>
        </div>
      </div>

      {/* Шаги миграции */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Шаги миграции:
          </h4>
          
          <div className="space-y-3">
            {/* Шаг 1: Резервная копия */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <div className="flex-1">
                <span className="text-gray-900 dark:text-white">Создать резервную копию</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Сохранить текущие данные перед миграцией</p>
              </div>
              <button
                onClick={handleBackup}
                disabled={backing}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {backing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {backing ? 'Создание...' : 'Создать копию'}
              </button>
            </div>

            {/* Шаг 2: Миграция */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-green-600 dark:text-green-400">2</span>
              </div>
              <div className="flex-1">
                <span className="text-gray-900 dark:text-white">Выполнить миграцию</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Перенести данные в новую схему БД</p>
              </div>
              <button
                onClick={handleMigration}
                disabled={migrating}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {migrating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {migrating ? 'Миграция...' : 'Мигрировать'}
              </button>
            </div>

            {/* Шаг 3: Валидация */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">3</span>
              </div>
              <div className="flex-1">
                <span className="text-gray-900 dark:text-white">Проверить результат</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Валидировать мигрированные данные</p>
              </div>
              <button
                onClick={handleValidation}
                disabled={validating || !migrationResult}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {validating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {validating ? 'Проверка...' : 'Проверить'}
              </button>
            </div>
          </div>
        </div>

        {/* Результат миграции */}
        {migrationResult && (
          <div className={`p-4 rounded-lg ${
            migrationResult.success 
              ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
              : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
          }`}>
            <h4 className={`font-medium ${
              migrationResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
            }`}>
              Результат миграции
            </h4>
            <p className={`text-sm mt-1 ${
              migrationResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}>
              {migrationResult.message}
            </p>
            
            {migrationResult.success && (
              <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                ✅ Перенесено услуг: {migrationResult.migratedServices}
              </p>
            )}
            
            {migrationResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Ошибки:</p>
                <ul className="text-sm text-red-600 dark:text-red-500 list-disc list-inside">
                  {migrationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Результат валидации */}
        {validationResult && (
          <div className={`p-4 rounded-lg ${
            validationResult.success 
              ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
              : 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <h4 className={`font-medium ${
              validationResult.success ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'
            }`}>
              Результат валидации
            </h4>
            <p className={`text-sm mt-1 ${
              validationResult.success ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
            }`}>
              {validationResult.message}
            </p>
            
            {validationResult.issues && validationResult.issues.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Обнаруженные проблемы:</p>
                <ul className="text-sm text-yellow-600 dark:text-yellow-500 list-disc list-inside">
                  {validationResult.issues.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Предупреждение */}
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">
            <strong>Важно:</strong> После успешной миграции старые таблицы (<code>coworking_header</code>, <code>coworking_info_table</code>) 
            останутся без изменений для обеспечения безопасности данных. Их можно будет удалить позже после проверки работы новой системы.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CoworkingMigrationPanel;