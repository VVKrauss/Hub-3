// src/hooks/useRegistrationStats.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface RegistrationStats {
  totalRegistrations: number;
  activeRegistrations: number;
  pastRegistrations: number;
  cancelledRegistrations: number;
  totalRevenue: number;
  pendingPayments: number;
  recentRegistrations: any[];
  topEvents: Array<{
    eventId: string;
    eventTitle: string;
    registrationCount: number;
    revenue: number;
  }>;
}

export const useRegistrationStats = (eventId?: string) => {
  const [stats, setStats] = useState<RegistrationStats>({
    totalRegistrations: 0,
    activeRegistrations: 0,
    pastRegistrations: 0,
    cancelledRegistrations: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    recentRegistrations: [],
    topEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('user_event_registrations')
        .select(`
          *,
          event:events(
            id,
            title,
            start_at,
            end_at,
            status
          )
        `);

      // Если указан eventId, фильтруем по нему
      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data: registrations, error: fetchError } = await query
        .order('registration_date', { ascending: false });

      if (fetchError) throw fetchError;

      const now = new Date();
      
      // Подсчитываем статистику
      const totalRegistrations = registrations?.length || 0;
      
      const activeRegistrations = registrations?.filter(reg => 
        reg.status === 'active' && 
        (!reg.event?.start_at || new Date(reg.event.start_at) >= now)
      ).length || 0;
      
      const pastRegistrations = registrations?.filter(reg => 
        reg.status === 'active' && 
        reg.event?.start_at && 
        new Date(reg.event.start_at) < now
      ).length || 0;
      
      const cancelledRegistrations = registrations?.filter(reg => 
        reg.status === 'cancelled'
      ).length || 0;
      
      const totalRevenue = registrations?.reduce((sum, reg) => 
        reg.payment_status === 'paid' ? sum + (reg.total_amount || 0) : sum, 0
      ) || 0;
      
      const pendingPayments = registrations?.reduce((sum, reg) => 
        reg.payment_status === 'pending' ? sum + (reg.total_amount || 0) : sum, 0
      ) || 0;

      // Последние регистрации (только если не фильтруем по событию)
      const recentRegistrations = !eventId 
        ? registrations?.slice(0, 10) || []
        : [];

      // Топ событий по регистрациям (только если не фильтруем по событию)
      const topEvents = !eventId ? getTopEvents(registrations || []) : [];

      setStats({
        totalRegistrations,
        activeRegistrations,
        pastRegistrations,
        cancelledRegistrations,
        totalRevenue,
        pendingPayments,
        recentRegistrations,
        topEvents
      });

    } catch (err) {
      console.error('Error fetching registration stats:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const getTopEvents = (registrations: any[]) => {
    const eventMap = new Map<string, {
      eventId: string;
      eventTitle: string;
      registrationCount: number;
      revenue: number;
    }>();

    registrations.forEach(reg => {
      if (!reg.event?.id) return;
      
      const eventId = reg.event.id;
      const eventTitle = reg.event.title || 'Без названия';
      const revenue = reg.payment_status === 'paid' ? (reg.total_amount || 0) : 0;

      if (eventMap.has(eventId)) {
        const existing = eventMap.get(eventId)!;
        existing.registrationCount += 1;
        existing.revenue += revenue;
      } else {
        eventMap.set(eventId, {
          eventId,
          eventTitle,
          registrationCount: 1,
          revenue
        });
      }
    });

    return Array.from(eventMap.values())
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, 5);
  };

  // Функция для обновления статистики после изменений
  const updateStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  // Функция для добавления новой регистрации в статистику
  const addRegistration = useCallback((registration: any) => {
    setStats(prevStats => ({
      ...prevStats,
      totalRegistrations: prevStats.totalRegistrations + 1,
      activeRegistrations: prevStats.activeRegistrations + 1,
      totalRevenue: registration.payment_status === 'paid' 
        ? prevStats.totalRevenue + (registration.total_amount || 0)
        : prevStats.totalRevenue,
      pendingPayments: registration.payment_status === 'pending'
        ? prevStats.pendingPayments + (registration.total_amount || 0)
        : prevStats.pendingPayments,
      recentRegistrations: [registration, ...prevStats.recentRegistrations.slice(0, 9)]
    }));
  }, []);

  // Функция для отмены регистрации
  const cancelRegistration = useCallback((registrationId: string) => {
    setStats(prevStats => {
      const registration = prevStats.recentRegistrations.find(r => r.id === registrationId);
      if (!registration) return prevStats;

      return {
        ...prevStats,
        activeRegistrations: Math.max(0, prevStats.activeRegistrations - 1),
        cancelledRegistrations: prevStats.cancelledRegistrations + 1,
        totalRevenue: registration.payment_status === 'paid'
          ? Math.max(0, prevStats.totalRevenue - (registration.total_amount || 0))
          : prevStats.totalRevenue,
        pendingPayments: registration.payment_status === 'pending'
          ? Math.max(0, prevStats.pendingPayments - (registration.total_amount || 0))
          : prevStats.pendingPayments
      };
    });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    updateStats,
    addRegistration,
    cancelRegistration,
    refetch: fetchStats
  };
};// src/hooks/useRegistrationStats.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface RegistrationStats {
  totalRegistrations: number;
  activeRegistrations: number;
  pastRegistrations: number;
  cancelledRegistrations: number;
  totalRevenue: number;
  pendingPayments: number;
  recentRegistrations: any[];
  topEvents: Array<{
    eventId: string;
    eventTitle: string;
    registrationCount: number;
    revenue: number;
  }>;
}

