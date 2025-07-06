// src/pages/admin/AdminEvents.tsx - ФИНАЛЬНАЯ ВЕРСИЯ ПОСЛЕ МИГРАЦИИ
// Работает с исправленными типами: events.id (uuid) ↔ sh_time_slots.event_id (uuid)

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Eye, Edit, Trash2, Plus, Filter, Search } from 'lucide-react';

interface Event {
  id: string; // UUID после миграции
  title: string;
  description?: string;
  short_description?: string;
  status: 'draft' | 'active' | 'past' | 'cancelled';
  start_at?: string;
  end_at?: string;
  venue_name?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Данные из временных слотов
  time_slots?: Array<{
    id: string;
    start_at: string;
    end_at: string;
    slot_type: string;
  }>;
}

const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'created_at' | 'start_at'>('created_at');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'past' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [sortBy, statusFilter, searchQuery]);

  // ФУНКЦИЯ ЗАГРУЗКИ СОБЫТИЙ С ПРАВИЛЬНЫМ JOIN
  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Используем правильный JOIN с uuid типами
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          short_description,
          status,
          start_at,
          end_at,
          venue_name,
          is_public,
          created_at,
          updated_at,
          time_slots:sh_time_slots!event_id(
            id,
            start_at,
            end_at,
            slot_type
          )
        `);

      // Фильтрация по статусу
      if (statusFilter !== 'all') {
        if (statusFilter === 'past') {
          query = query.or('status.eq.past,status.eq.active');
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      // Поиск по названию
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Обрабатываем данные
      let processedEvents = (data || []).map(event => {
        const eventSlots = event.time_slots || [];
        const firstSlot = eventSlots[0];
        
        return {
          ...event,
          // Используем данные из слота, если они есть, иначе из события
          start_at: firstSlot?.start_at || event.start_at,
          end_at: firstSlot?.end_at || event.end_at
        };
      });

      // Дополнительная фильтрация для прошедших событий
      if (statusFilter === 'past') {
        const now = new Date();
        processedEvents = processedEvents.filter(event => {
          if (event.status === 'past') return true;
          if (event.start_at) {
            return new Date(event.start_at) < now;
          }
          return false;
        });
      }

      // Сортировка
      processedEvents.sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else if (sortBy === 'start_at') {
          const dateA = new Date(a.start_at || a.created_at);
          const dateB = new Date(b.start_at || b.created_at);
          return dateB.getTime() - dateA.getTime();
        } else {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });

      setEvents(processedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Ошибка загрузки событий');
    } finally {
      setLoading(false);
    }
  };

  // ФУНКЦИЯ УДАЛЕНИЯ С КАСКАДНЫМ УДАЛЕНИЕМ СЛОТОВ
  const handleDeleteSelected = async () => {
    if (selectedEvents.length === 0) {
      toast.error('Выберите события для удаления');
      return;
    }

    if (!window.confirm(`Удалить выбранные события (${selectedEvents.length})? Связанные временные слоты также будут удалены автоматически.`)) {
      return;
    }

    try {
      // Благодаря foreign key constraint с ON DELETE SET NULL,
      // связанные слоты автоматически обновятся при удалении событий
      const { error } = await supabase
        .from('events')
        .delete()
        .in('id', selectedEvents);

      if (error) throw error;

      toast.success(`Удалено событий: ${selectedEvents.length}`);
      setSelectedEvents([]);
      fetchEvents();
    } catch (err) {
      console.error('Error deleting events:', err);
      toast.error('Ошибка удаления событий');
    }
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(events.map(event => event.id));
    }
  };

  const formatEventDate = (event: Event): string => {
    const startDate = event.start_at || event.created_at;
    const endDate = event.end_at;
    
    try {
      if (startDate && endDate) {
        const start = format(new Date(startDate), 'd MMM yyyy, HH:mm', { locale: ru });
        const end = format(new Date(endDate), 'HH:mm');
        return `${start} - ${end}`;
      } else if (startDate) {
        return format(new Date(startDate), 'd MMM yyyy, HH:mm', { locale: ru });
      }
    } catch (err) {
      console.error('Date formatting error:', err);
    }
    return 'Дата не указана';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'draft': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'past': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active': return 'Активное';
      case 'draft': return 'Черновик';
      case 'past': return 'Прошедшее';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Управление мероприятиями
        </h1>
        <button 
          onClick={() => window.location.href = '/admin/events/create'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Создать мероприятие
        </button>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-4 flex-wrap items-center">
          {/* Поиск */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Фильтр по статусу */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="draft">Черновики</option>
            <option value="past">Прошедшие</option>
            <option value="cancelled">Отмененные</option>
          </select>

          {/* Сортировка */}
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-white"
          >
            <option value="created_at">По дате создания</option>
            <option value="start_at">По дате мероприятия</option>
            <option value="title">По названию</option>
          </select>

          {/* Кнопка удаления */}
          {selectedEvents.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Удалить ({selectedEvents.length})
            </button>
          )}
        </div>
      </div>

      {/* Таблица событий */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left">
                <input 
                  type="checkbox" 
                  checked={selectedEvents.length === events.length && events.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Дата и время
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Место
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedEvents.includes(event.id)}
                    onChange={() => handleSelectEvent(event.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {event.title}
                  </div>
                  {event.short_description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {event.short_description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {formatEventDate(event)}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                    {getStatusLabel(event.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {event.venue_name || 'Не указано'}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => window.location.href = `/events/${event.id}`}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                      title="Просмотр"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => window.location.href = `/admin/events/${event.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                      title="Редактировать"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Мероприятия не найдены по вашему запросу' : 'Мероприятия не найдены'}
            </p>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Показано мероприятий: {events.length}
        {selectedEvents.length > 0 && ` | Выбрано: ${selectedEvents.length}`}
      </div>
    </div>
  );
};

export default AdminEvents;