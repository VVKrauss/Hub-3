// src/utils/userManagement.ts - Утилиты для работы с пользователями

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export type UserRole = 'Admin' | 'Editor' | 'Guest';

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  banned_until?: string;
  avatar?: string;
  additional_info?: any;
};

export type UserRegistration = {
  id: string;
  event_id: string;
  event_title?: string;
  status: 'active' | 'cancelled' | 'completed';
  registration_date: string;
  payment_status: 'pending' | 'paid' | 'failed';
  qr_code?: string;
  additional_data?: any;
};

export type UserWithRegistrations = UserProfile & {
  registrations: UserRegistration[];
};

export type UserStatistics = {
  total_users: number;
  admins: number;
  editors: number;
  guests: number;
  active_users: number;
  banned_users: number;
  unconfirmed_users: number;
  registrations_today: number;
  active_registrations: number;
};

/**
 * Получить всех пользователей с их регистрациями
 */
export const fetchAllUsers = async (): Promise<UserWithRegistrations[]> => {
  try {
    // Получаем пользователей из profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    if (!profiles) return [];

    // Получаем регистрации для каждого пользователя
    const usersWithRegistrations = await Promise.all(
      profiles.map(async (profile) => {
        const { data: registrations, error: regError } = await supabase
          .from('user_registrations')
          .select(`
            id,
            event_id,
            status,
            registration_date,
            payment_status,
            qr_code,
            additional_data,
            events:event_id (
              title
            )
          `)
          .eq('user_id', profile.id)
          .order('registration_date', { ascending: false });

        const userRegistrations: UserRegistration[] = registrations?.map(reg => ({
          id: reg.id,
          event_id: reg.event_id,
          event_title: (reg.events as any)?.title || 'Неизвестное событие',
          status: reg.status,
          registration_date: reg.registration_date,
          payment_status: reg.payment_status,
          qr_code: reg.qr_code,
          additional_data: reg.additional_data
        })) || [];

        return {
          ...profile,
          registrations: userRegistrations
        };
      })
    );

    return usersWithRegistrations;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Получить статистику пользователей
 */
export const fetchUserStatistics = async (): Promise<UserStatistics> => {
  try {
    const { data, error } = await supabase.rpc('get_user_statistics');
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    // Возвращаем заглушку в случае ошибки
    return {
      total_users: 0,
      admins: 0,
      editors: 0,
      guests: 0,
      active_users: 0,
      banned_users: 0,
      unconfirmed_users: 0,
      registrations_today: 0,
      active_registrations: 0
    };
  }
};

/**
 * Обновить роль пользователя
 */
export const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('update_user_role', {
      target_user_id: userId,
      new_role: newRole
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * Заблокировать пользователя
 */
export const banUser = async (userId: string, durationDays: number = 7): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('ban_user', {
      target_user_id: userId,
      ban_duration_days: durationDays
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error banning user:', error);
    throw error;
  }
};

/**
 * Разблокировать пользователя
 */
export const unbanUser = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('unban_user', {
      target_user_id: userId
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error unbanning user:', error);
    throw error;
  }
};

/**
 * Удалить пользователя
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    // Сначала удаляем профиль (каскадно удалятся регистрации)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    // Пытаемся удалить из auth (может не сработать без service role)
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (authError) {
      console.warn('Could not delete from auth (requires service role):', authError);
    }

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Создать регистрацию пользователя на событие
 */
export const createUserRegistration = async (
  userId: string, 
  eventId: string, 
  additionalData?: any
): Promise<UserRegistration> => {
  try {
    const { data, error } = await supabase
      .from('user_registrations')
      .insert({
        user_id: userId,
        event_id: eventId,
        status: 'active',
        payment_status: 'pending',
        qr_code: generateQRCode(),
        additional_data: additionalData || {}
      })
      .select(`
        id,
        event_id,
        status,
        registration_date,
        payment_status,
        qr_code,
        additional_data,
        events:event_id (
          title
        )
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      event_id: data.event_id,
      event_title: (data.events as any)?.title || 'Неизвестное событие',
      status: data.status,
      registration_date: data.registration_date,
      payment_status: data.payment_status,
      qr_code: data.qr_code,
      additional_data: data.additional_data
    };
  } catch (error) {
    console.error('Error creating user registration:', error);
    throw error;
  }
};

/**
 * Обновить статус регистрации
 */
export const updateRegistrationStatus = async (
  registrationId: string,
  status: 'active' | 'cancelled' | 'completed',
  paymentStatus?: 'pending' | 'paid' | 'failed'
): Promise<boolean> => {
  try {
    const updateData: any = { status };
    if (paymentStatus) {
      updateData.payment_status = paymentStatus;
    }

    const { error } = await supabase
      .from('user_registrations')
      .update(updateData)
      .eq('id', registrationId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating registration status:', error);
    throw error;
  }
};

/**
 * Получить регистрации пользователя
 */
export const fetchUserRegistrations = async (userId: string): Promise<UserRegistration[]> => {
  try {
    const { data, error } = await supabase
      .from('user_registrations')
      .select(`
        id,
        event_id,
        status,
        registration_date,
        payment_status,
        qr_code,
        additional_data,
        events:event_id (
          title
        )
      `)
      .eq('user_id', userId)
      .order('registration_date', { ascending: false });

    if (error) throw error;

    return data?.map(reg => ({
      id: reg.id,
      event_id: reg.event_id,
      event_title: (reg.events as any)?.title || 'Неизвестное событие',
      status: reg.status,
      registration_date: reg.registration_date,
      payment_status: reg.payment_status,
      qr_code: reg.qr_code,
      additional_data: reg.additional_data
    })) || [];
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    throw error;
  }
};

/**
 * Поиск пользователей
 */
export const searchUsers = async (query: string, role?: UserRole): Promise<UserProfile[]> => {
  try {
    let queryBuilder = supabase
      .from('profiles')
      .select('*');

    // Поиск по имени или email
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    // Фильтр по роли
    if (role) {
      queryBuilder = queryBuilder.eq('role', role);
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Генерация QR кода для регистрации
 */
const generateQRCode = (): string => {
  return `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Проверка прав доступа пользователя
 */
export const checkUserPermissions = async (requiredRole: UserRole = 'Admin'): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return false;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (error) throw error;

    const roleHierarchy = { 'Guest': 0, 'Editor': 1, 'Admin': 2 };
    const userLevel = roleHierarchy[profile.role as UserRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 2;

    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return false;
  }
};

/**
 * Экспорт пользователей в CSV
 */
export const exportUsersToCSV = async (users: UserWithRegistrations[]): Promise<string> => {
  const headers = [
    'ID',
    'Имя',
    'Email',
    'Роль',
    'Дата регистрации',
    'Последний вход',
    'Email подтвержден',
    'Статус',
    'Количество регистраций',
    'Активные регистрации'
  ];

  const rows = users.map(user => [
    user.id,
    user.name,
    user.email || '',
    user.role,
    new Date(user.created_at).toLocaleDateString('ru-RU'),
    user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ru-RU') : '',
    user.email_confirmed_at ? 'Да' : 'Нет',
    user.banned_until && new Date(user.banned_until) > new Date() ? 'Заблокирован' : 'Активен',
    user.registrations.length,
    user.registrations.filter(r => r.status === 'active').length
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

/**
 * Форматирование даты для отображения
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Получение цвета для роли
 */
export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case 'Admin':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    case 'Editor':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'Guest':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
};

/**
 * Получение локализованного названия роли
 */
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'Admin':
      return 'Администратор';
    case 'Editor':
      return 'Редактор';
    case 'Guest':
      return 'Гость';
    default:
      return 'Неизвестно';
  }
};