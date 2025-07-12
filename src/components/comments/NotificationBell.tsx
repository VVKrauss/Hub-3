// src/components/comments/NotificationBell.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCommentNotifications } from '../../hooks/useCommentNotifications';
import CommentNotifications from './CommentNotifications';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    unreadCount,
    markAsRead,
    getRecentNotificationsList
  } = useCommentNotifications({
    autoLoad: true,
    enableRealTime: true,
    showToastOnNew: true
  });

  // Закрытие по клику вне dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Обработка клика на уведомление
  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
    setIsOpen(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Кнопка уведомлений */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
        title="Уведомления"
      >
        <Bell className="w-5 h-5" />
        
        {/* Счетчик непрочитанных */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown с уведомлениями */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-600 z-50">
          {/* Заголовок dropdown */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Уведомления
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Список уведомлений */}
          <div className="max-h-96 overflow-y-auto">
            <CommentNotifications
              maxItems={10}
              showHeader={false}
              compact={true}
              className="border-0 shadow-none rounded-none"
            />
          </div>

          {/* Футер с ссылкой на все уведомления */}
          <div className="p-3 border-t border-gray-200 dark:border-dark-700">
            <button
              onClick={() => {
                setIsOpen(false);
                // Можно добавить навигацию к странице со всеми уведомлениями
                // navigate('/notifications');
              }}
              className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              Посмотреть все уведомления
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;