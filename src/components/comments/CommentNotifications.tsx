// src/components/comments/CommentNotifications.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  BellOff, 
  MessageCircle, 
  Quote, 
  Reply,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCommentNotifications } from '../../hooks/useCommentNotifications';
import { CommentNotification } from '../../api/commentNotifications';
import { Skeleton } from '../ui/UnifiedLoading';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CommentNotificationsProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const CommentNotifications: React.FC<CommentNotificationsProps> = ({
  className = '',
  maxItems,
  showHeader = true,
  compact = false
}) => {
  const { user } = useAuth();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const {
    notifications,
    loading,
    unreadCount,
    error,
    total,
    hasMore,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotificationById,
    refreshNotifications,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isDeletingNotification
  } = useCommentNotifications({
    autoLoad: true,
    pageSize: maxItems || 20,
    enableRealTime: true,
    showToastOnNew: true
  });

  if (!user) {
    return null;
  }

  // Фильтрация уведомлений
  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const displayNotifications = maxItems 
    ? filteredNotifications.slice(0, maxItems)
    : filteredNotifications;

  // Обработчики
  const handleMarkAsRead = async (notificationId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteNotificationById(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Форматирование времени
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ru 
      });
    } catch {
      return 'недавно';
    }
  };

  // Получение ссылки на комментарий
  const getNotificationLink = (notification: CommentNotification) => {
    const eventLink = notification.event_slug 
      ? `/events/${notification.event_slug}`
      : `/events/${notification.event_id}`;
    return `${eventLink}#comment-${notification.comment_id}`;
  };

  return (
    <div className={`bg-white dark:bg-dark-800 ${compact ? '' : 'rounded-lg shadow-md'} ${className}`}>
      {/* Заголовок */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Уведомления
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {loading ? 'Загрузка...' : `${total} всего, ${unreadCount} новых`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Переключатель показа только непрочитанных */}
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`p-2 rounded-lg transition-colors ${
                  showUnreadOnly
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700'
                }`}
                title={showUnreadOnly ? 'Показать все' : 'Только новые'}
              >
                {showUnreadOnly ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </button>

              {/* Отметить все как прочитанные */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllAsRead}
                  className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  title="Отметить все как прочитанные"
                >
                  <CheckCheck className={`w-4 h-4 ${isMarkingAllAsRead ? 'animate-pulse' : ''}`} />
                </button>
              )}

              {/* Обновить */}
              <button
                onClick={refreshNotifications}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                title="Обновить"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Контент */}
      <div className={compact ? '' : 'max-h-96 overflow-y-auto'}>
        {/* Сообщение об ошибке */}
        {error && (
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Список уведомлений */}
        <div className="divide-y divide-gray-200 dark:divide-dark-700">
          {loading && notifications.length === 0 ? (
            // Скелетоны при первой загрузке
            <NotificationsSkeleton compact={compact} />
          ) : displayNotifications.length > 0 ? (
            // Список уведомлений
            <>
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  compact={compact}
                  formatTime={formatTime}
                  getNotificationLink={getNotificationLink}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  isMarkingAsRead={isMarkingAsRead}
                  isDeletingNotification={isDeletingNotification}
                />
              ))}

              {/* Кнопка "Загрузить еще" */}
              {!maxItems && hasMore && filteredNotifications.length > 0 && (
                <div className="p-4">
                  <button
                    onClick={loadMoreNotifications}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      'Загрузить еще'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : !loading ? (
            // Пустое состояние
            <EmptyNotificationsState showUnreadOnly={showUnreadOnly} compact={compact} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Компонент отдельного уведомления
interface NotificationItemProps {
  notification: CommentNotification;
  compact: boolean;
  formatTime: (date: string) => string;
  getNotificationLink: (notification: CommentNotification) => string;
  onMarkAsRead: (id: string, event?: React.MouseEvent) => void;
  onDelete: (id: string, event: React.MouseEvent) => void;
  isMarkingAsRead: boolean;
  isDeletingNotification: { [id: string]: boolean };
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  compact,
  formatTime,
  getNotificationLink,
  onMarkAsRead,
  onDelete,
  isMarkingAsRead,
  isDeletingNotification
}) => {
  const isDeleting = isDeletingNotification[notification.id];

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  const getNotificationIcon = () => {
    switch (notification.notification_type) {
      case 'reply':
        return <Reply className="w-4 h-4 text-blue-500" />;
      case 'mention':
        return <Quote className="w-4 h-4 text-purple-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationText = () => {
    const senderName = notification.sender_name || 'Пользователь';
    const eventTitle = notification.event_title || 'мероприятии';
    
    switch (notification.notification_type) {
      case 'reply':
        return `${senderName} ответил на ваш комментарий в "${eventTitle}"`;
      case 'mention':
        return `${senderName} процитировал ваш комментарий в "${eventTitle}"`;
      default:
        return `Новое уведомление от ${senderName}`;
    }
  };

  return (
    <Link
      to={getNotificationLink(notification)}
      onClick={handleClick}
      className={`block p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors ${
        !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Иконка типа уведомления */}
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon()}
        </div>

        {/* Основной контент */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${
                !notification.is_read 
                  ? 'font-medium text-gray-900 dark:text-white' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {getNotificationText()}
              </p>
              
              {!compact && notification.comment_content && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  "{notification.comment_content.substring(0, 100)}
                  {notification.comment_content.length > 100 ? '...' : ''}"
                </p>
              )}
            </div>

            {/* Индикатор непрочитанного */}
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
            )}
          </div>

          {/* Время и действия */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(notification.created_at)}
            </span>

            <div className="flex items-center gap-1">
              {/* Отметить как прочитанное */}
              {!notification.is_read && (
                <button
                  onClick={(e) => onMarkAsRead(notification.id, e)}
                  disabled={isMarkingAsRead}
                  className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                  title="Отметить как прочитанное"
                >
                  <Check className="w-3 h-3" />
                </button>
              )}

              {/* Удалить уведомление */}
              <button
                onClick={(e) => onDelete(notification.id, e)}
                disabled={isDeleting}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Удалить уведомление"
              >
                <Trash2 className={`w-3 h-3 ${isDeleting ? 'animate-pulse' : ''}`} />
              </button>

              {/* Иконка внешней ссылки */}
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

// Компонент скелетонов
interface NotificationsSkeletonProps {
  compact: boolean;
}

const NotificationsSkeleton: React.FC<NotificationsSkeletonProps> = ({ compact }) => (
  <div className="divide-y divide-gray-200 dark:divide-dark-700">
    {[...Array(compact ? 3 : 5)].map((_, index) => (
      <div key={index} className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="w-4 h-4 mt-1" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-2" />
            {!compact && <Skeleton className="h-3 w-full mb-1" />}
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <div className="flex gap-1">
                <Skeleton className="w-6 h-6 rounded" />
                <Skeleton className="w-6 h-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Компонент пустого состояния
interface EmptyNotificationsStateProps {
  showUnreadOnly: boolean;
  compact: boolean;
}

const EmptyNotificationsState: React.FC<EmptyNotificationsStateProps> = ({
  showUnreadOnly,
  compact
}) => (
  <div className={`text-center ${compact ? 'py-8' : 'py-12'}`}>
    <div className="flex justify-center mb-4">
      <div className="w-12 h-12 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
        {showUnreadOnly ? (
          <BellOff className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        ) : (
          <Bell className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        )}
      </div>
    </div>
    
    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
      {showUnreadOnly ? 'Нет новых уведомлений' : 'Пока нет уведомлений'}
    </h4>
    
    <p className="text-sm text-gray-500 dark:text-gray-400">
      {showUnreadOnly 
        ? 'Все уведомления прочитаны'
        : 'Уведомления о новых ответах и упоминаниях появятся здесь'
      }
    </p>
  </div>
);

export default CommentNotifications;