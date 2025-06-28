// src/pages/admin/AdminExport.tsx - компактная версия
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Download, 
  Database, 
  FileText, 
  Settings, 
  CheckCircle, 
  Circle,
  Users,
  Calendar,
  Building,
  Heart,
  BarChart3,
  Archive,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type TableInfo = {
  name: string;
  displayName: string;
  description: string;
  icon: any;
  count: number;
  selected: boolean;
  category: 'users' | 'content' | 'system';
  color: string;
};

type ExportSettings = {
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'windows-1251';
  dateFormat: 'ISO' | 'DD.MM.YYYY' | 'MM/DD/YYYY';
  includeHeaders: boolean;
};

const AdminExport = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedTables, setExportedTables] = useState(0);
  const [totalTables, setTotalTables] = useState(0);
  const [currentTable, setCurrentTable] = useState('');
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    delimiter: ',',
    encoding: 'utf-8',
    dateFormat: 'DD.MM.YYYY',
    includeHeaders: true
  });

  // Компактный список таблиц
  const TABLE_DEFINITIONS: Omit<TableInfo, 'count' | 'selected'>[] = [
    {
      name: 'profiles',
      displayName: 'Профили',
      description: 'Пользователи и роли',
      icon: Users,
      category: 'users',
      color: 'blue'
    },
    {
      name: 'events',
      displayName: 'Мероприятия',
      description: 'События и расписание',
      icon: Calendar,
      category: 'content',
      color: 'green'
    },
    {
      name: 'speakers',
      displayName: 'Спикеры',
      description: 'Докладчики',
      icon: Users,
      category: 'content',
      color: 'purple'
    },
    {
      name: 'user_attendance',
      displayName: 'Посещения',
      description: 'QR-сканирования',
      icon: BarChart3,
      category: 'users',
      color: 'orange'
    },
    {
      name: 'user_favorite_events',
      displayName: 'Избранное',
      description: 'Любимые события',
      icon: Heart,
      category: 'users',
      color: 'red'
    },
    {
      name: 'user_favorite_speakers',
      displayName: 'Избранные спикеры',
      description: 'Любимые докладчики',
      icon: Heart,
      category: 'users',
      color: 'pink'
    },
    {
      name: 'user_event_registrations',
      displayName: 'Регистрации',
      description: 'Записи на события',
      icon: FileText,
      category: 'users',
      color: 'indigo'
    },
    {
      name: 'site_settings',
      displayName: 'Настройки',
      description: 'Конфигурация сайта',
      icon: Settings,
      category: 'system',
      color: 'gray'
    },
    {
      name: 'coworking_info_table',
      displayName: 'Коворкинг',
      description: 'Услуги коворкинга',
      icon: Building,
      category: 'content',
      color: 'teal'
    },
    {
      name: 'rent_info',
      displayName: 'Аренда',
      description: 'Данные об аренде',
      icon: Building,
      category: 'content',
      color: 'cyan'
    }
  ];

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const tableInfoPromises = TABLE_DEFINITIONS.map(async (tableDef) => {
        try {
          const { count, error: countError } = await supabase
            .from(tableDef.name)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            console.warn(`Table ${tableDef.name} not accessible:`, countError);
            return null;
          }

          return {
            ...tableDef,
            count: count || 0,
            selected: false
          };
        } catch (error) {
          console.warn(`Error accessing table ${tableDef.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(tableInfoPromises);
      const validTables = results.filter(Boolean) as TableInfo[];
      
      setTables(validTables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setTables(prev => prev.map(table => 
      table.name === tableName 
        ? { ...table, selected: !table.selected }
        : table
    ));
  };

  const selectByCategory = (category: string) => {
    setTables(prev => prev.map(table => 
      table.category === category 
        ? { ...table, selected: true }
        : table
    ));
  };

  const selectAllTables = () => {
    setTables(prev => prev.map(table => ({ ...table, selected: true })));
  };

  const deselectAllTables = () => {
    setTables(prev => prev.map(table => ({ ...table, selected: false })));
  };

  const exportData = async () => {
    const selectedTables = tables.filter(table => table.selected);
    
    if (selectedTables.length === 0) {
      toast.error('Выберите хотя бы одну таблицу для экспорта');
      return;
    }

    try {
      setExporting(true);
      setExportProgress(0);
      setTotalTables(selectedTables.length);
      setExportedTables(0);
      
      const zip = new JSZip();

      for (let i = 0; i < selectedTables.length; i++) {
        const table = selectedTables[i];
        setCurrentTable(table.displayName);
        setExportProgress((i / selectedTables.length) * 100);

        try {
          const { data, error } = await supabase
            .from(table.name)
            .select('*');

          if (error) {
            console.error(`Error exporting ${table.name}:`, error);
            continue;
          }

          if (data && data.length > 0) {
            const csvContent = convertToCSV(data, table.name);
            zip.file(`${table.name}.csv`, csvContent);
          }

          setExportedTables(i + 1);
        } catch (error) {
          console.error(`Error processing table ${table.name}:`, error);
        }
      }

      setExportProgress(100);
      setCurrentTable('Создание архива...');

      // Добавляем README файл
      const readme = generateReadme(selectedTables);
      zip.file('README.txt', readme);

      // Генерируем архив
      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `science-hub-export-${new Date().toISOString().split('T')[0]}.zip`;
      
      saveAs(content, fileName);
      toast.success(`Экспорт завершен! Экспортировано ${selectedTables.length} таблиц`);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте данных');
    } finally {
      setExporting(false);
      setExportProgress(0);
      setExportedTables(0);
      setCurrentTable('');
      setShowSettingsModal(false);
    }
  };

  const convertToCSV = (data: any[], tableName: string) => {
    if (!data || data.length === 0) return '';

    const delimiter = exportSettings.delimiter;
    const headers = Object.keys(data[0]);
    
    const csvRows = [];
    
    if (exportSettings.includeHeaders) {
      csvRows.push(headers.join(delimiter));
    }
    
    csvRows.push(...data.map(row => 
      headers.map(header => {
        let value = row[header];
        
        // Форматирование дат
        if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
          const date = new Date(value);
          switch (exportSettings.dateFormat) {
            case 'DD.MM.YYYY':
              value = date.toLocaleDateString('ru-RU');
              break;
            case 'MM/DD/YYYY':
              value = date.toLocaleDateString('en-US');
              break;
            default:
              value = date.toISOString();
          }
        }
        
        // Экранирование
        if (value && typeof value === 'string') {
          if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
        }
        
        return value ?? '';
      }).join(delimiter)
    ));

    return csvRows.join('\n');
  };

  const generateReadme = (exportedTables: TableInfo[]) => {
    return `
SCIENCE HUB - ЭКСПОРТ ДАННЫХ
===========================

Дата экспорта: ${new Date().toLocaleString('ru-RU')}
Всего таблиц: ${exportedTables.length}

ЭКСПОРТИРОВАННЫЕ ТАБЛИЦЫ:
${exportedTables.map(table => `
- ${table.name}.csv
  Название: ${table.displayName}
  Описание: ${table.description}
  Записей: ${table.count}
`).join('')}

НАСТРОЙКИ ЭКСПОРТА:
- Разделитель: ${exportSettings.delimiter === ',' ? 'Запятая' : exportSettings.delimiter === ';' ? 'Точка с запятой' : 'Табуляция'}
- Формат даты: ${exportSettings.dateFormat}
- Заголовки: ${exportSettings.includeHeaders ? 'Включены' : 'Не включены'}
- Кодировка: ${exportSettings.encoding}

Создано системой Science Hub
    `.trim();
  };

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
      red: 'text-red-600',
      pink: 'text-pink-600',
      indigo: 'text-indigo-600',
      gray: 'text-gray-600',
      teal: 'text-teal-600',
      cyan: 'text-cyan-600'
    };
    return colors[color] || colors.gray;
  };

  const groupedTables = {
    users: tables.filter(t => t.category === 'users'),
    content: tables.filter(t => t.category === 'content'),
    system: tables.filter(t => t.category === 'system')
  };

  const selectedCount = tables.filter(t => t.selected).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Загрузка таблиц...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Компактный заголовок */}
      <div className="text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
          Экспорт данных
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Экспорт данных из базы в CSV формате
        </p>
      </div>

      {/* Компактные кнопки действий */}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={selectAllTables}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
        >
          Все ({tables.length})
        </button>
        <button
          onClick={deselectAllTables}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
        >
          Очистить
        </button>
        <button
          onClick={() => selectByCategory('users')}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
        >
          Пользователи ({groupedTables.users.length})
        </button>
        <button
          onClick={() => selectByCategory('content')}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
        >
          Контент ({groupedTables.content.length})
        </button>
      </div>

      {/* Компактные таблицы по категориям */}
      {Object.entries(groupedTables).map(([category, categoryTables]) => {
        if (categoryTables.length === 0) return null;
        
        const categoryNames = {
          users: '👥 Пользователи',
          content: '📝 Контент',
          system: '⚙️ Система'
        };

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {categoryNames[category as keyof typeof categoryNames]}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {categoryTables.map((table) => {
                const Icon = table.icon;
                return (
                  <div
                    key={table.name}
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
                      table.selected 
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                        : 'border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500'
                    }`}
                    onClick={() => toggleTableSelection(table.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`h-4 w-4 ${getIconColor(table.color)}`} />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        table.selected
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {table.selected && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                      {table.displayName}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {table.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {table.count} записей
                      </span>
                      <Database className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Компактные экшены */}
      <div className="flex flex-col items-center space-y-3 pt-4 border-t border-gray-200 dark:border-dark-600">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Выбрано: <span className="text-primary-600 dark:text-primary-400">{selectedCount}</span> из {tables.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Записей: {tables.filter(t => t.selected).reduce((sum, t) => sum + t.count, 0)}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            disabled={selectedCount === 0 || exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
          >
            <Settings className="h-4 w-4" />
            Настройки
          </button>
          <button
            onClick={exportData}
            disabled={selectedCount === 0 || exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? 'Экспорт...' : 'Экспортировать'}
          </button>
        </div>
      </div>

      {/* Компактный прогресс */}
      {exporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <Archive className="h-12 w-12 text-primary-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">Экспорт данных</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {currentTable}
              </p>
              
              <div className="space-y-2">
                <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{Math.round(exportProgress)}%</span>
                  <span>{exportedTables} / {totalTables}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Компактная модалка настроек */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 dark:border-dark-600">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Настройки экспорта
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Разделитель CSV</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: ',', label: 'Запятая' },
                    { value: ';', label: 'Точка с запятой' },
                    { value: '\t', label: 'Табуляция' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setExportSettings(prev => ({ ...prev, delimiter: option.value as any }))}
                      className={`p-2 text-xs rounded border transition-colors ${
                        exportSettings.delimiter === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-300 dark:border-dark-600 hover:border-gray-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Формат даты</label>
                <div className="space-y-1">
                  {[
                    { value: 'DD.MM.YYYY', label: 'ДД.ММ.ГГГГ' },
                    { value: 'MM/DD/YYYY', label: 'ММ/ДД/ГГГГ' },
                    { value: 'ISO', label: 'ISO формат' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setExportSettings(prev => ({ ...prev, dateFormat: option.value as any }))}
                      className={`w-full p-2 text-xs text-left rounded border transition-colors ${
                        exportSettings.dateFormat === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-300 dark:border-dark-600 hover:border-gray-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportSettings.includeHeaders}
                    onChange={(e) => setExportSettings(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-sm">Включить заголовки</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-dark-600 flex justify-end gap-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-600 rounded hover:bg-gray-50 dark:hover:bg-dark-700"
              >
                Отмена
              </button>
              <button
                onClick={exportData}
                className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded"
              >
                Экспорт
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExport;