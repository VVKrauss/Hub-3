import { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  RefreshCw, 
  Users, 
  Clock, 
  TrendingUp,
  Building,
  Eye,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';

// Import analytics utilities and components
import { 
  fetchVisitorData, 
  fetchPagePopularity,
  fetchRentalBookings,
  exportAnalyticsData,
  VisitorData,
  PageVisit,
  PagePopularity,
  RentalBooking,
  DateRange
} from '../../utils/analyticsUtils';

import AnalyticsDateRangePicker from '../../components/admin/AnalyticsDateRangePicker';
import AnalyticsExportModal from '../../components/admin/AnalyticsExportModal';
import AnalyticsCard from '../../components/admin/AnalyticsCard';
import AnalyticsVisitorChart from '../../components/admin/AnalyticsVisitorChart';
import AnalyticsPageVisitsTable from '../../components/admin/AnalyticsPageVisitsTable';
import AnalyticsPagePopularityChart from '../../components/admin/AnalyticsPagePopularityChart';
import AnalyticsRentalBookingsChart from '../../components/admin/AnalyticsRentalBookingsChart';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="relative">
      <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
      <div className="absolute inset-0 w-8 h-8 border-2 border-primary-200 dark:border-primary-800 rounded-full"></div>
    </div>
    <span className="ml-3 text-gray-600 dark:text-gray-300 font-medium">Загрузка аналитики...</span>
  </div>
);

