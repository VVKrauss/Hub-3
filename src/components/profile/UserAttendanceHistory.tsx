// src/components/profile/UserAttendanceHistory.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, User, Clock, FileText, Award, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface AttendanceRecord {
  id: string;
  scanned_at: string;
  event_id?: string;
  location?: string;
  notes?: string;
  attendance_type: string;
  scanned_by_profile: {
    name: string;
  };
  event?: {
    title: string;
    event_type: string;
    start_at: string;
  };
}

interface AttendanceStats {
  total: number;
  thisMonth: number;
  thisYear: number;
  eventAttendance: number;
  generalAttendance: number;
}

interface UserAttendanceHistoryProps {
  userId: string;
}

const UserAttendanceHistory: React.FC<UserAttendanceHistoryProps> = ({ userId }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    thisMonth: 0,
    thisYear: 0,
    eventAttendance: 0,
    generalAttendance: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'events' | 'general'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchAttendanceData();
  }, [userId, filter]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Получаем статистику
      await fetchStats();
      
      // Получаем записи посещений
      await fetchAttendanceRecords(1);
      
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Ошибка загрузки данных о посещениях');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_attendance')
        .select('scanned_at, attendance_type')
        .eq('user_id', userId);

      if (error) throw error;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const calculatedStats: AttendanceStats = {
        total: data.length,
        thisMonth: data.filter(record => {
          const recordDate = new Date(record.scanned_at);
          return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        }).length,
        thisYear: data.filter(record => {
          const recordDate = new Date(record.scanned_at);
          return recordDate.getFullYear() === currentYear;
        }).length,
        eventAttendance: data.filter(record => record.attendance_type === 'event').length,
        generalAttendance: data.filter(record => record.attendance_type === 'general').length
      };

      setStats(calculatedStats);
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
          scanned_by_profile:profiles!user_attendance_scanned_by_fkey(name),
          event:events(title, event_type, start_at)
        `)
        .eq('user_id', userId)
        .order('scanned_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('attendance_type', filter === 'events' ? 'event' : 'general');
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

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchAttendanceRecords(page + 1);
    }
  };

  const getAttendanceTypeIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'coworking':
        return <User className="h-4 w-4 text-purple-500" />;
      default:
        return <MapPin className="h-4 w-4 text-green-500" />;
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    switch (type) {
      case 'event':
        return 'Мероприятие';
      case 'coworking':
        return 'Коворкинг';
      default:
        return 'Общее посещение';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-dark-600 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-dark-600 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-dark-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">История посещений</h3>
        </div>
        <p className="text-blue-100 text-sm mt-1">
          Ваша активность в Science Hub
        </p>
      </div>

      <div className="p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Всего</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.total}</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">В этом месяце</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.thisMonth}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400">Мероприятия</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.eventAttendance}</p>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400">В этом году</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.thisYear}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }`}
          >
            Все посещения
          </button>
          <button
            onClick={() => setFilter('events')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'events'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }`}
          >
            Мероприятия ({stats.eventAttendance})
          </button>
          <button
            onClick={() => setFilter('general')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'general'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }`}
          >
            Общие ({stats.generalAttendance})
          </button>
        </div>

        {/* Attendance Records */}
        {attendanceRecords.length > 0 ? (
          <div className="space-y-3">
            {attendanceRecords.map((record) => (
              <div
                key={record.id}
                className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getAttendanceTypeIcon(record.attendance_type)}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getAttendanceTypeLabel(record.attendance_type)}
                      </span>
                      {record.event && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                          {record.event.title}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(record.scanned_at)}</span>
                      </div>

                      {record.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{record.location}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>Отметил: {record.scanned_by_profile.name}</span>
                      </div>
                    </div>

                    {record.notes && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-dark-600 rounded text-sm">
                        <div className="flex items-start gap-1">
                          <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{record.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-4">
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
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Нет записей о посещениях</h3>
            <p className="text-sm">
              {filter === 'all' 
                ? 'У вас пока нет записей о посещениях. Покажите QR-код админу для отметки.'
                : filter === 'events'
                ? 'У вас нет посещений мероприятий.'
                : 'У вас нет общих посещений.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAttendanceHistory; 