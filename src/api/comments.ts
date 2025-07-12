// src/api/comments.ts
import { supabase } from '../lib/supabase';

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  quoted_text?: string;
  quoted_comment_id?: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  // Расширенные поля из join'ов
  user_name?: string;
  user_avatar?: string;
  user_role?: string;
  replies_count?: number;
  parent_comment?: EventComment;
  quoted_comment?: EventComment;
}

export interface CommentNotification {
  id: string;
  recipient_user_id: string;
  sender_user_id: string;
  comment_id: string;
  event_id: string;
  notification_type: 'reply' | 'mention';
  is_read: boolean;
  created_at: string;
  // Расширенные поля
  sender_name?: string;
  sender_avatar?: string;
  comment_content?: string;
  event_title?: string;
}

export interface CreateCommentData {
  event_id: string;
  content: string;
  parent_comment_id?: string;
  quoted_text?: string;
  quoted_comment_id?: string;
}

export interface CommentFilters {
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'updated_at';
  order_direction?: 'asc' | 'desc';
  parent_only?: boolean; // Только родительские комментарии
}

// Получение комментариев для мероприятия
export const getEventComments = async (
  eventId: string, 
  filters: CommentFilters = {}
): Promise<{ data: EventComment[]; error: string | null; total?: number }> => {
  try {
    const {
      limit = 20,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'desc',
      parent_only = false
    } = filters;

    let query = supabase
      .from('event_comments')
      .select(`
        *,
        profiles:user_id (
          name,
          avatar,
          role
        ),
        parent_comment:parent_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        ),
        quoted_comment:quoted_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        )
      `)
      .eq('event_id', eventId)
      .order(order_by, { ascending: order_direction === 'asc' })
      .range(offset, offset + limit - 1);

    if (parent_only) {
      query = query.is('parent_comment_id', null);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching comments:', error);
      return { data: [], error: error.message };
    }

    // Преобразуем данные для удобства использования
    const transformedData: EventComment[] = data?.map(comment => ({
      ...comment,
      user_name: comment.profiles?.name,
      user_avatar: comment.profiles?.avatar,
      user_role: comment.profiles?.role,
      parent_comment: comment.parent_comment,
      quoted_comment: comment.quoted_comment
    })) || [];

    return { 
      data: transformedData, 
      error: null,
      total: count || undefined
    };
  } catch (error: any) {
    console.error('Error in getEventComments:', error);
    return { data: [], error: error.message };
  }
};