// Main component
const AdminAnalytics = () => {
  // State
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'visitors' | 'rental'>('visitors');
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Data state
  const [visitorData, setVisitorData] = useState<VisitorData[]>([]);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [pagePopularity, setPagePopularity] = useState<PagePopularity[]>([]);
  const [rentalBookings, setRentalBookings] = useState<RentalBooking[]>([]);
  
  // Refs
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Effects
  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh
    refreshTimerRef.current = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [dateRange, customStartDate, customEndDate]);
  
  // Get date range
  const getDateRange = () => {
    const end = new Date();
    let start;
    
    switch (dateRange) {
      case '7days':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        start = new Date(customStartDate);
        return { 
          start: start.toISOString().split('T')[0], 
          end: end.toISOString().split('T')[0] 
        };
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return { 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0] 
    };
  };
  
  // Fetch data based on date range
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      const { start, end } = getDateRange();
      
      // Fetch visitor data
      const visitors = await fetchVisitorData(start, end);
      setVisitorData(visitors);
      
      // Fetch page popularity
      const pages = await fetchPagePopularity(start, end);
      setPageVisits(pages);
      
      // Convert to pie chart data
      const totalVisits = pages.reduce((sum, page) => sum + page.visits, 0);
      const popularityData = pages.slice(0, 6).map(page => ({
        name: page.page.replace(/^\//, '').replace(/\/$/, '') || 'Главная',
        value: Math.round((page.visits / totalVisits) * 100)
      }));
      setPagePopularity(popularityData);
      
      // Fetch rental bookings
      const bookings = await fetchRentalBookings(start, end);
      setRentalBookings(bookings);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Ошибка при загрузке данных аналитики');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle date range change
  const handleDateRangeChange = (range: { type: DateRange; startDate?: string; endDate?: string }) => {
    setDateRange(range.type);
    
    if (range.type === 'custom' && range.startDate && range.endDate) {
      setCustomStartDate(range.startDate);
      setCustomEndDate(range.endDate);
    }
  };
  
  // Handle export
  const handleExport = async (format: 'csv' | 'xlsx', type: 'all' | 'visitors' | 'rental', dateRange: { startDate: string; endDate: string }) => {
    try {
      toast.loading('Подготовка данных для экспорта...');
      
      const blob = await exportAnalyticsData(
        format, 
        type, 
        dateRange.startDate, 
        dateRange.endDate
      );
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_export_${format}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.dismiss();
      toast.success(`Данные успешно экспортированы в формате ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.dismiss();
      toast.error('Ошибка при экспорте данных');
    }
  };
  
  // Calculate totals
  const totalVisitors = visitorData.reduce((sum, day) => sum + day.visitors, 0);
  const totalUniqueVisitors = visitorData.reduce((sum, day) => sum + day.uniqueVisitors, 0);
  
  // Calculate averages
  const avgDailyVisitors = Math.round(totalVisitors / (visitorData.length || 1));
  const avgTimeOnSite = Math.round(pageVisits.reduce((sum, page) => sum + page.avgTimeSpent, 0) / (pageVisits.length || 1));
  
  // Format date for display
  const formatDateRange = () => {
    switch (dateRange) {
      case '7days':
        return 'Последние 7 дней';
      case '30days':
        return 'Последние 30 дней';
      case '90days':
        return 'Последние 90 дней';
      case 'custom':
        const startDate = new Date(customStartDate).toLocaleDateString('ru-RU');
        const endDate = new Date(customEndDate).toLocaleDateString('ru-RU');
        return `${startDate} - ${endDate}`;
    }
  };
  
  // Calculate rental statistics
  const totalRentalBookings = rentalBookings.length;
  const totalRentalHours = rentalBookings.reduce((sum, booking) => sum + booking.durationHours, 0);
  const totalRentalRevenue = rentalBookings.reduce((sum, booking) => sum + booking.revenue, 0);
  const avgBookingDuration = totalRentalHours / (totalRentalBookings || 1);

  const tabs = [
    { id: 'visitors', label: 'Посещаемость', icon: Users, count: totalVisitors },
    { id: 'rental', label: 'Аренда помещений', icon: Building, count: totalRentalBookings }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4 font-heading">
            Аналитика и статистика
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Отслеживайте посещаемость сайта и эффективность аренды помещений
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Последнее обновление: {lastUpdated.toLocaleString('ru-RU')}
          </p>
        </div>

        {/* Контролы */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Период: {formatDateRange()}
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Date range selector */}
            <AnalyticsDateRangePicker 
              onChange={handleDateRangeChange}
              initialRange={dateRange}
            />
            
            {/* Refresh button */}
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg font-heading"
            >
              <RefreshCw className={`h-5 w-5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Обновление...' : 'Обновить'}</span>
            </button>
            
            {/* Export button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-heading"
            >
              <Download className="h-5 w-5" />
              <span>Экспорт</span>
            </button>
          </div>
        </div>

        {/* Вкладки */}
        <div className="mb-10">
          <div className="flex flex-wrap justify-center gap-2 bg-white dark:bg-dark-800 p-2 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'visitors' | 'rental')}
                  className={`flex items-center justify-center px-8 py-4 rounded-xl font-semibold transition-all duration-300 font-heading ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-3" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-3 px-3 py-1 text-sm rounded-full font-bold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    }`}>
                      {tab.count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && <LoadingSpinner />}

        {/* Контент вкладок */}
        {!isLoading && (
          <div className="space-y-8">
            {/* Visitor Analytics */}
            {activeTab === 'visitors' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 font-heading flex items-center">
                  <Eye className="w-6 h-6 mr-3 text-primary-500" />
                  Аналитика посещаемости
                </h2>

                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AnalyticsCard
                    title="Всего посещений"
                    value={totalVisitors.toLocaleString()}
                    icon={<Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
                    change={{
                      value: Math.round(totalVisitors * 0.12).toLocaleString(),
                      percentage: 12,
                      isPositive: true
                    }}
                  />
                  
                  <AnalyticsCard
                    title="Уникальных посетителей"
                    value={totalUniqueVisitors.toLocaleString()}
                    icon={<Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                    iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                    change={{
                      value: Math.round(totalUniqueVisitors * 0.08).toLocaleString(),
                      percentage: 8,
                      isPositive: true
                    }}
                  />
                  
                  <AnalyticsCard
                    title="Среднее время на сайте"
                    value={`${Math.floor(avgTimeOnSite / 60)}:${(avgTimeOnSite % 60).toString().padStart(2, '0')}`}
                    icon={<Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
                    iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
                    change={{
                      value: `${Math.round(avgTimeOnSite * 0.05)} сек`,
                      percentage: 5,
                      isPositive: true
                    }}
                  />
                  
                  <AnalyticsCard
                    title="Посетителей в день"
                    value={avgDailyVisitors.toLocaleString()}
                    icon={<TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />}
                    iconBgClass="bg-green-100 dark:bg-green-900/30"
                    change={{
                      value: Math.round(avgDailyVisitors * 0.1).toLocaleString(),
                      percentage: 10,
                      isPositive: true
                    }}
                  />
                </div>
                
                {/* Visitor trend chart */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center mb-6">
                    <BarChart3 className="w-6 h-6 text-primary-500 mr-3" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">Динамика посещений</h3>
                  </div>
                  <AnalyticsVisitorChart data={visitorData} height={320} />
                </div>
                
                {/* Page visits and popularity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center mb-6">
                      <Activity className="w-6 h-6 text-primary-500 mr-3" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">Посещаемость страниц</h3>
                    </div>
                    <AnalyticsPageVisitsTable pageVisits={pageVisits} />
                  </div>
                  
                  <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center mb-6">
                      <PieChart className="w-6 h-6 text-primary-500 mr-3" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">Популярность страниц</h3>
                    </div>
                    <div className="h-64">
                      <AnalyticsPagePopularityChart data={pagePopularity} height={250} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Rental Analytics */}
            {activeTab === 'rental' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 font-heading flex items-center">
                  <Building className="w-6 h-6 mr-3 text-primary-500" />
                  Аналитика аренды помещений
                </h2>

                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AnalyticsCard
                    title="Всего бронирований"
                    value={totalRentalBookings.toString()}
                    icon={<Building className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
                    change={{
                      value: Math.round(totalRentalBookings * 0.15).toString(),
                      percentage: 15,
                      isPositive: true
                    }}
                  />
                  
                  <AnalyticsCard
                    title="Общая выручка"
                    value={`${totalRentalRevenue.toLocaleString()} ₽`}
                    icon={<TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />}
                    iconBgClass="bg-green-100 dark:bg-green-900/30"
                    change={{
                      value: `${Math.round(totalRentalRevenue * 0.12).toLocaleString()} ₽`,
                      percentage: 12,
                      isPositive: true
                    }}
                  />
                  
                  <AnalyticsCard
                    title="Общее время аренды"
                    value={`${Math.floor(totalRentalHours)} ч.`}
                    icon={<Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                    iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                    change={{
                      value: `${Math.round(totalRentalHours * 0.08)} ч.`,
                      percentage: 8,
                      isPositive: true
                    }}
                  />
                  
                  <AnalyticsCard
                    title="Средняя длительность"
                    value={`${avgBookingDuration.toFixed(1)} ч.`}
                    icon={<Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
                    iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
                    change={{
                      value: `${(avgBookingDuration * 0.05).toFixed(1)} ч.`,
                      percentage: 5,
                      isPositive: true
                    }}
                  />
                </div>
                
                {/* Rental bookings chart */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center mb-6">
                    <BarChart3 className="w-6 h-6 text-primary-500 mr-3" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">Динамика бронирований</h3>
                  </div>
                  <AnalyticsRentalBookingsChart bookings={rentalBookings} height={320} />
                </div>
                
                {/* Rental bookings by day of week and time of day */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center mb-6">
                      <PieChart className="w-6 h-6 text-primary-500 mr-3" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">По дням недели</h3>
                    </div>
                    <div className="h-64">
                      <AnalyticsRentalBookingsChart 
                        bookings={rentalBookings} 
                        height={250} 
                        groupBy="dayOfWeek" 
                      />
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center mb-6">
                      <Clock className="w-6 h-6 text-primary-500 mr-3" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">По времени суток</h3>
                    </div>
                    <div className="h-64">
                      <AnalyticsRentalBookingsChart 
                        bookings={rentalBookings} 
                        height={250} 
                        groupBy="timeOfDay" 
                      />
                    </div>
                  </div>
                </div>
                
                {/* Rental bookings table */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center mb-6">
                    <Activity className="w-6 h-6 text-primary-500 mr-3" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">Последние бронирования</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
                      <thead className="bg-gray-50 dark:bg-dark-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дата</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Время</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Клиент</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Длительность</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Стоимость</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                        {rentalBookings.slice(0, 10).map((booking, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {new Date(booking.date).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {booking.startTime} - {booking.endTime}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {booking.clientName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                                {booking.durationHours.toFixed(1)} ч.
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400">
                              {booking.revenue.toLocaleString()} ₽
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Export Modal */}
        <AnalyticsExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          defaultDateRange={{
            startDate: customStartDate,
            endDate: customEndDate
          }}
        />
      </div>
    </div>
  );
};

export default AdminAnalytics;