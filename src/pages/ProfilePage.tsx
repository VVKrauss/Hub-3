// src/pages/ProfilePage.tsx - ПОЛНАЯ ВЕРСИЯ с комментариями
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Mail, 
  Calendar, 
  Edit, 
  Save, 
  X, 
  Shield, 
  Heart, 
  Users, 
  ExternalLink, 
  MapPin, 
  Clock, 
  Camera, 
  History, 
  QrCode,
  MessageCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteSpeakers, useFavoriteEvents } from '../hooks/useFavorites';
import { getSupabaseImageUrl } from '../utils/imageUtils';
import AvatarSelector from '../components/ui/AvatarSelector';
import UserRegistrationHistory from '../components/profile/UserRegistrationHistory';
import UserQRCode from '../components/profile/UserQRCode';
import UserCommentsTab from '../components/comments/UserCommentsTab';
import { getRandomAvatarUrl } from '../utils/dynamicAvatarUtils';

type Profile = {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email: string;
  created_at: string;
};

type FavoriteSpeaker = {
  id: string;
  name: string;
  description?: string;
  field_of_expertise?: string;
  photos?: { url: string; isMain?: boolean }[];
};

type FavoriteEvent = {
  id: string;
  title: string;
  description?: string;
  start_at?: string;
  location?: string;
  bg_image?: string;
  event_type?: string;
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [saving, setSaving] = useState(false);
  
  // Новое состояние для табов
  const [activeTab, setActiveTab] = useState<'favorites' | 'comments' | 'history'>('favorites');
  
  // Хуки для избранного
  const { toggleFavoriteSpeaker, isFavoriteSpeaker } = useFavoriteSpeakers(currentUser?.id);
  const { toggleFavoriteEvent, isFavoriteEvent } = useFavoriteEvents(currentUser?.id);
  const [favoriteSpeakersData, setFavoriteSpeakersData] = useState<FavoriteSpeaker[]>([]);
  const [favoriteEventsData, setFavoriteEventsData] = useState<FavoriteEvent[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Защита от отсутствия пользователя
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/');
    }
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Profile fetch error:', error);
          throw error;
        }
        
        if (!profileData) {
          // Создаем новый профиль с случайным аватаром
          try {
            const randomAvatarUrl = await getRandomAvatarUrl();
            
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: currentUser.id,
                  name: currentUser.name || '',
                  email: currentUser.email,
                  role: 'User',
                  avatar: randomAvatarUrl
                }
              ])
              .select()
              .single();

            if (insertError) throw insertError;
            setProfile(newProfile);
          } catch (insertError) {
            console.error('Error creating profile:', insertError);
            // Если не удалось создать профиль, используем базовые данные
            setProfile({
              id: currentUser.id,
              name: currentUser.name || '',
              email: currentUser.email || '',
              role: 'User',
              created_at: new Date().toISOString()
            });
          }
        } else {
          setProfile(profileData);
        }
        
        setFormData({
          name: profileData?.name || currentUser.name || '',
        });
      } catch (error) {
        console.error('Profile fetch error:', error);
        toast.error('Ошибка при загрузке профиля');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  // Загрузка избранных данных
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!currentUser) return;
      
      setLoadingFavorites(true);
      try {
        // Загружаем избранных спикеров
        const { data: speakers, error: speakersError } = await supabase
          .from('user_favorite_speakers')
          .select(`
            speaker_id,
            sh_speakers (
              id,
              name,
              description,
              field_of_expertise,
              photos
            )
          `)
          .eq('user_id', currentUser.id);

        if (speakersError) throw speakersError;

        const favoriteSpeakers = speakers?.map(item => item.sh_speakers).filter(Boolean) as FavoriteSpeaker[] || [];
        setFavoriteSpeakersData(favoriteSpeakers);

        // Загружаем избранные мероприятия
        const { data: events, error: eventsError } = await supabase
          .from('user_favorite_events')
          .select(`
            event_id,
            events:event_id (
              id,
              title,
              description,
              start_at,
              location,
              bg_image,
              event_type
            )
          `)
          .eq('user_id', currentUser.id);

        if (eventsError) throw eventsError;

        const favoriteEvents = events?.map(item => item.events).filter(Boolean) as FavoriteEvent[] || [];
        setFavoriteEventsData(favoriteEvents);

      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast.error('Ошибка при загрузке избранного');
      } finally {
        setLoadingFavorites(false);
      }
    };

    fetchFavorites();
  }, [currentUser]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, name: formData.name } : null);
      setEditMode(false);
      toast.success('Профиль обновлен');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Ошибка при обновлении профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: avatarUrl })
        .eq('id', profile.id);

      if (error)