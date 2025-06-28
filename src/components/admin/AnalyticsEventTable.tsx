import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Settings, Eye, EyeOff } from 'lucide-react';
// import { Link } from 'react-router-dom'; // Замените на ваш роутер

interface EventRegistration {
  eventId: string;
  eventTitle: string;
  adultRegistrations: number;
  childRegistrations: number;
  totalRegistrations: number;
  maxCapacity: number;
  paymentLinkClicks: number;
  conversionRate: number;
  revenue: number;
}

interface ColumnConfig {
  key: keyof EventRegistration | 'fillRate' | 'actions';
  label: string;
  sortable: boolean;
  visible: boolean;
  className?: string;
}

interface AnalyticsEventTableProps {
  events: EventRegistration[];
  onSort?: (field: keyof EventRegistration) => void;
  sortField?: keyof EventRegistration;
  sortDirection?: 'asc' | 'desc';
}

const AnalyticsEventTable = ({ 
  events, 
  onSort,
  sortField,
  sortDirection = 'asc'
}: AnalyticsEventTableProps) => {
  
  // Конфигурация столбцов
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'eventTitle', label: 'Мероприятие', sortable: true, visible: true },
    { key: 'adultRegistrations', label: 'Взрослые', sortable: true, visible: true },
    { key: 'childRegistrations', label: 'Дети', sortable: true, visible: true },
    { key: 'totalRegistrations', label: 'Всего', sortable: true, visible: true },
    { key: 'fillRate', label: 'Заполнено', sortable: true, visible: true },
    { key: 'paymentLinkClicks', label: 'Клики по ссылке', sortable: true, visible: false },
    { key: 'conversionRate', label: 'Конверсия', sortable: true, visible: true },
    { key: 'revenue', label: 'Выручка', sortable: true, visible: true },
    { key: 'actions', label: 'Действия', sortable: false, visible: true, className: 'text-right' }
  ]);

  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [currentSortField, setCurrentSortField] = useState<keyof EventRegistration | null>(sortField || null);
  const [currentSortDirection, setCurrentSortDirection] = useState<'asc' | 'desc'>(sortDirection);

  // Сортировка данных
  const sortedEvents = useMemo(() => {
    if (!currentSortField) return events;

    return [...events].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Специальная обработка для заполненности
      if (currentSortField === 'maxCapacity' && columns.find(c => c.key === 'fillRate' && c.visible)) {
        aValue = (a.totalRegistrations / a.maxCapacity) * 100;
        bValue = (b.totalRegistrations / b.maxCapacity) * 100;
      } else {
        aValue = a[currentSortField];
        bValue = b[currentSortField];
      }

      // Сортировка строк (алфавитный порядок)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
        
        if (currentSortDirection === 'asc') {
          return aValue.localeCompare(bValue, 'ru');
        } else {
          return bValue.localeCompare(aValue, 'ru');
        }
      }

      // Сортировка чисел
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (currentSortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }

      // Обработка undefined/null значений
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return currentSortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return currentSortDirection === 'asc' ? 1 : -1;

      // Преобразование в строки как fallback
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (currentSortDirection === 'asc') {
        return aStr.localeCompare(bStr, 'ru');
      } else {
        return bStr.localeCompare(aStr, 'ru');
      }
    });
  }, [events, currentSortField, currentSortDirection, columns]);

  // Обработка сортировки
  const handleSort = (field: keyof EventRegistration) => {
    let newDirection: 'asc' | 'desc' = 'asc';
    
    if (currentSortField === field) {
      // Если кликнули по тому же полю, меняем направление
      newDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    setCurrentSortField(field);
    setCurrentSortDirection(newDirection);
    
    if (onSort) {
      onSort(field);
    }
  };

  // Обработка сортировки для заполненности (вычисляемое поле)
  const handleFillRateSort = () => {
    // Для заполненности используем maxCapacity как базовое поле для сортировки
    handleSort('maxCapacity');
  };
  
  const renderSortIcon = (field: keyof EventRegistration | 'fillRate') => {
    const isCurrentField = field === 'fillRate' ? 
      currentSortField === 'maxCapacity' : 
      field === currentSortField;
    
    if (!isCurrentField) return null;
    
    return currentSortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4" /> 
      : <ChevronDown className="h-4 w-4" />;
  };

  // Переключение видимости столбца
  const toggleColumnVisibility = (key: string) => {
    setColumns(columns.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  // Получение видимых столбцов
  const visibleColumns = columns.filter(col => col.visible);

  // Компонент настроек столбцов
  const ColumnSettings = () => (
    <div className="relative">
      <button
        onClick={() => setShowColumnSettings(!showColumnSettings)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
        title="Настройки столбцов"
      >
        <Settings className="h-4 w-4" />
        <span>Столбцы</span>
      </button>
      
      {showColumnSettings && (
        <>
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-md shadow-lg z-10 min-w-56">
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Видимость столбцов
              </h3>
              <div className="space-y-2">
                {columns.map((column) => (
                  <label 
                    key={column.key} 
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumnVisibility(column.key)}
                      className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex items-center gap-2">
                      {column.visible ? 
                        <Eye className="h-4 w-4 text-green-500" /> : 
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      }
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {column.label}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          {/* Overlay для закрытия */}
          <div 
            className="fixed inset-0 z-0" 
            onClick={() => setShowColumnSettings(false)}
          />
        </>
      )}
    </div>
  );

  // Рендер заголовка с сортировкой
  const renderSortableHeader = (column: ColumnConfig) => {
    const handleClick = () => {
      if (!column.sortable) return;
      
      if (column.key === 'fillRate') {
        handleFillRateSort();
      } else if (column.key !== 'actions') {
        handleSort(column.key as keyof EventRegistration);
      }
    };

    return (
      <th 
        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
          column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors' : ''
        } ${column.className || ''}`}
        onClick={handleClick}
      >
        <div className="flex items-center">
          <span>{column.label}</span>
          {column.sortable && renderSortIcon(column.key as keyof EventRegistration | 'fillRate')}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      {/* Панель управления */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Показано {sortedEvents.length} мероприятий
          {currentSortField && (
            <span className="ml-2">
              • Сортировка по "{columns.find(c => c.key === currentSortField || (c.key === 'fillRate' && currentSortField === 'maxCapacity'))?.label}" 
              ({currentSortDirection === 'asc' ? 'по возрастанию' : 'по убыванию'})
            </span>
          )}
        </div>
        <ColumnSettings />
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
          <thead className="bg-gray-50 dark:bg-dark-700">
            <tr>
              {visibleColumns.map((column) => renderSortableHeader(column))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
            {sortedEvents.map((event, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                {visibleColumns.map((column) => {
                  switch (column.key) {
                    case 'eventTitle':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {event.eventTitle}
                        </td>
                      );
                    
                    case 'adultRegistrations':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {event.adultRegistrations}
                        </td>
                      );
                    
                    case 'childRegistrations':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {event.childRegistrations}
                        </td>
                      );
                    
                    case 'totalRegistrations':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          <span className="font-medium">{event.totalRegistrations}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">/ {event.maxCapacity}</span>
                        </td>
                      );
                    
                    case 'fillRate':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <span className="mr-2 text-gray-900 dark:text-gray-100">
                              {Math.round((event.totalRegistrations / event.maxCapacity) * 100)}%
                            </span>
                            <div className="w-24 bg-gray-200 dark:bg-dark-600 rounded-full h-2.5">
                              <div 
                                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min((event.totalRegistrations / event.maxCapacity) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      );
                    
                    case 'paymentLinkClicks':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {event.paymentLinkClicks}
                        </td>
                      );
                    
                    case 'conversionRate':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.conversionRate >= 50 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : event.conversionRate >= 30
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {event.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                      );
                    
                    case 'revenue':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {event.revenue.toLocaleString('ru-RU')} ₽
                        </td>
                      );
                    
                    case 'actions':
                      return (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <a
                            href={`/admin/events/${event.eventId}/edit`}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                            title="Редактировать мероприятие"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </td>
                      );
                    
                    default:
                      return null;
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Сообщение, если нет данных */}
      {sortedEvents.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Нет данных для отображения</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsEventTable;