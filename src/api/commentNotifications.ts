// src/api/commentNotifications.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { supabase } from '../lib/supabase';

export interface CommentNotification {
  id: string;
  recipient_user_id: string;
  sender_user_id: string;
  comment_id: string;
  event_id: string;
  notification_type: 'reply' | 'mention';
  is_read: boolean;
  created_at: string;
  // Расширенные поля из join'ов
  sender_name?: string;
  sender_avatar?: string;
  comment_content?: string;
  event_title?: string;
  event_id_for_link?: string; // Изменено с event_slug
}

export interface NotificationFilters {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
  notification_type?: 'reply' | 'mention';
}

// Получение уведомлений пользователя
export const getUserNotifications = async (
  userId: string,
  filters: NotificationFilters = {}
): Promise<{ data: CommentNotification[]; error: string | null; total?: number }> => {
  try {
    const {
      limit = 20,
      offset = 0,
      unread_only = false,
      notification_type
    } = filters;

    let query = supabase
      .from('comment_notifications')
      .select(`
        *,
        sender:sender_user_id (
          name,
          avatar
        ),
        comment:comment_id (
          content
        ),
        event:event_id (
          id,
          title
        )
      `)
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unread_only) {
      query = query.eq('is_read', false);
    }

    if (notification_type) {
      query = query.eq('notification_type', notification_type);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return { data: [], error: error.message };
    }

    // Преобразуем данные для удобства использования
    const transformedData: CommentNotification[] = data?.map(notification => ({
      ...notification,
      sender_name: notification.sender?.name,
      sender_avatar: notification.sender?.avatar,
      comment_content: notification.comment?.content,
      event_title: notification.event?.title,
      event_id_for_link: notification.event?.id // Используем ID вместо slug
    })) || [];

    return { 
      data: transformedData, 
      error: null,
      total: count || undefined
    };
  } catch (error: any) {
    console.error('Error in getUserNotifications:', error);
    return { data: [], error: error.message };
  }
};

// Получение количества непрочитанных уведомлений
export const getUnreadNotificationsCount = async (
  userId: string
): Promise<{ count: number; error: string | null }> => {
  try {
    const { count, error } = await supabase
      .from('comment_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (error: any) {
    console.error('Error in getUnreadNotificationsCount:', error);
    return { count: 0, error: error.message };
  }
};

// Отметка уведомления как прочитанного
export const markNotificationAsRead = async (
  notificationId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Требуется авторизация' };
    }

    const { error } = await supabase
      .from('comment_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('recipient_user_id', user.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in markNotificationAsRead:', error);
    return { success: false, error: error.message };
  }
};

// Отметка всех уведомлений как прочитанных
export const markAllNotificationsAsRead = async (
  userId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== userId) {
      return { success: false, error: 'Недостаточно прав' };
    }

    const { error } = await supabase
      .from('comment_notifications')
      .update({ is_read: true })
      .eq('recipient_user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return { success: false, error: error.message };
  }
};

// Удаление уведомления
export const deleteNotification = async (
  notificationId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Требуется авторизация' };
    }

    const { error } = await supabase
      .from('comment_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_user_id', user.id);

    if (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in deleteNotification:', error);
    return { success: false, error: error.message };
  }
};

// Подписка на новые уведомления в реальном времени
let activeSubscription: any = null;

export const subscribeToNotifications = (
  userId: string,
  onNewNotification: (notification: CommentNotification) => void,
  onError?: (error: any) => void
) => {
  try {
    // Отписываемся от предыдущей подписки если есть
    if (activeSubscription) {
      supabase.removeChannel(activeSubscription);
      activeSubscription = null;
    }

    console.log('Subscribing to notifications for user:', userId);

    const channelName = `notifications_${userId}_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comment_notifications',
          filter: `recipient_user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('New notification received:', payload);
          
          try {
            // Получаем полные данные уведомления с join'ами
            const { data, error } = await supabase
              .from('comment_notifications')
              .select(`
                *,
                sender:sender_user_id (
                  name,
                  avatar
                ),
                comment:comment_id (
                  content
                ),
                event:event_id (
                  id,
                  title
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching notification details:', error);
              onError?.(error);
              return;
            }

            const transformedNotification: CommentNotification = {
              ...data,
              sender_name: data.sender?.name,
              sender_avatar: data.sender?.avatar,
              comment_content: data.comment?.content,
              event_title: data.event?.title,
              event_id_for_link: data.event?.id
            };

            onNewNotification(transformedNotification);
          } catch (error) {
            console.error('Error processing notification:', error);
            onError?.(error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
        if (status === 'SUBSCRIPTION_ERROR') {
          onError?.(new Error('Subscription error'));
        }
      });

    activeSubscription = subscription;
    return subscription;
  } catch (error) {
    console.error('Error setting up notification subscription:', error);
    onError?.(error);
    return null;
  }
};

// Отписка от уведомлений
export const unsubscribeFromNotifications = (subscription?: any) => {
  try {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
    if (activeSubscription) {
      supabase.removeChannel(activeSubscription);
      activeSubscription = null;
    }
    console.log('Unsubscribed from notifications');
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
  }
};

// Получение последних уведомлений для отображения в выпадающем меню
export const getRecentNotifications = async (
  userId: string,
  limit: number = 5
): Promise<{ data: CommentNotification[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('comment_notifications')
      .select(`
        *,
        sender:sender_user_id (
          name,
          avatar
        ),
        comment:comment_id (
          content
        ),
        event:event_id (
          id,
          title
        )
      `)
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent notifications:', error);
      return { data: [], error: error.message };
    }

    const transformedData: CommentNotification[] = data?.map(notification => ({
      ...notification,
      sender_name: notification.sender?.name,
      sender_avatar: notification.sender?.avatar,
      comment_content: notification.comment?.content,
      event_title: notification.event?.title,
      event_id_for_link: notification.event?.id
    })) || [];

    return { data: transformedData, error: null };
  } catch (error: any) {
    console.error('Error in getRecentNotifications:', error);
    return { data: [], error: error.message };
  }
};

// Проверка, есть ли новые уведомления с определенного времени
export const hasNewNotificationsSince = async (
  userId: string,
  since: string
): Promise<{ hasNew: boolean; error: string | null }> => {
  try {
    const { count, error } = await supabase
      .from('comment_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_user_id', userId)
      .eq('is_read', false)
      .gt('created_at', since);

    if (error) {
      console.error('Error checking new notifications:', error);
      return { hasNew: false, error: error.message };
    }

    return { hasNew: (count || 0) > 0, error: null };
  } catch (error: any) {
    console.error('Error in hasNewNotificationsSince:', error);
    return { hasNew: false, error: error.message };
  }
};