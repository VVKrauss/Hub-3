import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Users, 
  DollarSign, 
  Clock, 
  Calendar, 
  MapPin, 
  Mail, 
  Phone, 
  TrendingUp, 
  ArrowRight, 
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Ticket,
  PieChart,
  BarChart2,
  User,
  Baby
} from 'lucide-react';

interface EventRegistration {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  adultRegistrations: number;
  childRegistrations: number;
  totalRegistrations: number;
  maxCapacity: number;
  paymentLinkClicks: number;
  conversionRate: number;
  revenue: number;
  registrationDetails: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    adultTickets: number;
    childTickets: number;
    totalAmount: number;
    status: boolean;
    createdAt: string;
  }>;
}

interface AnalyticsEventDetailedStatsProps {
  event: EventRegistration;
}

const AnalyticsEventDetailedStats = ({ event }: AnalyticsEventDetailedStatsProps) => {
  const [showAllRegistrations, setShowAllRegistrations] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'registrations'>('stats');
  
  // Calculate statistics
  const fillRate = Math.round((event.totalRegistrations / event.maxCapacity) * 100);
  const remainingCapacity = event.maxCapacity - event.totalRegistrations;
  
  // Registration timeline data
  const registrationsByDay = event.registrationDetails.reduce((acc, reg) => {
    const date = reg.createdAt.split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, count: 0, revenue: 0 };
    }
    acc[date].count += reg.adultTickets + reg.childTickets;
    acc[date].revenue += reg.totalAmount;
    return acc;
  }, {} as Record<string, { date: string; count: number; revenue: number }>);
  
  const timelineData = Object.values(registrationsByDay).sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculate daily stats
  const daysUntilEvent = Math.max(0, Math.round((new Date(event.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  const registrationsPerDay = daysUntilEvent > 0 ? event.totalRegistrations / daysUntilEvent : event.totalRegistrations;
  const projectedRegistrations = Math.min(event.maxCapacity, Math.round(event.totalRegistrations + (registrationsPerDay * daysUntilEvent)));

  return (
    <div className="space-y-6">
      {/* Header with event title */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold">{event.eventTitle}</h2>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>{format(new Date(event.eventDate), 'dd MMMM yyyy', { locale: ru })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>{event.eventTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <span>{event.eventLocation}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-dark-700">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === 'stats' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <PieChart className="h-4 w-4" />
          Статистика
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === 'registrations' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users className="h-4 w-4" />
          Участники ({event.totalRegistrations})
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Registrations */}
            <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Всего регистраций</p>
                  <h3 className="text-2xl font-bold mt-1">{event.totalRegistrations}</h3>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <User className="h-4 w-4" />
                  <span>{event.adultRegistrations} взрослых</span>
                </div>
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Baby className="h-4 w-4" />
                  <span>{event.childRegistrations} детей</span>
                </div>
              </div>
            </div>

            {/* Fill Rate */}
            <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Заполняемость</p>
                  <h3 className="text-2xl font-bold mt-1">{fillRate}%</h3>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-100 dark:bg-dark-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${fillRate}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {remainingCapacity} из {event.maxCapacity} мест свободно
                </p>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Выручка</p>
                  <h3 className="text-2xl font-bold mt-1">{event.revenue.toLocaleString()} ₽</h3>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Средний чек: {event.totalRegistrations > 0 
                    ? Math.round(event.revenue / event.totalRegistrations).toLocaleString() 
                    : 0} ₽
                </p>
              </div>
            </div>

            {/* Projection */}
            <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Прогноз</p>
                  <h3 className="text-2xl font-bold mt-1">{projectedRegistrations}</h3>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <BarChart2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="mt-4 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  {daysUntilEvent} дней до мероприятия
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  ~{registrationsPerDay.toFixed(1)} регистраций/день
                </p>
              </div>
            </div>
          </div>

          {/* Registration Timeline */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-dark-700">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-600" />
                Динамика регистраций
              </h3>
            </div>
            <div className="p-5">
              <div className="h-64">
                <div className="flex items-end h-full gap-1">
                  {timelineData.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center group">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                        style={{ 
                          height: `${(day.count / Math.max(...timelineData.map(d => d.count))) * 100}%`,
                          minHeight: day.count > 0 ? '2px' : '0'
                        }}
                        title={`${day.count} регистраций\n${day.revenue.toLocaleString()} ₽`}
                      ></div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {format(new Date(day.date), 'dd.MM')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Tab */}
      {activeTab === 'registrations' && (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Список участников
            </h3>
            <button
              onClick={() => setShowAllRegistrations(!showAllRegistrations)}
              className="text-sm flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {showAllRegistrations ? (
                <>
                  <span>Свернуть</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Показать все ({event.registrationDetails.length})</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Участник</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Контакты</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Билеты</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Сумма</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
                {(showAllRegistrations ? event.registrationDetails : event.registrationDetails.slice(0, 5)).map((reg, index) => (
                  <tr 
                    key={index} 
                    className={`hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors ${!reg.status ? 'opacity-70' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {reg.fullName}
                            {!reg.status && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                Отменена
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">{reg.email}</span>
                        </div>
                        {reg.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">{reg.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-4 w-4 text-blue-500" />
                          <span>{reg.adultTickets}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Baby className="h-4 w-4 text-purple-500" />
                          <span>{reg.childTickets}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span>{reg.totalAmount.toLocaleString()} ₽</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(reg.createdAt), 'dd.MM.yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {event.registrationDetails.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-400">
                <Users className="w-full h-full opacity-50" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Нет зарегистрированных участников</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Начните продвижение мероприятия, чтобы привлечь участников.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsEventDetailedStats;