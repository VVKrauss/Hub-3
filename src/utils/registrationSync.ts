// src/utils/registrationSync.ts

import { supabase } from '../lib/supabase';

type RegistrationData = {
  id: string;
  full_name: string;
  email: string;
  adult_tickets: number;
  child_tickets: number;
  total_amount: number;
  status: boolean;
  qr_code?: string;
  created_at: string;
};

/**
 * Синхронизирует регистрацию пользователя с таблицей user_event_registrations
 */
export const syncUserRegistration = async (
  userId: string,
  eventId: string,
  registration: RegistrationData,
  paymentStatus: 'pending' | 'paid' | 'free' = 'pending'
): Promise<void> => {
  try {
    const { error } = await supabase.rpc('sync_user_registration', {
      p_user_id: userId,
      p_event_id: eventId,
      p_registration_id: registration.id,
      p_full_name: registration.full_name,
      p_email: registration.email,
      p_adult_tickets: registration.adult_tickets,
      p_child_tickets: registration.child_tickets,
      p_total_amount: registration.total_amount,
      p_status: registration.status ? 'active' : 'cancelled',
      p_payment_status: paymentStatus,
      p_qr_code: registration.qr_code || registration.id,
      p_created_at: registration.created_at
    });

    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

/**
 * Находит пользователя по email
 */
const findUserByEmail = async (email: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (error) throw error;
    
    return data?.[0]?.id || null;
  } catch (error) {
    return null;
  }
};

/**
 * Альтернативный поиск пользователя по email через auth.users
 */
const findUserByEmailAlternative = async (email: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    
    const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
    return user?.id || null;
  } catch (error) {
    return null;
  }
};

/**
 * Синхронизирует все регистрации события с пользователями
 */
const syncEventRegistrations = async (eventId: string): Promise<void> => {
  try {
    // Получаем данные события
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('title, registrations, registrations_list')
      .eq('id', eventId)
      .single();

    if (eventError) {
      throw eventError;
    }

    // Получаем список регистраций
    let registrations: RegistrationData[] = [];
    
    if (eventData.registrations?.reg_list) {
      registrations = eventData.registrations.reg_list;
    } else if (eventData.registrations_list) {
      registrations = eventData.registrations_list;
    }

    let syncedCount = 0;
    let notFoundCount = 0;

    // Синхронизируем каждую регистрацию
    for (const registration of registrations) {
      try {
        const userId = await findUserByEmail(registration.email);
        
        if (userId) {
          await syncUserRegistration(userId, eventId, registration);
          syncedCount++;
        } else {
          notFoundCount++;
        }
      } catch (error) {
        // Продолжаем обработку других регистраций
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Функция для ручной синхронизации всех событий (для миграции данных)
 */
const syncAllRegistrations = async (): Promise<void> => {
  try {
    // Получаем все события с регистрациями
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, registrations, registrations_list')
      .or('registrations.is.not.null,registrations_list.is.not.null');

    if (error) {
      throw error;
    }

    let totalSynced = 0;
    let totalErrors = 0;

    for (const event of events || []) {
      try {
        await syncEventRegistrations(event.id);
        totalSynced++;
      } catch (error) {
        totalErrors++;
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Функция для синхронизации конкретной регистрации по email и событию
 */
const syncRegistrationByEmail = async (
  email: string,
  eventId: string,
  registrationId: string
): Promise<boolean> => {
  try {
    const userId = await findUserByEmail(email);
    
    if (!userId) {
      return false;
    }

    // Получаем регистрацию из события
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('registrations, registrations_list')
      .eq('id', eventId)
      .single();

    if (eventError) {
      throw eventError;
    }

    let registrations: RegistrationData[] = [];
    
    if (eventData.registrations?.reg_list) {
      registrations = eventData.registrations.reg_list;
    } else if (eventData.registrations_list) {
      registrations = eventData.registrations_list;
    }

    const registration = registrations.find(reg => reg.id === registrationId);
    
    if (!registration) {
      return false;
    }

    await syncUserRegistration(userId, eventId, registration);
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Удаляет регистрацию пользователя
 */
const removeUserRegistration = async (
  userId: string,
  eventId: string,
  registrationId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_event_registrations')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('registration_id', registrationId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

export {
  syncEventRegistrations,
  syncAllRegistrations,
  syncRegistrationByEmail,
  removeUserRegistration,
  findUserByEmail,
  findUserByEmailAlternative
};