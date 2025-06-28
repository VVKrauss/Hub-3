// src/pages/admin/AdminAttendance.tsx
import React, { useState, useEffect } from 'react';
import { Camera, Users, Calendar, Download, Search, Eye, BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import QRScanner from '../../components/admin/QRScanner';
import { format, subDays, startOfMonth } from 'date-fns';

interface AttendanceRecord {
  id: string;
  scanned_at: string;
  event_id?: string;
  location?: string;
  notes?: string;
  attendance_type: string;
  user_profile: {
    name: string;
  };
  scanned_by_profile: {
    name: string;
  };
  event?: {
    title: string;
    event_type: string;
  };
}

interface AttendanceStats {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  uniqueUsersToday: number;
  uniqueUsersThisMonth: number;
  eventAttendance: number;
  generalAttendance: number;
}

const AdminAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalToday: 0,
    totalThisWeek: 0,
    totalThisMonth: 0,
    uniqueUsersToday: 0,
    uniqueUsersThisMonth: 0,
    eventAttendance: 0,
    generalAttendance: 0
  });
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'event' | 'general'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchData();
  }, [filterType, dateFilter, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchAttendanceRecords(1)
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = subDays(now, 7);
      const startOfMonthDate = startOfMonth(now);

      const { data, error } = await supabase
        .from('user_attendance')
        .select(`
          id,
          scanned_at,
          attendance_type,
          user_id
        `);

      if (error) throw error;

      const todayRecords = data.filter(record => 
        new Date(record.scanned_at) >= startOfDay
      );
      
      const weekRecords = data.filter(record => 
        new Date(record.scanned_at) >= startOfWeek
      );
      
      const monthRecords = data.filter(record => 
        new Date(record.scanned_at) >= startOfMonthDate
      );

      const uniqueUsersToday = new Set(todayRecords.map(r => r.user_id)).size;
      const uniqueUsersThisMonth = new Set(monthRecords.map(r => r.user_id)).size;

      setStats({
        totalToday: todayRecords.length,
        totalThisWeek: weekRecords.length,
        totalThisMonth: monthRecords.length,
        uniqueUsersToday,
        uniqueUsersThisMonth,
        eventAttendance: data.filter(r => r.attendance_type === 'event').length,
        generalAttendance: data.filter(r => r.attendance_type === 'general').length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAttendanceRecords = async (pageNum: number) => {
    try {
      let query = supabase
        .from('user_attendance')
        .select(`
          *,
          user_profile:profiles!user_attendance_user_id_fkey(name),
          scanned_by_profile:profiles!user_attendance_scanned_by_fkey(name),
          event:events(title, event_type)
        `)
        .order('scanned_at', { ascending: false });

      // Применяем фильтры
      if (filterType !== 'all') {
        query = query.eq('attendance_type', filterType);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = subDays(now, 7);
            break;
          case 'month':
            startDate = startOfMonth(now);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('scanned_at', startDate.toISOString());
      }

      // Поиск по имени пользователя
      if (searchTerm) {
        // Для поиска нам нужно сначала найти пользователей, затем их посещения
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('name', `%${searchTerm}%`);

        if (usersError) throw usersError;

        if (users && users.length > 0) {
          const userIds = users.map(u => u.id);
          query = query.in('user_id', userIds);
        } else {
          // Если пользователи не найдены, возвращаем пустой результат
          setAttendanceRecords([]);
          setHasMore(false);
          return;
        }
      }

      const from = (pageNum - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      if (pageNum === 1) {
        setAttendanceRecords(data || []);
      } else {
        setAttendanceRecords(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Ошибка загрузки записей посещений');
    }
  };

  const exportData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_attendance')
        .select(`
          scanned_at,
          attendance_type,
          location,
          notes,
          user_profile:profiles!user_attendance_user_id_fkey(name),
          scanned_by_profile:profiles!user_attendance_scanned_by_fkey(name),
          event:events(title, event_type)
        `)
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      // Создаем CSV
      const headers = [
        'Дата и время',
        'Пользователь',
        'Тип посещения',
        'Мероприятие',
        'Местоположение',
        'Заметки',
        'Отметил'
      ];

      const csvContent = [
        headers.join(','),
        ...data.map(record => [
          format(new Date(record.scanned_at), 'dd.MM.yyyy HH:mm'),
          `"${record.user_profile.name}"`,
          record.attendance_type === 'event' ? 'Мероприятие' : 'Общее',
          record.event ? `"${record.event.title}"` : '',
          record.location ? `"${record.location}"` : '',
          record.notes ? `"${record.notes}"` : '',
          `"${record.scanned_by_profile.name}"`
        ].join(','))
      ].join('\n');

      // Скачиваем файл
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Данные экспортированы');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Ошибка экспорта данных');
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchAttendanceRecords(page + 1);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
  };

  const getAttendanceTypeLabel = (type: string) => {
    switch (type) {
      case 'event':
        return 'Мероприятие';
      case 'coworking':
        return 'Коворкинг';
      default:
        return 'Общее';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
            Управление посещениями
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Сканирование QR-кодов и учет посещений пользователей
          </p>
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Camera className="h-5 w-5" />
          Сканировать QR-код
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Сегодня</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.totalToday}</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                {stats.uniqueUsersToday} уникальных пользователей
              </p>
            </div>
            <Calendar className="h-12 w-12 text-blue-500 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 mb-1">За неделю</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.totalThisWeek}</p>
              <p className="text-xs text-green-500 dark:text-green-400 mt-1">посещений</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-500 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">За месяц</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.totalThisMonth}</p>
              <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                {stats.uniqueUsersThisMonth} уникальных пользователей
              </p>
            </div>
            <Users className="h-12 w-12 text-purple-500 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Мероприятия</p>
              <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.eventAttendance}</p>
              <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                vs {stats.generalAttendance} общих
              </p>
            </div>
            <BarChart3 className="h-12 w-12 text-orange-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 w-64"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'event' | 'general')}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
            >
              <option value="all">Все типы</option>
              <option value="event">Мероприятия</option>
              <option value="general">Общие посещения</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'today' | 'week' | 'month' | 'all')}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
            >
              <option value="today">Сегодня</option>
              <option value="week">Последние 7 дней</option>
              <option value="month">Этот месяц</option>
              <option value="all">Все время</option>
            </select>
          </div>

          <button
            onClick={exportData}
            className="btn-outline flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Экспорт CSV
          </button>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-dark-600">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Записи посещений
          </h2>
        </div>

        {loading && attendanceRecords.length === 0 ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-dark-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-dark-600 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        ) : attendanceRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Дата и время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Мероприятие/Место
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Отметил
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Заметки
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-600">
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {record.user_profile.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(record.scanned_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.attendance_type === 'event'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {getAttendanceTypeLabel(record.attendance_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {record.event ? (
                        <div>
                          <div className="font-medium">{record.event.title}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {record.event.event_type}
                          </div>
                        </div>
                      ) : (
                        record.location || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {record.scanned_by_profile.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                      {record.notes ? (
                        <div className="truncate" title={record.notes}>
                          {record.notes}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Load More */}
            {hasMore && (
              <div className="p-6 text-center border-t border-gray-200 dark:border-dark-600">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-outline"
                >
                  {loading ? 'Загрузка...' : 'Показать больше'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Нет записей посещений</h3>
            <p className="text-sm">
              {searchTerm || filterType !== 'all' || dateFilter !== 'all'
                ? 'Попробуйте изменить фильтры поиска'
                : 'Начните сканировать QR-коды пользователей для отметки посещений'
              }
            </p>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          isOpen={showScanner}
          onClose={() => {
            setShowScanner(false);
            fetchData(); // Обновляем данные после закрытия сканера
          }}
        />
      )}
    </div>
  );
};

export default AdminAttendance;