export const useRegistrationStats = (eventId?: string) => {
  const [stats, setStats] = useState<RegistrationStats>({
    totalRegistrations: 0,
    activeRegistrations: 0,
    pastRegistrations: 0,
    cancelledRegistrations: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    recentRegistrations: [],
    topEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('user_event_registrations')
        .select(`
          *,
          event:events(
            id,
            title,
            start_at,
            end_at,
            status
          )
        `);

      // Если указан eventId, фильтруем по нему
      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data: registrations, error: fetchError } = await query
        .order('registration_date', { ascending: false });

      if (fetchError) throw fetchError;

      const now = new Date();
      
      // Подсчитываем статистику
      const totalRegistrations = registrations?.length || 0;
      
      const activeRegistrations = registrations?.filter(reg => 
        reg.status === 'active' && 
        (!reg.event?.start_at || new Date(reg.event.start_at) >= now)
      ).length || 0;
      
      const pastRegistrations = registrations?.filter(reg => 
        reg.status === 'active' && 
        reg.event?.start_at && 
        new Date(reg.event.start_at) < now
      ).length || 0;
      
      const cancelledRegistrations = registrations?.filter(reg => 
        reg.status === 'cancelled'
      ).length || 0;
      
      const totalRevenue = registrations?.reduce((sum, reg) => 
        reg.payment_status === 'paid' ? sum + (reg.total_amount || 0) : sum, 0
      ) || 0;
      
      const pendingPayments = registrations?.reduce((sum, reg) => 
        reg.payment_status === 'pending' ? sum + (reg.total_amount || 0) : sum, 0
      ) || 0;

      // Последние регистрации (только если не фильтруем по событию)
      const recentRegistrations = !eventId 
        ? registrations?.slice(0, 10) || []
        : [];

      // Топ событий по регистрациям (только если не фильтруем по событию)
      const topEvents = !eventId ? getTopEvents(registrations || []) : [];

      setStats({
        totalRegistrations,
        activeRegistrations,
        pastRegistrations,
        cancelledRegistrations,
        totalRevenue,
        pendingPayments,
        recentRegistrations,
        topEvents
      });

    } catch (err) {
      console.error('Error fetching registration stats:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const getTopEvents = (registrations: any[]) => {
    const eventMap = new Map<string, {
      eventId: string;
      eventTitle: string;
      registrationCount: number;
      revenue: number;
    }>();

    registrations.forEach(reg => {
      if (!reg.event?.id) return;
      
      const eventId = reg.event.id;
      const eventTitle = reg.event.title || 'Без названия';
      const revenue = reg.payment_status === 'paid' ? (reg.total_amount || 0) : 0;

      if (eventMap.has(eventId)) {
        const existing = eventMap.get(eventId)!;
        existing.registrationCount += 1;
        existing.revenue += revenue;
      } else {
        eventMap.set(eventId, {
          eventId,
          eventTitle,
          registrationCount: 1,
          revenue
        });
      }
    });

    return Array.from(eventMap.values())
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, 5);
  };

  // Функция для обновления статистики после изменений
  const updateStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  // Функция для добавления новой регистрации в статистику
  const addRegistration = useCallback((registration: any) => {
    setStats(prevStats => ({
      ...prevStats,
      totalRegistrations: prevStats.totalRegistrations + 1,
      activeRegistrations: prevStats.activeRegistrations + 1,
      totalRevenue: registration.payment_status === 'paid' 
        ? prevStats.totalRevenue + (registration.total_amount || 0)
        : prevStats.totalRevenue,
      pendingPayments: registration.payment_status === 'pending'
        ? prevStats.pendingPayments + (registration.total_amount || 0)
        : prevStats.pendingPayments,
      recentRegistrations: [registration, ...prevStats.recentRegistrations.slice(0, 9)]
    }));
  }, []);

  // Функция для отмены регистрации
  const cancelRegistration = useCallback((registrationId: string) => {
    setStats(prevStats => {
      const registration = prevStats.recentRegistrations.find(r => r.id === registrationId);
      if (!registration) return prevStats;

      return {
        ...prevStats,
        activeRegistrations: Math.max(0, prevStats.activeRegistrations - 1),
        cancelledRegistrations: prevStats.cancelledRegistrations + 1,
        totalRevenue: registration.payment_status === 'paid'
          ? Math.max(0, prevStats.totalRevenue - (registration.total_amount || 0))
          : prevStats.totalRevenue,
        pendingPayments: registration.payment_status === 'pending'
          ? Math.max(0, prevStats.pendingPayments - (registration.total_amount || 0))
          : prevStats.pendingPayments
      };
    });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    updateStats,
    addRegistration,
    cancelRegistration,
    refetch: fetchStats
  };
};