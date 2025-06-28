// src/hooks/useFavorites.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const useFavoriteSpeakers = (userId?: string) => {
  const [favoriteSpeakers, setFavoriteSpeakers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavoriteSpeakers = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_favorite_speakers')
        .select('speaker_id')
        .eq('user_id', userId);

      if (error) throw error;
      setFavoriteSpeakers(data?.map(item => item.speaker_id) || []);
    } catch (error) {
      console.error('Error fetching favorite speakers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavoriteSpeaker = async (speakerId: string) => {
    if (!userId) {
      toast.error('Войдите в систему для добавления в избранное');
      return;
    }

    const isFavorite = favoriteSpeakers.includes(speakerId);
    
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorite_speakers')
          .delete()
          .eq('user_id', userId)
          .eq('speaker_id', speakerId);

        if (error) throw error;
        
        setFavoriteSpeakers(prev => prev.filter(id => id !== speakerId));
        toast.success('Спикер удален из избранного');
      } else {
        const { error } = await supabase
          .from('user_favorite_speakers')
          .insert({ user_id: userId, speaker_id: speakerId });

        if (error) throw error;
        
        setFavoriteSpeakers(prev => [...prev, speakerId]);
        toast.success('Спикер добавлен в избранное');
      }
    } catch (error) {
      console.error('Error toggling favorite speaker:', error);
      toast.error('Ошибка при изменении избранного');
    }
  };

  const isFavoriteSpeaker = (speakerId: string) => {
    return favoriteSpeakers.includes(speakerId);
  };

  useEffect(() => {
    fetchFavoriteSpeakers();
  }, [userId]);

  return {
    favoriteSpeakers,
    loading,
    toggleFavoriteSpeaker,
    isFavoriteSpeaker,
    refetch: fetchFavoriteSpeakers
  };
};

export const useFavoriteEvents = (userId?: string) => {
  const [favoriteEvents, setFavoriteEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavoriteEvents = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_favorite_events')
        .select('event_id')
        .eq('user_id', userId);

      if (error) throw error;
      setFavoriteEvents(data?.map(item => item.event_id) || []);
    } catch (error) {
      console.error('Error fetching favorite events:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavoriteEvent = async (eventId: string) => {
    if (!userId) {
      toast.error('Войдите в систему для добавления в избранное');
      return;
    }

    const isFavorite = favoriteEvents.includes(eventId);
    
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorite_events')
          .delete()
          .eq('user_id', userId)
          .eq('event_id', eventId);

        if (error) throw error;
        
        setFavoriteEvents(prev => prev.filter(id => id !== eventId));
        toast.success('Мероприятие удалено из избранного');
      } else {
        const { error } = await supabase
          .from('user_favorite_events')
          .insert({ user_id: userId, event_id: eventId });

        if (error) throw error;
        
        setFavoriteEvents(prev => [...prev, eventId]);
        toast.success('Мероприятие добавлено в избранное');
      }
    } catch (error) {
      console.error('Error toggling favorite event:', error);
      toast.error('Ошибка при изменении избранного');
    }
  };

  const isFavoriteEvent = (eventId: string) => {
    return favoriteEvents.includes(eventId);
  };

  useEffect(() => {
    fetchFavoriteEvents();
  }, [userId]);

  return {
    favoriteEvents,
    loading,
    toggleFavoriteEvent,
    isFavoriteEvent,
    refetch: fetchFavoriteEvents
  };
};

export const useFavoriteEventTypes = (userId?: string) => {
  const [favoriteEventTypes, setFavoriteEventTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavoriteEventTypes = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_favorite_event_types')
        .select('event_type')
        .eq('user_id', userId);

      if (error) throw error;
      setFavoriteEventTypes(data?.map(item => item.event_type) || []);
    } catch (error) {
      console.error('Error fetching favorite event types:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavoriteEventType = async (eventType: string) => {
    if (!userId) {
      toast.error('Войдите в систему для добавления в избранное');
      return;
    }

    const isFavorite = favoriteEventTypes.includes(eventType);
    
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorite_event_types')
          .delete()
          .eq('user_id', userId)
          .eq('event_type', eventType);

        if (error) throw error;
        
        setFavoriteEventTypes(prev => prev.filter(type => type !== eventType));
        toast.success('Тип мероприятий удален из избранного');
      } else {
        const { error } = await supabase
          .from('user_favorite_event_types')
          .insert({ user_id: userId, event_type: eventType });

        if (error) throw error;
        
        setFavoriteEventTypes(prev => [...prev, eventType]);
        toast.success('Тип мероприятий добавлен в избранное');
      }
    } catch (error) {
      console.error('Error toggling favorite event type:', error);
      toast.error('Ошибка при изменении избранного');
    }
  };

  const isFavoriteEventType = (eventType: string) => {
    return favoriteEventTypes.includes(eventType);
  };

  useEffect(() => {
    fetchFavoriteEventTypes();
  }, [userId]);

  return {
    favoriteEventTypes,
    loading,
    toggleFavoriteEventType,
    isFavoriteEventType,
    refetch: fetchFavoriteEventTypes
  };
};