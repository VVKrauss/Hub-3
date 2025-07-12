// src/hooks/useCommentNotifications.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  CommentNotification,
  NotificationFilters,
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  getRecentNotifications
} from '../api/commentNotifications';

interface NotificationsState {
  notifications: CommentNotification[];
  loading: boolean;
  unreadCount: number;
  error: string | null;
  total: number;
  hasMore: boolean;
  currentPage: number;
  lastCheck: string | null;
}

interface UseCommentNotificationsOptions {
  autoLoad?: boolean;
  pageSize?: number;
  enableRealTime?: boolean;
  onNewNotification?: (notification: CommentNotification) => void;
  showToastOnNew?: boolean;
}

interface UseCommentNotificationsReturn extends NotificationsState {
  // Основные действия
  loadNotifications: (reset?: boolean) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotificationById: (notificationId: string) => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  
  // Получение данных
  getRecentNotificationsList: (limit?: number) => Promise<CommentNotification[]>;
  
  // Состояние загрузки
  isMarkingAsRead: boolean;
  isMarkingAllAsRead: boolean;
  isDeletingNotification: { [id: string]: boolean };
}

export const useCommentNotifications = (
  options: UseCommentNotificationsOptions = {}
): UseCommentNotificationsReturn => {
  const {
    autoLoad = true,
    pageSize = 20,
    enableRealTime = true,
    onNewNotification,
    showToastOnNew = true
  } = options;

  const { user } = useAuth();
  const isMountedRef = useRef(true);
  const subscriptionRef = useRef<any>(null);

  // Состояние
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    loading: false,
    unreadCount: 0,
    error: null,
    total: 0,
    hasMore: true,
    currentPage: 0,
    lastCheck: null
  });

  // Дополнительные состояния загрузки
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const [isDeletingNotification, setIsDeletingNotification] = useState<{ [id: string]: boolean }>({});

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (subscriptionRef.current) {
        unsubscribeFromNotifications(subscriptionRef.current);
      }
    };
  }, []);

  // Подписка на real-time обновления
  useEffect(() => {
    if (!user?.id || !enableRealTime) return;

    const handleNewNotification = (notification: CommentNotification) => {
      if (!isMountedRef.current) return;

      console.log('New notification received:', notification);

      // Обновляем состояние
      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications],
        unreadCount: prev.unreadCount + 1,
        total: prev.total + 1
      }));

      // Показываем toast уведомление
      if (showToastOnNew) {
        const message = notification.notification_type === 'reply' 
          ? `${notification.sender_name} ответил на ваш комментарий`
          : `${notification.sender_name} процитировал ваш комментарий`;
        
        toast.success(message, {
          duration: 5000,
          icon: '💬'
        });
      }

      // Вызываем колбек
      onNewNotification?.(notification);
    };

    const handleError = (error: any) => {
      console.error('Notification subscription error:', error);
    };

    subscriptionRef.current = subscribeToNotifications(
      user.id,
      handleNewNotification,
      handleError
    );

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromNotifications(subscriptionRef.current);
      }
    };
  }, [user?.id, enableRealTime, showToastOnNew, onNewNotification]);

  // Автозагрузка при монтировании
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadNotifications(true);
      refreshUnreadCount();
    }
  }, [user?.id, autoLoad]);

  // Загрузка уведомлений
  const loadNotifications = useCallback(async (reset: boolean = false) => {
    if (!user?.id) return;

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(reset && { 
          notifications: [], 
          currentPage: 0, 
          hasMore: true,
          lastCheck: new Date().toISOString()
        })
      }));

      const page = reset ? 0 : state.currentPage;
      const filters: NotificationFilters = {
        limit: pageSize,
        offset: page * pageSize
      };

      const { data, error, total } = await getUserNotifications(user.id, filters);

      if (!isMountedRef.current) return;

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error
        }));
        toast.error(`Ошибка загрузки уведомлений: ${error}`);
        return;
      }

      setState(prev => ({
        ...prev,
        notifications: reset ? data : [...prev.notifications, ...data],
        loading: false,
        error: null,
        total: total || 0,
        hasMore: data.length === pageSize,
        currentPage: page + 1,
        lastCheck: reset ? new Date().toISOString() : prev.lastCheck
      }));

    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error loading notifications:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      toast.error('Ошибка при загрузке уведомлений');
    }
  }, [user?.id, pageSize, state.currentPage]);

  // Загрузка следующей страницы
  const loadMoreNotifications = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    await loadNotifications(false);
  }, [loadNotifications, state.loading, state.hasMore]);

  // Обновление счетчика непрочитанных
  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await getUnreadNotificationsCount(user.id);
      
      if (!isMountedRef.current) return;

      if (error) {
        console.error('Error getting unread count:', error);
        return;
      }

      setState(prev => ({
        ...prev,
        unreadCount: count
      }));
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  }, [user?.id]);

  // Отметка уведомления как прочитанного
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      setIsMarkingAsRead(true);

      const { success, error } = await markNotificationAsRead(notificationId);

      if (!isMountedRef.current) return false;

      setIsMarkingAsRead(false);

      if (error) {
        toast.error(`Ошибка: ${error}`);
        return false;
      }

      if (success) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }));
      }

      return success;
    } catch (error: any) {
      if (!isMountedRef.current) return false;
      
      console.error('Error marking notification as read:', error);
      setIsMarkingAsRead(false);
      toast.error('Ошибка при отметке уведомления');
      return false;
    }
  }, []);

  // Отметка всех уведомлений как прочитанных
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      setIsMarkingAllAsRead(true);

      const { success, error } = await markAllNotificationsAsRead(user.id);

      if (!isMountedRef.current) return false;

      setIsMarkingAllAsRead(false);

      if (error) {
        toast.error(`Ошибка: ${error}`);
        return false;
      }

      if (success) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(notification => ({
            ...notification,
            is_read: true
          })),
          unreadCount: 0
        }));
        toast.success('Все уведомления отмечены как прочитанные');
      }

      return success;
    } catch (error: any) {
      if (!isMountedRef.current) return false;
      
      console.error('Error marking all notifications as read:', error);
      setIsMarkingAllAsRead(false);
      toast.error('Ошибка при отметке уведомлений');
      return false;
    }
  }, [user?.id]);

  // Удаление уведомления
  const deleteNotificationById = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      setIsDeletingNotification(prev => ({ ...prev, [notificationId]: true }));

      const { success, error } = await deleteNotification(notificationId);

      if (!isMountedRef.current) return false;

      setIsDeletingNotification(prev => ({ ...prev, [notificationId]: false }));

      if (error) {
        toast.error(`Ошибка: ${error}`);
        return false;
      }

      if (success) {
        setState(prev => {
          const deletedNotification = prev.notifications.find(n => n.id === notificationId);
          const wasUnread = deletedNotification && !deletedNotification.is_read;
          
          return {
            ...prev,
            notifications: prev.notifications.filter(n => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
            total: Math.max(0, prev.total - 1)
          };
        });
        toast.success('Уведомление удалено');
      }

      return success;
    } catch (error: any) {
      if (!isMountedRef.current) return false;
      
      console.error('Error deleting notification:', error);
      setIsDeletingNotification(prev => ({ ...prev, [notificationId]: false }));
      toast.error('Ошибка при удалении уведомления');
      return false;
    }
  }, []);

  // Обновление списка уведомлений
  const refreshNotifications = useCallback(async () => {
    await loadNotifications(true);
    await refreshUnreadCount();
  }, [loadNotifications, refreshUnreadCount]);

  // Получение последних уведомлений для dropdown
  const getRecentNotificationsList = useCallback(async (limit: number = 5): Promise<CommentNotification[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await getRecentNotifications(user.id, limit);
      
      if (error) {
        console.error('Error getting recent notifications:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error in getRecentNotificationsList:', error);
      return [];
    }
  }, [user?.id]);

  return {
    // Состояние
    ...state,
    
    // Основные действия
    loadNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotificationById,
    refreshNotifications,
    refreshUnreadCount,
    
    // Получение данных
    getRecentNotificationsList,
    
    // Состояния загрузки
    isMarkingAsRead,
    isMarkingAllAsRead,
    isDeletingNotification
  };
};