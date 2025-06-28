import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

type DateRange = '7days' | '30days' | '90days' | 'custom';

interface DateRangePickerProps {
  onChange: (range: { type: DateRange; startDate?: string; endDate?: string }) => void;
  initialRange?: DateRange;
}

const AnalyticsDateRangePicker = ({ onChange, initialRange = '30days' }: DateRangePickerProps) => {
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);
  const [customStartDate, setCustomStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showDropdown, setShowDropdown] = useState(false);
  
  useEffect(() => {
    // Set initial dates based on range
    updateDatesFromRange(initialRange);
  }, [initialRange]);
  
  useEffect(() => {
    // Notify parent component when range changes
    if (dateRange === 'custom') {
      onChange({ type: dateRange, startDate: customStartDate, endDate: customEndDate });
    } else {
      const { start, end } = getDatesFromRange(dateRange);
      onChange({ type: dateRange, startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') });
    }
  }, [dateRange, customStartDate, customEndDate]);
  
  const updateDatesFromRange = (range: DateRange) => {
    const { start, end } = getDatesFromRange(range);
    setCustomStartDate(format(start, 'yyyy-MM-dd'));
    setCustomEndDate(format(end, 'yyyy-MM-dd'));
  };
  
  const getDatesFromRange = (range: DateRange) => {
    const end = new Date();
    let start;
    
    switch (range) {
      case '7days':
        start = subDays(end, 7);
        break;
      case '30days':
        start = subDays(end, 30);
        break;
      case '90days':
        start = subDays(end, 90);
        break;
      case 'custom':
        start = new Date(customStartDate);
        break;
    }
    
    return { start, end };
  };
  
  const formatDateRange = () => {
    switch (dateRange) {
      case '7days':
        return 'Последние 7 дней';
      case '30days':
        return 'Последние 30 дней';
      case '90days':
        return 'Последние 90 дней';
      case 'custom':
        return `${format(new Date(customStartDate), 'dd.MM.yyyy')} - ${format(new Date(customEndDate), 'dd.MM.yyyy')}`;
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-md"
      >
        <Calendar className="h-5 w-5 text-gray-500" />
        <span>{formatDateRange()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-md shadow-lg z-10">
          <div className="p-2">
            <button
              onClick={() => {
                setDateRange('7days');
                updateDatesFromRange('7days');
                setShowDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md ${dateRange === '7days' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-700'}`}
            >
              <div className="flex items-center">
                <span className="flex-grow">Последние 7 дней</span>
                {dateRange === '7days' && <Check className="h-4 w-4" />}
              </div>
            </button>
            
            <button
              onClick={() => {
                setDateRange('30days');
                updateDatesFromRange('30days');
                setShowDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md ${dateRange === '30days' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-700'}`}
            >
              <div className="flex items-center">
                <span className="flex-grow">Последние 30 дней</span>
                {dateRange === '30days' && <Check className="h-4 w-4" />}
              </div>
            </button>
            
            <button
              onClick={() => {
                setDateRange('90days');
                updateDatesFromRange('90days');
                setShowDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md ${dateRange === '90days' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-700'}`}
            >
              <div className="flex items-center">
                <span className="flex-grow">Последние 90 дней</span>
                {dateRange === '90days' && <Check className="h-4 w-4" />}
              </div>
            </button>
            
            <div className="border-t border-gray-200 dark:border-dark-700 my-2 pt-2">
              <div className={`px-3 py-2 rounded-md ${dateRange === 'custom' ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                <div className="flex items-center mb-2">
                  <span className="flex-grow font-medium">Произвольный период</span>
                  {dateRange === 'custom' && <Check className="h-4 w-4 text-primary-600 dark:text-primary-400" />}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Начало</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Конец</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-700"
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setDateRange('custom');
                    setShowDropdown(false);
                  }}
                  className="w-full mt-2 px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded"
                >
                  Применить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDateRangePicker;