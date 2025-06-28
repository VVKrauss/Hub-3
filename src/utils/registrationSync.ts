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
      p_qr_code: registration.qr_code,
      p_payment_status: paymentStatus,
      p_registration_date: registration.created_at
    });

    if (error) {
      console.error('Error syncing user registration:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to sync user registration:', error);
    throw error;
  }
};

/**
 * Находит пользователя по email из таблицы profiles
 */
export const findUserByEmail = async (email: string): Promise<string | null> => {
  try {
    // Пытаемся найти пользователя в таблице profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email.toLowerCase().trim())
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching from profiles:', profileError);
    }

    if (profileData) {
      return profileData.id;
    }

    // Если не найден в profiles, пытаемся найти по auth.users через service role
    // Это требует дополнительных прав, поэтому может не работать в обычном режиме
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        return null;
      }

      const authUser = authUsers.users.find(user => 
        user.email?.toLowerCase().trim() === email.toLowerCase().trim()
      );
      
      if (authUser) {
        return authUser.id;
      }
    } catch (error) {
      console.error('Admin API not available:', error);
    }

    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

/**
 * Альтернативный способ поиска пользователя через email в auth metadata
 */
export const findUserByEmailAlternative = async (email: string): Promise<string | null> => {
  try {
    // Ищем в таблице profiles где email может быть сохранен отдельно
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .textSearch('name', email, { type: 'websearch' })
      .limit(1);

    if (error) {
      console.error('Error in alternative search:', error);
      return null;
    }

    return data?.[0]?.id || null;
  } catch (error) {
    console.error('Error in alternative user search:', error);
    return null;
  }
};

/**
 * Синхронизирует все регистрации события с пользователями
 */
export const syncEventRegistrations = async (eventId: string): Promise<void> => {
  try {
    // Получаем данные события
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('title, registrations, registrations_list')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      return;
    }

    // Получаем список регистраций
    let registrations: RegistrationData[] = [];
    
    if (eventData.registrations?.reg_list) {
      registrations = eventData.registrations.reg_list;
    } else if (eventData.registrations_list) {
      registrations = eventData.registrations_list;
    }

    console.log(`Processing ${registrations.length} registrations for event: ${eventData.title}`);

    let syncedCount = 0;
    let notFoundCount = 0;

    // Синхронизируем каждую регистрацию
    for (const registration of registrations) {
      try {
        const userId = await findUserByEmail(registration.email);
        
        if (userId) {
          await syncUserRegistration(userId, eventId, registration);
          syncedCount++;
          console.log(`✓ Synced registration ${registration.id} for user ${userId}`);
        } else {
          notFoundCount++;
          console.log(`⚠ User not found for email: ${registration.email}`);
        }
      } catch (error) {
        console.error(`Failed to sync registration ${registration.id}:`, error);
      }
    }

    console.log(`Event ${eventId} sync completed: ${syncedCount} synced, ${notFoundCount} not found`);
  } catch (error) {
    console.error('Error syncing event registrations:', error);
    throw error;
  }
};

/**
 * Функция для ручной синхронизации всех событий (для миграции данных)
 */
export const syncAllRegistrations = async (): Promise<void> => {
  try {
    console.log('Starting full registration sync...');
    
    // Получаем все события с регистрациями
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, registrations, registrations_list')
      .or('registrations.is.not.null,registrations_list.is.not.null');

    if (error) {
      console.error('Error fetching events:', error);
      return;
    }

    console.log(`Found ${events?.length || 0} events with registrations`);

    let totalSynced = 0;
    let totalErrors = 0;

    for (const event of events || []) {
      try {
        console.log(`\n--- Processing event: ${event.title} ---`);
        await syncEventRegistrations(event.id);
        totalSynced++;
      } catch (error) {
        console.error(`❌ Failed to sync event ${event.id}: ${event.title}`, error);
        totalErrors++;
      }
    }

    console.log(`\n=== Sync Summary ===`);
    console.log(`Events processed: ${totalSynced}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Total events: ${events?.length || 0}`);
  } catch (error) {
    console.error('Fatal error in syncAllRegistrations:', error);
    throw error;
  }
};

/**
 * Функция для синхронизации конкретной регистрации по email и событию
 */
export const syncRegistrationByEmail = async (
  email: string,
  eventId: string,
  registrationId: string
): Promise<boolean> => {
  try {
    const userId = await findUserByEmail(email);
    
    if (!userId) {
      console.log(`User not found for email: ${email}`);
      return false;
    }

    // Получаем регистрацию из события
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('registrations, registrations_list')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      return false;
    }

    let registrations: RegistrationData[] = [];
    
    if (eventData.registrations?.reg_list) {
      registrations = eventData.registrations.reg_list;
    } else if (eventData.registrations_list) {
      registrations = eventData.registrations_list;
    }

    const registration = registrations.find(reg => reg.id === registrationId);
    
    if (!registration) {
      console.log(`Registration ${registrationId} not found in event ${eventId}`);
      return false;
    }

    await syncUserRegistration(userId, eventId, registration);
    console.log(`Successfully synced registration ${registrationId} for user ${userId}`);
    
    return true;
  } catch (error) {
    console.error('Error syncing registration by email:', error);
    return false;
  }
};

/**
 * Удаляет регистрацию пользователя
 */
export const removeUserRegistration = async (
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
      console.error('Error removing user registration:', error);
      throw error;
    }

    console.log(`Removed registration ${registrationId} for user ${userId}`);
  } catch (error) {
    console.error('Failed to remove user registration:', error);
    throw error;
  }
};