// Получение ответов на комментарий
export const getCommentReplies = async (
  parentCommentId: string,
  filters: CommentFilters = {}
): Promise<{ data: EventComment[]; error: string | null }> => {
  try {
    const {
      limit = 10,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'asc'
    } = filters;

    const { data, error } = await supabase
      .from('event_comments')
      .select(`
        *,
        profiles:user_id (
          name,
          avatar,
          role
        ),
        quoted_comment:quoted_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        )
      `)
      .eq('parent_comment_id', parentCommentId)
      .order(order_by, { ascending: order_direction === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching replies:', error);
      return { data: [], error: error.message };
    }

    const transformedData: EventComment[] = data?.map(comment => ({
      ...comment,
      user_name: comment.profiles?.name,
      user_avatar: comment.profiles?.avatar,
      user_role: comment.profiles?.role,
      quoted_comment: comment.quoted_comment
    })) || [];

    return { data: transformedData, error: null };
  } catch (error: any) {
    console.error('Error in getCommentReplies:', error);
    return { data: [], error: error.message };
  }
};

// Создание нового комментария
export const createComment = async (
  commentData: CreateCommentData
): Promise<{ data: EventComment | null; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Требуется авторизация' };
    }

    // Валидация контента
    if (!commentData.content.trim()) {
      return { data: null, error: 'Комментарий не может быть пустым' };
    }

    if (commentData.content.length > 2000) {
      return { data: null, error: 'Комментарий слишком длинный (максимум 2000 символов)' };
    }

    const { data, error } = await supabase
      .from('event_comments')
      .insert([
        {
          ...commentData,
          user_id: user.id,
          content: commentData.content.trim()
        }
      ])
      .select(`
        *,
        profiles:user_id (
          name,
          avatar,
          role
        ),
        parent_comment:parent_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        ),
        quoted_comment:quoted_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return { data: null, error: error.message };
    }

    // Преобразуем данные
    const transformedComment: EventComment = {
      ...data,
      user_name: data.profiles?.name,
      user_avatar: data.profiles?.avatar,
      user_role: data.profiles?.role,
      parent_comment: data.parent_comment,
      quoted_comment: data.quoted_comment
    };

    return { data: transformedComment, error: null };
  } catch (error: any) {
    console.error('Error in createComment:', error);
    return { data: null, error: error.message };
  }
};

// Обновление комментария (только для администраторов)
export const updateComment = async (
  commentId: string,
  content: string
): Promise<{ data: EventComment | null; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Требуется авторизация' };
    }

    // Проверяем права администратора
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'Administrator'].includes(profile.role)) {
      return { data: null, error: 'Недостаточно прав' };
    }

    // Валидация контента
    if (!content.trim()) {
      return { data: null, error: 'Комментарий не может быть пустым' };
    }

    if (content.length > 2000) {
      return { data: null, error: 'Комментарий слишком длинный (максимум 2000 символов)' };
    }

    const { data, error } = await supabase
      .from('event_comments')
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select(`
        *,
        profiles:user_id (
          name,
          avatar,
          role
        ),
        parent_comment:parent_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        ),
        quoted_comment:quoted_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return { data: null, error: error.message };
    }

    const transformedComment: EventComment = {
      ...data,
      user_name: data.profiles?.name,
      user_avatar: data.profiles?.avatar,
      user_role: data.profiles?.role,
      parent_comment: data.parent_comment,
      quoted_comment: data.quoted_comment
    };

    return { data: transformedComment, error: null };
  } catch (error: any) {
    console.error('Error in updateComment:', error);
    return { data: null, error: error.message };
  }
};

// Удаление комментария (только для администраторов)
export const deleteComment = async (
  commentId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Требуется авторизация' };
    }

    // Проверяем права администратора
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'Administrator'].includes(profile.role)) {
      return { success: false, error: 'Недостаточно прав' };
    }

    const { error } = await supabase
      .from('event_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in deleteComment:', error);
    return { success: false, error: error.message };
  }
};

// Получение комментариев пользователя
export const getUserComments = async (
  userId: string,
  filters: CommentFilters = {}
): Promise<{ data: EventComment[]; error: string | null; total?: number }> => {
  try {
    const {
      limit = 20,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'desc'
    } = filters;

    const { data, error, count } = await supabase
      .from('event_comments')
      .select(`
        *,
        events:event_id (
          id,
          title,
          start_at
        ),
        parent_comment:parent_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        ),
        quoted_comment:quoted_comment_id (
          id,
          content,
          user_id,
          profiles:user_id (
            name
          )
        )
      `)
      .eq('user_id', userId)
      .order(order_by, { ascending: order_direction === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user comments:', error);
      return { data: [], error: error.message };
    }

    const transformedData: EventComment[] = data?.map(comment => ({
      ...comment,
      parent_comment: comment.parent_comment,
      quoted_comment: comment.quoted_comment
    })) || [];

    return { 
      data: transformedData, 
      error: null,
      total: count || undefined
    };
  } catch (error: any) {
    console.error('Error in getUserComments:', error);
    return { data: [], error: error.message };
  }
};

// Получение количества комментариев для мероприятия
export const getEventCommentsCount = async (
  eventId: string
): Promise<{ count: number; error: string | null }> => {
  try {
    const { count, error } = await supabase
      .from('event_comments')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (error) {
      console.error('Error getting comments count:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (error: any) {
    console.error('Error in getEventCommentsCount:', error);
    return { count: 0, error: error.message };
  }
};