import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, ChevronDown, Loader2, Star, TrendingUp, Award, BarChart3, DollarSign, Eye, Grid3X3, List, CalendarDays, Gift, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';
import { Dialog } from '@headlessui/react';

type ExportType = 'visitors' | 'full_stats';

// Функции форматирования
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Дата не указана';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric' 
    });
  } catch (error) {
    return 'Некорректная дата';
  }
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '--:--';
  try {
    return new Date(timeStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '--:--';
  }
};

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return 'Дата не указана';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    return 'Некорректная дата';
  }
};

const getEventTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    conference: 'Конференция',
    workshop: 'Мастер-класс',
    meetup: 'Встреча',
    seminar: 'Семинар',
    webinar: 'Вебинар',
    training: 'Тренинг'
  };
  return types[type] || type;
};

const getEventTypeIcon = (type: string) => {
  switch(type) {
    case 'conference': return <Award className="w-3 h-3" />;
    case 'workshop': return <Star className="w-3 h-3" />;
    case 'meetup': return <Users className="w-3 h-3" />;
    default: return <Calendar className="w-3 h-3" />;
  }
};

// Компонент карточки мероприятия
const EventCard = ({ event, isPast = false, isCompact = false }: { event: any, isPast?: boolean, isCompact?: boolean }) => {
  const [speakers, setSpeakers] = useState<any[]>([]);

  useEffect(() => {
    const loadSpeakers = async () => {
      if (!event.speakers || !Array.isArray(event.speakers)) return;
      
      try {
        const speakerIds = event.speakers.filter((speaker: any) => 
          typeof speaker === 'string' && speaker.length > 0
        );
        
        if (speakerIds.length === 0) return;

        const { data, error } = await supabase
          .from('speakers')
          .select('id, name, photos')
          .in('id', speakerIds)
          .eq('active', true);

        if (error) throw error;
        setSpeakers(data || []);
      } catch (error) {
        console.error('Error loading speakers:', error);
      }
    };

    loadSpeakers();
  }, [event.speakers]);

  // Используем поле registrations как JSONB объект
  const registrations = event.registrations || {};
  const currentRegs = parseInt(registrations.current || '0') || 0;
  const maxRegs = parseInt(registrations.max_registrations || registrations.max_regs || '0') || 0;
  const fillPercentage = maxRegs > 0 ? (currentRegs / maxRegs) * 100 : 0;

  const getStatusColor = () => {
    if (fillPercentage >= 90) return 'text-error-500';
    if (fillPercentage >= 70) return 'text-warning-500';
    return 'text-primary-500';
  };

  const getSpeakerPhoto = (speaker: any) => {
    if (!speaker.photos || !Array.isArray(speaker.photos)) return null;
    const mainPhoto = speaker.photos.find((photo: any) => photo.isMain) || speaker.photos[0];
    return mainPhoto?.url ? getSupabaseImageUrl(mainPhoto.url) : null;
  };

  return (
    <div className={`group relative bg-white dark:bg-dark-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 ${isCompact ? 'p-4' : 'p-6'}`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"></div>
      
      <div className={isCompact ? 'mt-2' : 'mt-4'}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-md text-xs font-medium">
                {getEventTypeIcon(event.event_type)}
                <span className="ml-1">{getEventTypeLabel(event.event_type)}</span>
              </span>
            </div>
            <h3 className={`font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${isCompact ? 'text-lg' : 'text-xl'}`}>
              {event.title || 'Без названия'}
            </h3>
          </div>
          <div className="text-right ml-4">
            {event.price > 0 ? (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <CreditCard className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span className={`font-bold text-primary-600 dark:text-primary-400 ${isCompact ? 'text-lg' : 'text-xl'}`}>
                    {event.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {event.currency || 'RUB'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-1">
                <Gift className={`text-success-600 dark:text-success-400 ${isCompact ? 'w-5 h-5' : 'w-6 h-6'}`} />
                <span className={`font-bold text-success-600 dark:text-success-400 ${isCompact ? 'text-sm' : 'text-base'}`}>
                  Бесплатно
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={`space-y-${isCompact ? '2' : '4'}`}>
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <div className={`flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3 ${isCompact ? 'w-6 h-6' : 'w-8 h-8'}`}>
              <Calendar className={`text-primary-600 dark:text-primary-400 ${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </div>
            <span className={`font-medium ${isCompact ? 'text-sm' : ''}`}>{formatDate(event.start_at)}</span>
          </div>

          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <div className={`flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3 ${isCompact ? 'w-6 h-6' : 'w-8 h-8'}`}>
              <Clock className={`text-primary-600 dark:text-primary-400 ${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </div>
            <span className={`font-medium ${isCompact ? 'text-sm' : ''}`}>
              {formatTime(event.start_at)} - {formatTime(event.end_at)}
            </span>
          </div>

          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <div className={`flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3 ${isCompact ? 'w-6 h-6' : 'w-8 h-8'}`}>
              <Users className={`text-primary-600 dark:text-primary-400 ${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </div>
            <span className={`font-medium ${isCompact ? 'text-sm' : ''}`}>
              <span className={getStatusColor()}>{currentRegs}</span> из {maxRegs} участников
            </span>
          </div>
        </div>

        {speakers.length > 0 && !isCompact && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Спикеры:</p>
            <div className="flex flex-wrap gap-3">
              {speakers.map((speaker) => {
                const photoUrl = getSpeakerPhoto(speaker);
                return (
                  <div 
                    key={speaker.id}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 text-primary-700 dark:text-primary-300 px-3 py-2 rounded-full text-sm font-medium"
                  >
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt={speaker.name}
                        className="w-6 h-6 rounded-full object-cover border-2 border-primary-200 dark:border-primary-600"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-primary-200 dark:bg-primary-600 rounded-full flex items-center justify-center">
                        <Users className="w-3 h-3 text-primary-600 dark:text-primary-300" />
                      </div>
                    )}
                    <span>{speaker.name || 'Без имени'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isPast && (
          <div className="mt-4">
            <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              Завершено
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент списочного элемента
const EventListItem = ({ event, isPast = false }: { event: any, isPast?: boolean }) => {
  const registrations = event.registrations || {};
  const currentRegs = parseInt(registrations.current || '0') || 0;
  const maxRegs = parseInt(registrations.max_registrations || registrations.max_regs || '0') || 0;

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-200 hover:shadow-md relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"></div>
      
      <div className="flex items-start justify-between mt-2">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              {getEventTypeIcon(event.event_type)}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1">
              {event.title && event.title.length > 50 
                ? `${event.title.substring(0, 50)}...` 
                : event.title || 'Без названия'}
            </h3>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDateShort(event.start_at)}
              </div>
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(event.start_at)}
              </div>
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                {currentRegs}/{maxRegs}
              </div>
              <span className="inline-flex items-center bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs font-medium">
                {getEventTypeLabel(event.event_type)}
              </span>
              <div className="flex items-center gap-1">
                {event.price > 0 ? (
                  <>
                    <CreditCard className="w-3 h-3" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {event.price.toLocaleString()} {event.currency || 'RUB'}
                    </span>
                  </>
                ) : (
                  <>
                    <Gift className="w-3 h-3 text-success-600" />
                    <span className="font-medium text-success-600">Бесплатно</span>
                  </>
                )}
              </div>
              {isPast && currentRegs > 0 && (
                <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-xs underline">
                  Подробнее
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент карточки статистики
const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }: { title: string, value: string | number, subtitle?: string, icon: any, color?: string }) => {
  return (
    <div className="bg-white dark:bg-dark-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-6 h-6 bg-${color}-100 dark:bg-${color}-900/30 rounded-md flex items-center justify-center`}>
          <Icon className={`w-3 h-3 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// Компонент загрузки
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="relative">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      <div className="absolute inset-0 w-8 h-8 border-2 border-primary-200 dark:border-primary-800 rounded-full"></div>
    </div>
    <span className="ml-3 text-gray-600 dark:text-gray-300 font-medium">Загрузка данных...</span>
  </div>
);

// Компонент тумблера переключения вида
const ViewToggle = ({ isListView, onToggle }: { isListView: boolean, onToggle: (value: boolean) => void }) => (
  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
    <button
      onClick={() => onToggle(false)}
      className={`p-2 rounded-md transition-all duration-200 ${
        !isListView 
          ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <Grid3X3 className="w-4 h-4" />
    </button>
    <button
      onClick={() => onToggle(true)}
      className={`p-2 rounded-md transition-all duration-200 ${
        isListView 
          ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <List className="w-4 h-4" />
    </button>
  </div>
);

// Функция загрузки событий из Supabase
const loadEventsFromSupabase = async (type: string, offset = 0, limit = 10) => {
  try {
    const now = new Date().toISOString();
    let query = supabase.from('events').select('*');

    if (type === 'nearest') {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query
        .gte('start_at', now)
        .lte('start_at', nextWeek)
        .eq('status', 'active')
        .order('start_at', { ascending: true })
        .limit(1);
    } else if (type === 'upcoming') {
      query = query
        .gte('start_at', now)
        .eq('status', 'active')
        .order('start_at', { ascending: true })
        .range(offset, offset + limit - 1);
    } else if (type === 'past') {
      query = query
        .or(`start_at.lt.${now},status.eq.past`)
        .order('start_at', { ascending: false })
        .range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return {
      data: (data || []).filter(event => event && event.id),
      hasMore: (data || []).length === limit
    };
  } catch (error) {
    console.error('Error loading events:', error);
    return { data: [], hasMore: false };
  }
};

// Основной компонент
const EventsStatistics = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isListView, setIsListView] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [events, setEvents] = useState({
    nearest: [],
    upcoming: [],
    past: []
  });
  const [loading, setLoading] = useState({
    nearest: false,
    upcoming: false,
    past: false
  });
  const [loadingMore, setLoadingMore] = useState({
    upcoming: false,
    past: false
  });
  const [pagination, setPagination] = useState({
    upcoming: { offset: 0, hasMore: true },
    past: { offset: 0, hasMore: true }
  });
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalParticipants: 0,
    totalRevenue: 0,
    avgParticipants: 0,
    completionRate: 0
  });

  // Состояния для модального окна экспорта
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('visitors');

  // Функция экспорта только посетителей
  const exportVisitors = async () => {
    try {
      const registrationsMap = new Map<string, { full_name: string; count: number }>();
      
      const eventTypes = ['nearest', 'upcoming', 'past'] as const;
      
      for (const type of eventTypes) {
        for (const event of events[type]) {
          // Используем поле registrations как JSONB объект
          const registrations = event.registrations || {};
          if (registrations.reg_list && Array.isArray(registrations.reg_list)) {
            registrations.reg_list.forEach((reg: any) => {
              if (reg.email && reg.full_name) {
                const email = reg.email.toLowerCase().trim();
                const current = registrationsMap.get(email);
                
                if (current) {
                  registrationsMap.set(email, {
                    full_name: current.full_name,
                    count: current.count + 1
                  });
                } else {
                  registrationsMap.set(email, {
                    full_name: reg.full_name.trim(),
                    count: 1
                  });
                }
              }
            });
          }
        }
      }
      
      const sortedRegistrations = Array.from(registrationsMap.entries())
        .map(([email, data]) => ({
          email,
          full_name: data.full_name,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count);
      
      const BOM = '\uFEFF';
      let csvContent = BOM + 'Имя,Email,Число посещений\n';
      
      sortedRegistrations.forEach(reg => {
        csvContent += `"${reg.full_name.replace(/"/g, '""')}","${reg.email}",${reg.count}\n`;
      });
      
      downloadCSV(csvContent, 'visitors_export');
      alert(`Экспортировано ${sortedRegistrations.length} уникальных посетителей`);
    } catch (error) {
      console.error('Ошибка экспорта посетителей:', error);
      alert('Ошибка при экспорте данных посетителей');
    }
  };

  // Функция экспорта полной статистики
  const exportFullStats = async () => {
    try {
      const eventStats: Array<{
        title: string;
        date: string;
        participants: number;
        revenue: number;
      }> = [];
      
      const eventTypes = ['nearest', 'upcoming', 'past'] as const;
      
      for (const type of eventTypes) {
        for (const event of events[type]) {
          const registrations = event.registrations || {};
          const regs = registrations.reg_list || [];
          const participants = regs.length;
          const revenue = regs.reduce((sum: number, reg: any) => sum + (reg.total_amount || 0), 0);
          
          eventStats.push({
            title: event.title || 'Без названия',
            date: formatDate(event.start_at),
            participants,
            revenue
          });
        }
      }
      
      const BOM = '\uFEFF';
      let csvContent = BOM + 'Мероприятие,Дата,Участников,Выручка\n';
      
      eventStats.forEach(stat => {
        csvContent += `"${stat.title.replace(/"/g, '""')}","${stat.date}",${stat.participants},${stat.revenue}\n`;
      });
      
      downloadCSV(csvContent, 'full_stats_export');
      alert(`Экспортирована статистика по ${eventStats.length} мероприятиям`);
    } catch (error) {
      console.error('Ошибка экспорта статистики:', error);
      alert('Ошибка при экспорте полной статистики');
    }
  };

  // Общая функция для скачивания CSV
  const downloadCSV = (content: string, prefix: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  const handleExportConfirm = () => {
    setIsExportModalOpen(false);
    if (exportType === 'visitors') {
      exportVisitors();
    } else {
      exportFullStats();
    }
  };

  // Функция расчета статистики
  const calculateStats = async () => {
    try {
      let query = supabase.from('events').select('*');
      const now = new Date();
      let startDate, endDate;

      switch (timeFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          startDate = new Date(weekStart.setHours(0, 0, 0, 0)).toISOString();
          endDate = new Date().toISOString();
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate = monthStart.toISOString();
          endDate = new Date().toISOString();
          break;
        case 'custom':
          if (customDateRange.start && customDateRange.end) {
            startDate = new Date(customDateRange.start).toISOString();
            endDate = new Date(customDateRange.end).toISOString();
          } else {
            startDate = null;
            endDate = new Date().toISOString();
          }
          break;
        default:
          endDate = new Date().toISOString();
      }

      if (timeFilter !== 'all') {
        if (startDate) {
          query = query.gte('start_at', startDate);
        }
        query = query.lte('start_at', endDate);
      } else {
        query = query.or(`start_at.lt.${new Date().toISOString()},status.eq.past`);
      }

      const { data: pastEvents, error } = await query;
      if (error) throw error;

      const totalEvents = pastEvents?.length || 0;
      let totalParticipants = 0;
      let totalRevenue = 0;
      let completedEvents = 0;

      pastEvents?.forEach(event => {
        const registrations = event.registrations || {};
        const participants = parseInt(registrations.current || '0') || 0;
        totalParticipants += participants;
        
        if (event.price && participants > 0) {
          totalRevenue += event.price * participants;
        }
        
        if (event.status === 'completed' || participants > 0) {
          completedEvents++;
        }
      });

      setStats({
        totalEvents,
        totalParticipants,
        totalRevenue,
        avgParticipants: totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0,
        completionRate: totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  // Начальная загрузка данных
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading({ nearest: true, upcoming: true, past: true });
      
      try {
        console.log('Loading initial data...');
        const [nearestResult, upcomingResult, pastResult] = await Promise.all([
          loadEventsFromSupabase('nearest', 0, 1),
          loadEventsFromSupabase('upcoming', 0, 6),
          loadEventsFromSupabase('past', 0, 10)
        ]);

        console.log('Loaded data:', { nearestResult, upcomingResult, pastResult });

        setEvents({
          nearest: nearestResult.data,
          upcoming: upcomingResult.data,
          past: pastResult.data
        });

        setPagination({
          upcoming: { offset: 6, hasMore: upcomingResult.hasMore },
          past: { offset: 10, hasMore: pastResult.hasMore }
        });

        await calculateStats();
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading({ nearest: false, upcoming: false, past: false });
      }
    };

    loadInitialData();
  }, []);

  // Пересчет статистики при изменении фильтра времени
  useEffect(() => {
    calculateStats();
  }, [timeFilter, customDateRange]);

  // Функция загрузки дополнительных данных
  const loadMore = async (type: string) => {
    if (!pagination[type as keyof typeof pagination].hasMore) return;

    setLoadingMore(prev => ({ ...prev, [type]: true }));

    try {
      const result = await loadEventsFromSupabase(type, pagination[type as keyof typeof pagination].offset, 10);
      
      setEvents(prev => ({
        ...prev,
        [type]: [...prev[type as keyof typeof prev], ...result.data]
      }));

      setPagination(prev => ({
        ...prev,
        [type]: {
          offset: prev[type as keyof typeof prev].offset + 10,
          hasMore: result.hasMore
        }
      }));
    } catch (error) {
      console.error(`Error loading more ${type} events:`, error);
    } finally {
      setLoadingMore(prev => ({ ...prev, [type]: false }));
    }
  };

  // Константы для фильтров и вкладок
  const timeFilters = [
    { id: 'all', label: 'Все время', icon: CalendarDays },
    { id: 'today', label: 'Сегодня', icon: Calendar },
    { id: 'week', label: 'Неделя', icon: Calendar },
    { id: 'month', label: 'Месяц', icon: Calendar },
    { id: 'custom', label: 'Период', icon: CalendarDays }
  ];

  const tabs = [
    { id: 'dashboard', label: 'Дашборд', icon: BarChart3 },
    { id: 'upcoming', label: 'Предстоящие', count: events.upcoming.length, icon: Calendar },
    { id: 'past', label: 'Прошедшие', count: events.past.length, icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4">
            Управление мероприятиями
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Полная аналитика и контроль ваших событий
          </p>
        </div>

        {/* Вкладки */}
        <div className="mb-10">
          <div className="flex flex-wrap justify-center gap-2 bg-white dark:bg-dark-800 p-2 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-2" />
                  {tab.label}
                  {tab.count && tab.count > 0 && (
                    <span className={`ml-3 px-2 py-1 text-sm rounded-full font-bold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Контент вкладок */}
        <div className="space-y-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Объединенный блок статистики и фильтра */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Статистика с фильтром */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6">
                    {/* Фильтр по времени */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2 text-primary-500" />
                          Статистика
                        </h3>
                        <button
                          onClick={handleExportClick}
                          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg transition-colors duration-200 shadow-sm text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Экспорт
                        </button>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Период:</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {timeFilters.map((filter) => {
                            const IconComponent = filter.icon;
                            return (
                              <button
                                key={filter.id}
                                onClick={() => setTimeFilter(filter.id)}
                                className={`flex items-center px-2 py-1 rounded-md font-medium transition-all duration-200 text-xs ${
                                  timeFilter === filter.id
                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <IconComponent className="w-3 h-3 mr-1" />
                                {filter.label}
                              </button>
                            );
                          })}
                        </div>
                        
                        {timeFilter === 'custom' && (
                          <div className="flex gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">От</label>
                              <input
                                type="date"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">До</label>
                              <input
                                type="date"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Компактная статистика 2x2 */}
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard
                        title="Мероприятий"
                        value={stats.totalEvents}
                        icon={Calendar}
                        color="primary"
                      />
                      <StatCard
                        title="Участников"
                        value={stats.totalParticipants.toLocaleString()}
                        icon={Users}
                        color="success"
                      />
                      <StatCard
                        title="Выручка"
                        value={`${Math.round(stats.totalRevenue / 1000)}K ₽`}
                        icon={DollarSign}
                        color="warning"
                      />
                      <StatCard
                        title="Ср. посещ."
                        value={stats.avgParticipants}
                        subtitle={`${stats.completionRate}% успех`}
                        icon={TrendingUp}
                        color="error"
                      />
                    </div>
                  </div>
                </div>

                {/* Ближайшее мероприятие */}
                <div className="lg:col-span-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-primary-500" />
                    Ближайшее мероприятие
                  </h2>
                  {loading.nearest ? (
                    <LoadingSpinner />
                  ) : events.nearest.length > 0 ? (
                    <div>
                      {events.nearest.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-primary-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Нет ближайших мероприятий
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Запланируйте новое мероприятие
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Предстоящие мероприятия */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Calendar className="w-6 h-6 mr-3 text-primary-500" />
                    Предстоящие мероприятия
                  </h2>
                  <div className="flex items-center gap-4">
                    <ViewToggle isListView={isListView} onToggle={setIsListView} />
                    <button
                      onClick={() => setActiveTab('upcoming')}
                      className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Смотреть все
                    </button>
                  </div>
                </div>
                {loading.upcoming ? (
                  <LoadingSpinner />
                ) : events.upcoming.length > 0 ? (
                  <div>
                    {isListView ? (
                      <div className="space-y-3">
                        {events.upcoming.slice(0, 6).map((event) => (
                          <EventListItem key={event.id} event={event} />
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {events.upcoming.slice(0, 6).map((event) => (
                          <EventCard key={event.id} event={event} isCompact={true} />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-primary-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Нет предстоящих мероприятий
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Создайте новое мероприятие
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Calendar className="w-6 h-6 mr-3 text-primary-500" />
                  Предстоящие мероприятия
                </h2>
                <ViewToggle isListView={isListView} onToggle={setIsListView} />
              </div>
              {loading.upcoming ? (
                <LoadingSpinner />
              ) : events.upcoming.length > 0 ? (
                <div className="space-y-8">
                  {isListView ? (
                    <div className="space-y-3">
                      {events.upcoming.map((event) => (
                        <EventListItem key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                      {events.upcoming.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                  {pagination.upcoming.hasMore && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => loadMore('upcoming')}
                        disabled={loadingMore.upcoming}
                        className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                      >
                        {loadingMore.upcoming ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Загрузка...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-5 h-5 mr-2" />
                            Показать еще 10 мероприятий
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-12 h-12 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Нет предстоящих мероприятий
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Создайте новое мероприятие, чтобы начать привлекать участников
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3 text-primary-500" />
                  Прошедшие мероприятия
                </h2>
                <ViewToggle isListView={isListView} onToggle={setIsListView} />
              </div>
              
              {loading.past ? (
                <LoadingSpinner />
              ) : events.past.length > 0 ? (
                <div className="space-y-8">
                  {isListView ? (
                    <div className="space-y-3">
                      {events.past.map((event) => (
                        <EventListItem key={event.id} event={event} isPast={true} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                      {events.past.map((event) => (
                        <EventCard key={event.id} event={event} isPast={true} />
                      ))}
                    </div>
                  )}
                  
                  {pagination.past.hasMore && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => loadMore('past')}
                        disabled={loadingMore.past}
                        className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                      >
                        {loadingMore.past ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Загрузка...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-5 h-5 mr-2" />
                            Показать еще 10 мероприятий
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-12 h-12 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Нет прошедших мероприятий
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Здесь появится история ваших завершенных мероприятий
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Модальное окно экспорта */}
        <Dialog
          open={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          className="fixed z-50 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" />
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-dark-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Выберите тип экспорта
                </Dialog.Title>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start">
                    <input
                      id="visitors-export"
                      type="radio"
                      checked={exportType === 'visitors'}
                      onChange={() => setExportType('visitors')}
                      className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                    />
                    <label htmlFor="visitors-export" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">Только посетители</span>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">Содержит: Имя, Email, Число посещений</p>
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      id="fullstats-export"
                      type="radio"
                      checked={exportType === 'full_stats'}
                      onChange={() => setExportType('full_stats')}
                      className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                    />
                    <label htmlFor="fullstats-export" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">Полная статистика</span>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">Содержит: Мероприятие, Дата, Участников, Выручка</p>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleExportConfirm}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Экспортировать
                </button>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-dark-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
};

export default EventsStatistics;