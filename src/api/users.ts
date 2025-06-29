// src/api/users.ts
// API для работы с новой системой пользователей (sh_users)

import { supabase, createApiResponse, createPaginatedResponse, type ApiResponse, type PaginatedResponse } from '../lib/supabase';
import type { 
  ShUser, 
  ShUserSession,
  ShUserConnection,
  UserFilters,
  ShUserRole,
  ShUserStatus
} from '../types/database';

// Получение списка пользователей с фильтрацией и пагинацией
export const getUsers = async (
  filters: UserFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<ShUser>> => {
  try {
    let query = supabase
      .from('sh_users')
      .select('*', { count: 'exact' });

    // Применяем фильтры
    if (filters.role?.length) {
      query = query.in('role', filters.role);
    }
    
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }
    
    if (filters.registration_date_from) {
      query = query.gte('created_at', filters.registration_date_from);
    }
    
    if (filters.registration_date_to) {
      query = query.lte('created_at', filters.registration_date_to);
    }

    // Фильтруем неудаленных пользователей
    query = query.is('deleted_at', null);

    // Применяем пагинацию
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .range(from, to)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return createPaginatedResponse(
      data || [], 
      null, 
      page, 
      limit, 
      count || 0
    );
  } catch (error) {
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение конкретного пользователя по ID
export const getUser = async (userId: string): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .select('*')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение текущего пользователя
export const getCurrentUser = async (): Promise<ApiResponse<ShUser>> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) throw authError;
    if (!user) throw new Error('Пользователь не авторизован');

    const { data, error } = await supabase
      .from('sh_users')
      .select('*')
      .eq('id', user.id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание нового пользователя
export const createUser = async (
  userData: Omit<ShUser, 'id' | 'created_at' | 'updated_at' | 'qr_token'>
): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление пользователя
export const updateUser = async (
  userId: string,
  updates: Partial<Omit<ShUser, 'id' | 'created_at' | 'qr_token'>>
): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Мягкое удаление пользователя
export const deleteUser = async (userId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_users')
      .update({ 
        deleted_at: new Date().toISOString(),
        status: 'inactive'
      })
      .eq('id', userId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Восстановление удаленного пользователя
export const restoreUser = async (userId: string): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({ 
        deleted_at: null,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Изменение роли пользователя
export const updateUserRole = async (
  userId: string,
  role: ShUserRole
): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Изменение статуса пользователя
export const updateUserStatus = async (
  userId: string,
  status: ShUserStatus
): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Бан пользователя
export const banUser = async (
  userId: string,
  banUntil?: string,
  reason?: string
): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({ 
        status: 'banned',
        banned_until: banUntil || null,
        ban_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Разбан пользователя
export const unbanUser = async (userId: string): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({ 
        status: 'active',
        banned_until: null,
        ban_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение сессий пользователя
export const getUserSessions = async (
  userId: string,
  limit: number = 10
): Promise<ApiResponse<ShUserSession[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание новой сессии пользователя
export const createUserSession = async (
  sessionData: Omit<ShUserSession, 'id' | 'started_at' | 'last_activity_at'>
): Promise<ApiResponse<ShUserSession>> => {
  try {
    const { data, error } = await supabase
      .from('sh_user_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Завершение сессии пользователя
export const endUserSession = async (sessionId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_user_sessions')
      .update({ 
        ended_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', sessionId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Поиск пользователей
export const searchUsers = async (
  searchQuery: string,
  limit: number = 20
): Promise<ApiResponse<ShUser[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение статистики пользователей
export const getUsersStats = async (): Promise<ApiResponse<{
  total: number;
  active: number;
  inactive: number;
  banned: number;
  pending: number;
  admins: number;
  moderators: number;
  members: number;
  guests: number;
  new_this_month: number;
  online_sessions: number;
}>> => {
  try {
    const now = new Date().toISOString();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [
      { count: total },
      { count: active },
      { count: inactive },
      { count: banned },
      { count: pending },
      { count: admins },
      { count: moderators },
      { count: members },
      { count: guests },
      { count: newThisMonth },
      { count: onlineSessions }
    ] = await Promise.all([
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).eq('status', 'inactive').is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).eq('status', 'banned').is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).eq('role', 'admin').is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).eq('role', 'moderator').is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).eq('role', 'member').is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).eq('role', 'guest').is('deleted_at', null),
      supabase.from('sh_users').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth).is('deleted_at', null),
      supabase.from('sh_user_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    const stats = {
      total: total || 0,
      active: active || 0,
      inactive: inactive || 0,
      banned: banned || 0,
      pending: pending || 0,
      admins: admins || 0,
      moderators: moderators || 0,
      members: members || 0,
      guests: guests || 0,
      new_this_month: newThisMonth || 0,
      online_sessions: onlineSessions || 0
    };

    return createApiResponse(stats);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение пользователей по роли
export const getUsersByRole = async (
  role: ShUserRole,
  limit: number = 50
): Promise<ApiResponse<ShUser[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .select('*')
      .eq('role', role)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Проверка существования пользователя по email
export const checkUserExists = async (email: string): Promise<ApiResponse<boolean>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

    return createApiResponse(!!data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение пользователя по QR токену
export const getUserByQRToken = async (qrToken: string): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .select('*')
      .eq('qr_token', qrToken)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление последнего входа пользователя
export const updateLastSignIn = async (userId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_users')
      .update({ 
        last_sign_in_at: new Date().toISOString(),
        sign_in_count: supabase.sql`sign_in_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек уведомлений пользователя
export const updateUserNotificationSettings = async (
  userId: string,
  emailNotifications: boolean,
  pushNotifications: boolean
): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление дополнительной информации пользователя
export const updateUserAdditionalInfo = async (
  userId: string,
  additionalInfo: Record<string, any>
): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({
        additional_info: additionalInfo,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Подтверждение email пользователя
export const confirmUserEmail = async (userId: string): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({
        email_confirmed: true,
        email_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Подтверждение телефона пользователя
export const confirmUserPhone = async (userId: string): Promise<ApiResponse<ShUser>> => {
  try {
    const { data, error } = await supabase
      .from('sh_users')
      .update({
        phone_confirmed: true,
        phone_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение связей пользователя (подписки, друзья и т.д.)
export const getUserConnections = async (
  userId: string,
  connectionType?: string
): Promise<ApiResponse<ShUserConnection[]>> => {
  try {
    let query = supabase
      .from('sh_user_connections')
      .select(`
        *,
        connected_user:sh_users!sh_user_connections_connected_user_id_fkey (
          id,
          name,
          email,
          avatar_url,
          status
        )
      `)
      .eq('user_id', userId);

    if (connectionType) {
      query = query.eq('connection_type', connectionType);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание связи между пользователями
export const createUserConnection = async (
  userId: string,
  connectedUserId: string,
  connectionType: string = 'follow'
): Promise<ApiResponse<ShUserConnection>> => {
  try {
    const { data, error } = await supabase
      .from('sh_user_connections')
      .insert([{
        user_id: userId,
        connected_user_id: connectedUserId,
        connection_type: connectionType
      }])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Удаление связи между пользователями
export const deleteUserConnection = async (
  userId: string,
  connectedUserId: string,
  connectionType?: string
): Promise<ApiResponse<boolean>> => {
  try {
    let query = supabase
      .from('sh_user_connections')
      .delete()
      .eq('user_id', userId)
      .eq('connected_user_id', connectedUserId);

    if (connectionType) {
      query = query.eq('connection_type', connectionType);
    }

    const { error } = await query;

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};