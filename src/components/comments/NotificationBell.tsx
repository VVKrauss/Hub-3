// src/components/comments/NotificationBell.tsx - Минимальная версия
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Кнопка уведомлений */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
        title="Уведомления"
      >
        <Bell className="w-5 h-5" />
        
        {/* Тестовый счетчик */}
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
          0
        </span>
      </button>

      {/* Простой dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-600 z-50">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Уведомления
            </h3>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-4" />
              <p>Система уведомлений в разработке</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;