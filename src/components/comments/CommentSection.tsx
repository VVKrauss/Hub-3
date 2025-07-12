// src/components/comments/CommentSection.tsx
import React, { useState } from 'react';
import { MessageCircle, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useComments } from '../../hooks/useComments';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';
import { Skeleton } from '../ui/UnifiedLoading';

interface CommentSectionProps {
  eventId: string;
  eventTitle?: string;
  className?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  eventId,
  eventTitle,
  className = ''
}) => {
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    comments,
    loading,
    creating,
    error,
    total,
    hasMore,
    loadMoreComments,
    createNewComment,
    refreshComments,
    canModerate
  } = useComments({
    eventId,
    autoLoad: true,
    pageSize: 10,
    orderBy: 'created_at',
    orderDirection: 'desc',
    onCommentCreated: () => {
      setShowAddForm(false);
    }
  });

  const handleCreateComment = async (content: string) => {
    const comment = await createNewComment({ content });
    return !!comment;
  };

  const handleRefresh = () => {
    refreshComments();
  };

  return (
    <div className={`bg-white dark:bg-dark-800 rounded-xl shadow-lg ${className}`}>
      {/* Заголовок секции */}
      <div className="p-6 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Комментарии
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? 'Загрузка...' : `${total} ${getCommentWord(total)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Кнопка обновления */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="Обновить комментарии"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Кнопка добавления комментария */}
            {user && !showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Комментировать
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Контент секции */}
      <div className="p-6">
        {/* Сообщение об ошибке */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">
                Ошибка загрузки комментариев: {error}
              </p>
            </div>
          </div>
        )}

        {/* Форма добавления комментария */}
        {user && showAddForm && (
          <div className="mb-6">
            <CommentForm
              onSubmit={handleCreateComment}
              onCancel={() => setShowAddForm(false)}
              loading={creating}
              placeholder="Напишите ваш комментарий..."
              submitText="Опубликовать"
              autoFocus
            />
          </div>
        )}

        {/* Сообщение для неавторизованных пользователей */}
        {!user && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-700 dark:text-blue-300 text-center">
              <MessageCircle className="w-5 h-5 inline mr-2" />
              Войдите в систему, чтобы оставить комментарий
            </p>
          </div>
        )}

        {/* Список комментариев */}
        <div className="space-y-6">
          {loading && comments.length === 0 ? (
            // Скелетоны при первой загрузке
            <CommentsSkeleton />
          ) : comments.length > 0 ? (
            // Список комментариев
            <>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  eventId={eventId}
                  canModerate={canModerate}
                  level={0}
                />
              ))}

              {/* Кнопка "Загрузить еще" */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMoreComments}
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
                        <Plus className="w-4 h-4" />
                        Показать еще комментарии
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : !loading ? (
            // Пустое состояние
            <EmptyCommentsState
              hasUser={!!user}
              onAddComment={() => setShowAddForm(true)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Компонент скелетонов комментариев
const CommentsSkeleton: React.FC = () => (
  <div className="space-y-6">
    {[...Array(3)].map((_, index) => (
      <div key={index} className="space-y-3">
        {/* Заголовок комментария */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        
        {/* Контент комментария */}
        <div className="ml-13 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Действия */}
        <div className="ml-13 flex items-center gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    ))}
  </div>
);

// Компонент пустого состояния
interface EmptyCommentsStateProps {
  hasUser: boolean;
  onAddComment: () => void;
}

const EmptyCommentsState: React.FC<EmptyCommentsStateProps> = ({
  hasUser,
  onAddComment
}) => (
  <div className="text-center py-12">
    <div className="flex justify-center mb-4">
      <div className="w-16 h-16 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
        <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    </div>
    
    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
      Пока нет комментариев
    </h4>
    
    <p className="text-gray-500 dark:text-gray-400 mb-6">
      {hasUser 
        ? 'Будьте первым, кто оставит комментарий к этому мероприятию'
        : 'Войдите в систему, чтобы оставить первый комментарий'
      }
    </p>

    {hasUser && (
      <button
        onClick={onAddComment}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Написать комментарий
      </button>
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

export default CommentSection;
