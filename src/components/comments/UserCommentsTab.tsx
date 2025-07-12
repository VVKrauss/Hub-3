// src/components/comments/UserCommentsTab.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageCircle, 
  Calendar, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  Filter,
  Clock,
  Quote
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserComments, EventComment, CommentFilters } from '../../api/comments';
import { Skeleton } from '../ui/UnifiedLoading';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface UserCommentsTabProps {
  userId: string;
  className?: string;
}

const UserCommentsTab: React.FC<UserCommentsTabProps> = ({
  userId,
  className = ''
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const pageSize = 10;
  const isOwnProfile = user?.id === userId;

  // Загрузка комментариев
  const loadComments = async (reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const page = reset ? 0 : currentPage;
      const filters: CommentFilters = {
        limit: pageSize,
        offset: page * pageSize,
        order_by: sortBy,
        order_direction: sortDirection
      };

      const { data, error: apiError, total: apiTotal } = await getUserComments(userId, filters);

      if (apiError) {
        setError(apiError);
        return;
      }

      if (reset) {
        setComments(data);
        setCurrentPage(1);
      } else {
        setComments(prev => [...prev, ...data]);
        setCurrentPage(prev => prev + 1);
      }

      setTotal(apiTotal || 0);
      setHasMore(data.length === pageSize);

    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки комментариев');
    } finally {
      setLoading(false);
    }
  };

  // Первоначальная загрузка
  useEffect(() => {
    loadComments(true);
  }, [userId, sortBy, sortDirection]);

  // Загрузка следующей страницы
  const loadMore = () => {
    if (!loading && hasMore) {
      loadComments(false);
    }
  };

  // Обновление списка
  const refresh = () => {
    loadComments(true);
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

  // Получение ссылки на мероприятие
  const getEventLink = (comment: EventComment) => {
    if (comment.events?.id) {
      return `/events/${comment.events.id}#comment-${comment.id}`;
    }
    return `/events/${comment.event_id}#comment-${comment.id}`;
  };

  return (
    <div className={className}>
      {/* Заголовок и фильтры */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isOwnProfile ? 'Мои комментарии' : 'Комментарии пользователя'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? 'Загрузка...' : `Всего: ${total} ${getCommentWord(total)}`}
              </p>
            </div>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Сортировка */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [newSortBy, newSortDirection] = e.target.value.split('-') as [typeof sortBy, typeof sortDirection];
                setSortBy(newSortBy);
                setSortDirection(newSortDirection);
              }}
              className="text-sm border border-gray-300 dark:border-dark-600 rounded-lg px-3 py-1 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
            >
              <option value="created_at-desc">Сначала новые</option>
              <option value="created_at-asc">Сначала старые</option>
              <option value="updated_at-desc">По последнему изменению</option>
            </select>
          </div>
        </div>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Список комментариев */}
      <div className="space-y-4">
        {loading && comments.length === 0 ? (
          // Скелетоны при первой загрузке
          <UserCommentsSkeleton />
        ) : comments.length > 0 ? (
          // Список комментариев
          <>
            {comments.map((comment) => (
              <UserCommentCard
                key={comment.id}
                comment={comment}
                formatTime={formatTime}
                getEventLink={getEventLink}
              />
            ))}

            {/* Кнопка "Загрузить еще" */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      Показать еще
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : !loading ? (
          // Пустое состояние
          <EmptyCommentsState isOwnProfile={isOwnProfile} />
        ) : null}
      </div>
    </div>
  );
};

// Компонент карточки комментария
interface UserCommentCardProps {
  comment: EventComment;
  formatTime: (date: string) => string;
  getEventLink: (comment: EventComment) => string;
}

const UserCommentCard: React.FC<UserCommentCardProps> = ({
  comment,
  formatTime,
  getEventLink
}) => {
  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-4 hover:shadow-md transition-shadow">
      {/* Заголовок с информацией о мероприятии */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <Link
            to={getEventLink(comment)}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium truncate"
          >
            {(comment as any).events?.title || 'Мероприятие'}
          </Link>
          <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
          <Clock className="w-4 h-4" />
          {formatTime(comment.created_at)}
          {comment.is_edited && (
            <span className="text-xs">(изменено)</span>
          )}
        </div>
      </div>

      {/* Цитата (если есть) */}
      {comment.quoted_text && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-dark-700 border-l-4 border-primary-500 rounded-r-lg">
          <div className="flex items-center gap-1 mb-1">
            <Quote className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Цитата:
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
            "{comment.quoted_text}"
          </p>
        </div>
      )}

      {/* Содержимое комментария */}
      <div className="text-gray-900 dark:text-white">
        <p className="whitespace-pre-wrap">
          {comment.content.length > 300 
            ? `${comment.content.substring(0, 300)}...` 
            : comment.content
          }
        </p>
      </div>

      {/* Тип комментария */}
      <div className="mt-3 flex items-center gap-2">
        {comment.parent_comment_id && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
            <MessageCircle className="w-3 h-3" />
            Ответ
          </span>
        )}
        
        {comment.quoted_comment_id && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
            <Quote className="w-3 h-3" />
            С цитатой
          </span>
        )}
      </div>
    </div>
  );
};

// Компонент скелетонов
const UserCommentsSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// Компонент пустого состояния
interface EmptyCommentsStateProps {
  isOwnProfile: boolean;
}

const EmptyCommentsState: React.FC<EmptyCommentsStateProps> = ({
  isOwnProfile
}) => (
  <div className="text-center py-12">
    <div className="flex justify-center mb-4">
      <div className="w-16 h-16 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
        <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    </div>
    
    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
      {isOwnProfile ? 'Вы еще не оставляли комментариев' : 'Пользователь не оставлял комментариев'}
    </h4>
    
    <p className="text-gray-500 dark:text-gray-400 mb-6">
      {isOwnProfile 
        ? 'Принимайте участие в обсуждениях мероприятий, чтобы комментарии появились здесь'
        : 'Комментарии пользователя к мероприятиям будут отображаться здесь'
      }
    </p>

    {isOwnProfile && (
      <Link
        to="/events"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        <Calendar className="w-4 h-4" />
        Посмотреть мероприятия
      </Link>
    )}
  </div>
);

// Утилита для склонения слова "комментарий"
const getCommentWord = (count: number): string => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'комментариев';
  }
  
  switch (lastDigit) {
    case 1:
      return 'комментарий';
    case 2:
    case 3:
    case 4:
      return 'комментария';
    default:
      return 'комментариев';
  }
};

export default UserCommentsTab;