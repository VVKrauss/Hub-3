// src/hooks/useComments.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  EventComment,
  CommentFilters,
  CreateCommentData,
  getEventComments,
  getCommentReplies,
  createComment,
  updateComment,
  deleteComment,
  getEventCommentsCount
} from '../api/comments';

interface CommentsState {
  comments: EventComment[];
  repliesMap: { [parentId: string]: EventComment[] };
  loading: boolean;
  creating: boolean;
  updating: { [commentId: string]: boolean };
  deleting: { [commentId: string]: boolean };
  loadingReplies: { [parentId: string]: boolean };
  error: string | null;
  total: number;
  hasMore: boolean;
  currentPage: number;
}

interface UseCommentsOptions {
  eventId: string;
  autoLoad?: boolean;
  pageSize?: number;
  orderBy?: 'created_at' | 'updated_at';
  orderDirection?: 'asc' | 'desc';
  onCommentCreated?: (comment: EventComment) => void;
  onCommentUpdated?: (comment: EventComment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

interface UseCommentsReturn extends CommentsState {
  // Основные действия
  loadComments: (reset?: boolean) => Promise<void>;
  loadMoreComments: () => Promise<void>;
  loadReplies: (parentCommentId: string) => Promise<void>;
  createNewComment: (commentData: Omit<CreateCommentData, 'event_id'>) => Promise<EventComment | null>;
  updateExistingComment: (commentId: string, content: string) => Promise<EventComment | null>;
  deleteExistingComment: (commentId: string) => Promise<boolean>;
  
  // Вспомогательные функции
  refreshComments: () => Promise<void>;
  getComment: (commentId: string) => EventComment | undefined;
  getReplies: (parentCommentId: string) => EventComment[];
  getCommentsCount: () => Promise<number>;
  
  // Состояние пользователя
  canModerate: boolean;
}

export const useComments = (options: UseCommentsOptions): UseCommentsReturn => {
  const {
    eventId,
    autoLoad = true,
    pageSize = 20,
    orderBy = 'created_at',
    orderDirection = 'desc',
    onCommentCreated,
    onCommentUpdated,
    onCommentDeleted
  } = options;

  const { user } = useAuth();
  const isMountedRef = useRef(true);

  // Состояние
  const [state, setState] = useState<CommentsState>({
    comments: [],
    repliesMap: {},
    loading: false,
    creating: false,
    updating: {},
    deleting: {},
    loadingReplies: {},
    error: null,
    total: 0,
    hasMore: true,
    currentPage: 0
  });

  // Проверка прав модератора
  const canModerate = user?.role === 'admin' || user?.role === 'Administrator';

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Автозагрузка комментариев при монтировании
  useEffect(() => {
    if (autoLoad && eventId) {
      loadComments(true);
    }
  }, [eventId, autoLoad]);

  // Загрузка комментариев
  const loadComments = useCallback(async (reset: boolean = false) => {
    if (!eventId) return;

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(reset && { comments: [], currentPage: 0, hasMore: true })
      }));

      const page = reset ? 0 : state.currentPage;
      const filters: CommentFilters = {
        limit: pageSize,
        offset: page * pageSize,
        order_by: orderBy,
        order_direction: orderDirection,
        parent_only: true // Загружаем только родительские комментарии
      };

      const { data, error, total } = await getEventComments(eventId, filters);

      if (!isMountedRef.current) return;

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error
        }));
        toast.error(`Ошибка загрузки комментариев: ${error}`);
        return;
      }

      setState(prev => ({
        ...prev,
        comments: reset ? data : [...prev.comments, ...data],
        loading: false,
        error: null,
        total: total || 0,
        hasMore: data.length === pageSize,
        currentPage: page + 1
      }));

    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error loading comments:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      toast.error('Ошибка при загрузке комментариев');
    }
  }, [eventId, pageSize, orderBy, orderDirection, state.currentPage]);

  // Загрузка следующей страницы
  const loadMoreComments = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    await loadComments(false);
  }, [loadComments, state.loading, state.hasMore]);

  // Загрузка ответов на комментарий
  const loadReplies = useCallback(async (parentCommentId: string) => {
    if (!eventId || state.loadingReplies[parentCommentId]) return;

    try {
      setState(prev => ({
        ...prev,
        loadingReplies: {
          ...prev.loadingReplies,
          [parentCommentId]: true
        }
      }));

      const filters: CommentFilters = {
        limit: 50, // Загружаем все ответы за раз
        order_by: 'created_at',
        order_direction: 'asc'
      };

      const { data, error } = await getCommentReplies(parentCommentId, filters);

      if (!isMountedRef.current) return;

      if (error) {
        setState(prev => ({
          ...prev,
          loadingReplies: {
            ...prev.loadingReplies,
            [parentCommentId]: false
          }
        }));
        toast.error(`Ошибка загрузки ответов: ${error}`);
        return;
      }

      setState(prev => ({
        ...prev,
        repliesMap: {
          ...prev.repliesMap,
          [parentCommentId]: data
        },
        loadingReplies: {
          ...prev.loadingReplies,
          [parentCommentId]: false
        }
      }));

    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error loading replies:', error);
      setState(prev => ({
        ...prev,
        loadingReplies: {
          ...prev.loadingReplies,
          [parentCommentId]: false
        }
      }));
      toast.error('Ошибка при загрузке ответов');
    }
  }, [eventId]);

  // Создание нового комментария
  const createNewComment = useCallback(async (
    commentData: Omit<CreateCommentData, 'event_id'>
  ): Promise<EventComment | null> => {
    if (!user) {
      toast.error('Требуется авторизация для комментирования');
      return null;
    }

    try {
      setState(prev => ({ ...prev, creating: true, error: null }));

      const { data, error } = await createComment({
        ...commentData,
        event_id: eventId
      });

      if (!isMountedRef.current) return null;

      if (error) {
        setState(prev => ({ ...prev, creating: false }));
        toast.error(`Ошибка создания комментария: ${error}`);
        return null;
      }

      if (!data) {
        setState(prev => ({ ...prev, creating: false }));
        toast.error('Не удалось создать комментарий');
        return null;
      }

      // Добавляем комментарий в соответствующий список
      setState(prev => {
        if (data.parent_comment_id) {
          // Это ответ на комментарий
          return {
            ...prev,
            creating: false,
            repliesMap: {
              ...prev.repliesMap,
              [data.parent_comment_id]: [
                ...(prev.repliesMap[data.parent_comment_id] || []),
                data
              ]
            }
          };
        } else {
          // Это новый родительский комментарий
          return {
            ...prev,
            creating: false,
            comments: orderDirection === 'desc' 
              ? [data, ...prev.comments]
              : [...prev.comments, data],
            total: prev.total + 1
          };
        }
      });

      toast.success('Комментарий добавлен');
      onCommentCreated?.(data);
      return data;

    } catch (error: any) {
      if (!isMountedRef.current) return null;
      
      console.error('Error creating comment:', error);
      setState(prev => ({ ...prev, creating: false }));
      toast.error('Ошибка при создании комментария');
      return null;
    }
  }, [eventId, user, orderDirection, onCommentCreated]);

  // Обновление комментария
  const updateExistingComment = useCallback(async (
    commentId: string,
    content: string
  ): Promise<EventComment | null> => {
    if (!canModerate) {
      toast.error('Недостаточно прав для редактирования');
      return null;
    }

    try {
      setState(prev => ({
        ...prev,
        updating: { ...prev.updating, [commentId]: true }
      }));

      const { data, error } = await updateComment(commentId, content);

      if (!isMountedRef.current) return null;

      setState(prev => ({
        ...prev,
        updating: { ...prev.updating, [commentId]: false }
      }));

      if (error) {
        toast.error(`Ошибка обновления комментария: ${error}`);
        return null;
      }

      if (!data) {
        toast.error('Не удалось обновить комментарий');
        return null;
      }

      // Обновляем комментарий в соответствующем списке
      setState(prev => {
        const updateCommentInList = (comments: EventComment[]) =>
          comments.map(comment => 
            comment.id === commentId ? data : comment
          );

        const newRepliesMap = { ...prev.repliesMap };
        Object.keys(newRepliesMap).forEach(parentId => {
          newRepliesMap[parentId] = updateCommentInList(newRepliesMap[parentId]);
        });

        return {
          ...prev,
          comments: updateCommentInList(prev.comments),
          repliesMap: newRepliesMap
        };
      });

      toast.success('Комментарий обновлен');
      onCommentUpdated?.(data);
      return data;

    } catch (error: any) {
      if (!isMountedRef.current) return null;
      
      console.error('Error updating comment:', error);
      setState(prev => ({
        ...prev,
        updating: { ...prev.updating, [commentId]: false }
      }));
      toast.error('Ошибка при обновлении комментария');
      return null;
    }
  }, [canModerate, onCommentUpdated]);

  // Удаление комментария
  const deleteExistingComment = useCallback(async (commentId: string): Promise<boolean> => {
    if (!canModerate) {
      toast.error('Недостаточно прав для удаления');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        deleting: { ...prev.deleting, [commentId]: true }
      }));

      const { success, error } = await deleteComment(commentId);

      if (!isMountedRef.current) return false;

      setState(prev => ({
        ...prev,
        deleting: { ...prev.deleting, [commentId]: false }
      }));

      if (error) {
        toast.error(`Ошибка удаления комментария: ${error}`);
        return false;
      }

      if (!success) {
        toast.error('Не удалось удалить комментарий');
        return false;
      }

      // Удаляем комментарий из соответствующего списка
      setState(prev => {
        const filterComments = (comments: EventComment[]) =>
          comments.filter(comment => comment.id !== commentId);

        const newRepliesMap = { ...prev.repliesMap };
        Object.keys(newRepliesMap).forEach(parentId => {
          newRepliesMap[parentId] = filterComments(newRepliesMap[parentId]);
        });

        return {
          ...prev,
          comments: filterComments(prev.comments),
          repliesMap: newRepliesMap,
          total: prev.total - 1
        };
      });

      toast.success('Комментарий удален');
      onCommentDeleted?.(commentId);
      return true;

    } catch (error: any) {
      if (!isMountedRef.current) return false;
      
      console.error('Error deleting comment:', error);
      setState(prev => ({
        ...prev,
        deleting: { ...prev.deleting, [commentId]: false }
      }));
      toast.error('Ошибка при удалении комментария');
      return false;
    }
  }, [canModerate, onCommentDeleted]);

  // Обновление списка комментариев
  const refreshComments = useCallback(async () => {
    await loadComments(true);
  }, [loadComments]);

  // Получение конкретного комментария
  const getComment = useCallback((commentId: string): EventComment | undefined => {
    // Ищем в родительских комментариях
    const parentComment = state.comments.find(comment => comment.id === commentId);
    if (parentComment) return parentComment;

    // Ищем в ответах
    for (const replies of Object.values(state.repliesMap)) {
      const replyComment = replies.find(comment => comment.id === commentId);
      if (replyComment) return replyComment;
    }

    return undefined;
  }, [state.comments, state.repliesMap]);

  // Получение ответов на комментарий
  const getReplies = useCallback((parentCommentId: string): EventComment[] => {
    return state.repliesMap[parentCommentId] || [];
  }, [state.repliesMap]);

  // Получение общего количества комментариев
  const getCommentsCount = useCallback(async (): Promise<number> => {
    try {
      const { count } = await getEventCommentsCount(eventId);
      return count;
    } catch (error) {
      console.error('Error getting comments count:', error);
      return 0;
    }
  }, [eventId]);

  return {
    // Состояние
    ...state,
    
    // Основные действия
    loadComments,
    loadMoreComments,
    loadReplies,
    createNewComment,
    updateExistingComment,
    deleteExistingComment,
    
    // Вспомогательные функции
    refreshComments,
    getComment,
    getReplies,
    getCommentsCount,
    
    // Права пользователя
    canModerate
  };
};