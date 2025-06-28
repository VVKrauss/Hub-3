import { useState } from 'react';
import { X, Download, FileText, FileSpreadsheet } from 'lucide-react';
import Modal from '../ui/Modal';

type ExportFormat = 'csv' | 'xlsx';
type ExportType = 'all' | 'visitors' | 'registrations';
type DateRange = { startDate: string; endDate: string };

interface AnalyticsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, type: ExportType, dateRange: DateRange) => void;
  defaultDateRange: DateRange;
}

const AnalyticsExportModal = ({ 
  isOpen, 
  onClose, 
  onExport,
  defaultDateRange
}: AnalyticsExportModalProps) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [type, setType] = useState<ExportType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  
  const handleExport = () => {
    onExport(format, type, dateRange);
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Экспорт данных аналитики"
      size="md"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Формат экспорта</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex flex-col items-center justify-center p-4 border rounded-lg ${
                format === 'csv' 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className={`h-8 w-8 mb-2 ${format === 'csv' ? 'text-primary-600' : 'text-gray-500'}`} />
              <span className={format === 'csv' ? 'font-medium text-primary-700 dark:text-primary-400' : ''}>CSV</span>
            </button>
            
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`flex flex-col items-center justify-center p-4 border rounded-lg ${
                format === 'xlsx' 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FileSpreadsheet className={`h-8 w-8 mb-2 ${format === 'xlsx' ? 'text-primary-600' : 'text-gray-500'}`} />
              <span className={format === 'xlsx' ? 'font-medium text-primary-700 dark:text-primary-400' : ''}>Excel</span>
            </button>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Данные для экспорта</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                checked={type === 'all'}
                onChange={() => setType('all')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
              />
              <span className="ml-2">Полный отчет (посещения и регистрации)</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                checked={type === 'visitors'}
                onChange={() => setType('visitors')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
              />
              <span className="ml-2">Только данные о посещениях</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                checked={type === 'registrations'}
                onChange={() => setType('registrations')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
              />
              <span className="ml-2">Только данные о регистрациях</span>
            </label>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Период</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Начало</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Конец</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Экспортировать
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AnalyticsExportModal;