// src/pages/ProfilePage.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ с правильными запросами к БД
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

// Типы данных
interface Profile {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email: string;
  created_at: string;
}

interface FavoriteSpeaker {
  id: string;
  name: string;
  description?: string;
  field_of_expertise?: string;
  photos?: { url: string; isMain?: boolean }[];
}

interface FavoriteEvent {
  id: string;
  title: string;
  description?: string;
  start_at?: string;
  location?: string;
  bg_image?: string;
  event_type?: string;
}

type TabType = 'favorites' | 'comments' | 'history';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  
  // Основное состояние
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
  });
  
  // Состояние табов
  const [activeTab, setActiveTab] = useState<TabType>('favorites');
  
  // Хуки для избранного
  const { toggleFavoriteSpeaker, isFavoriteSpeaker } = useFavoriteSpeakers(currentUser?.id);
  const { toggleFavoriteEvent, isFavoriteEvent } = useFavoriteEvents(currentUser?.id);
  const [favoriteSpeakersData, setFavoriteSpeakersData] = useState<FavoriteSpeaker[]>([]);
  const [favoriteEventsData, setFavoriteEventsData] = useState<FavoriteEvent[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Защита от неавторизованного доступа
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/');
    }
  }, [currentUser, authLoading, navigate]);

  // Загрузка профиля пользователя
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
          // Создаем новый профиль если его нет
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
            setFormData({ name: newProfile.name || '' });
          } catch (insertError) {
            console.error('Error creating profile:', insertError);
            // Fallback профиль
            const fallbackProfile = {
              id: currentUser.id,
              name: currentUser.name || '',
              email: currentUser.email || '',
              role: 'User',
              created_at: new Date().toISOString()
            };
            setProfile(fallbackProfile);
            setFormData({ name: fallbackProfile.name });
          }
        } else {
          setProfile(profileData);
          setFormData({ name: profileData.name || '' });
        }
        
      } catch (error) {
        console.error('Profile fetch error:', error);
        toast.error('Ошибка при загрузке профиля');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  // ИСПРАВЛЕННАЯ загрузка избранных данных
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!currentUser) return;
      
      setLoadingFavorites(true);
      try {
        // Проверяем какие таблицы существуют и используем правильные имена
        const [speakersResult, eventsResult] = await Promise.all([
          // Пробуем сначала speakers, потом sh_speakers
          supabase
            .from('user_favorite_speakers')
            .select(`
              speaker_id,
              speakers (
                id,
                name,
                description,
                field_of_expertise,
                photos
              )
            `)
            .eq('user_id', currentUser.id)
            .then(result => {
              if (result.error && result.error.message.includes('speakers')) {
                // Если speakers не работает, пробуем sh_speakers через прямой запрос
                return supabase
                  .from('user_favorite_speakers')
                  .select('speaker_id')
                  .eq('user_id', currentUser.id)
                  .then(async (favResult) => {
                    if (favResult.error) return favResult;
                    if (!favResult.data || favResult.data.length === 0) {
                      return { data: [], error: null };
                    }
                    
                    // Получаем спикеров отдельно
                    const speakerIds = favResult.data.map(item => item.speaker_id);
                    const speakersData = await supabase
                      .from('sh_speakers')
                      .select('id, name, description, field_of_expertise, photos')
                      .in('id', speakerIds);
                    
                    if (speakersData.error) return speakersData;
                    
                    return {
                      data: speakersData.data?.map(speaker => ({ speakers: speaker })) || [],
                      error: null
                    };
                  });
              }
              return result;
            }),
          
          // Для событий используем events
          supabase
            .from('user_favorite_events')
            .select(`
              event_id,
              events (
                id,
                title,
                description,
                start_at,
                location,
                bg_image,
                event_type
              )
            `)
            .eq('user_id', currentUser.id)
        ]);

        // Обработка спикеров
        if (speakersResult.error) {
          console.error('Error fetching favorite speakers:', speakersResult.error);
        } else {
          const favoriteSpeakers = speakersResult.data?.map(item => item.speakers).filter(Boolean) as FavoriteSpeaker[] || [];
          setFavoriteSpeakersData(favoriteSpeakers);
        }

        // Обработка событий
        if (eventsResult.error) {
          console.error('Error fetching favorite events:', eventsResult.error);
        } else {
          const favoriteEvents = eventsResult.data?.map(item => item.events).filter(Boolean) as FavoriteEvent[] || [];
          setFavoriteEventsData(favoriteEvents);
        }

      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast.error('Ошибка при загрузке избранного');
      } finally {
        setLoadingFavorites(false);
      }
    };

    fetchFavorites();
  }, [currentUser]);

  // Обработчики
  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: formData.name.trim() })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, name: formData.name.trim() } : null);
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

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, avatar: avatarUrl } : null);
      setShowAvatarSelector(false);
      toast.success('Аватар обновлен');
    } catch (error) {
      console.error('Avatar update error:', error);
      toast.error('Ошибка при обновлении аватара');
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setFormData({ name: profile?.name || '' });
  };

  // Состояния загрузки
  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!currentUser || !profile) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Профиль не найден
            </h2>
            <Link
              to="/"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Вернуться на главную
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Заголовок профиля */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden mb-8">
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                {/* Левая часть - аватар и основная информация */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Аватар */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-dark-600 shadow-lg">
                      {profile.avatar ? (
                        <img
                          src={getSupabaseImageUrl(profile.avatar)}
                          alt={profile.name || profile.email}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAvatarSelector(true)}
                      className="absolute bottom-2 right-2 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition-colors"
                      title="Изменить аватар"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Информация о пользователе */}
                  <div className="flex-1 text-center sm:text-left">
                    {editMode ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ name: e.target.value })}
                          className="text-3xl font-bold bg-transparent border-b-2 border-primary-500 focus:outline-none focus:border-primary-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-center sm:text-left"
                          placeholder="Ваше имя"
                          maxLength={100}
                        />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleSave}
                            disabled={saving || !formData.name.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Сохранение...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Сохранить
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center justify-center gap-2 px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                          {profile.name || profile.email?.split('@')[0] || 'Пользователь'}
                        </h1>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="h-4 w-4" />
                            <span className="text-sm">{profile.email || currentUser.email}</span>
                          </div>
                          
                          {profile.role && profile.role !== 'User' && (
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                                {profile.role === 'admin' ? 'Администратор' : profile.role}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">
                              Регистрация: {new Date(profile.created_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Правая часть - кнопка редактирования */}
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Редактировать
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Основной контент с табами */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden">
            {/* Навигация по табам */}
            <div className="border-b border-gray-200 dark:border-dark-700">
              <nav className="flex flex-wrap px-6">
                {[
                  { id: 'favorites' as TabType, label: 'Избранное', icon: Heart },
                  { id: 'comments' as TabType, label: 'Комментарии', icon: MessageCircle },
                  { id: 'history' as TabType, label: 'История', icon: History }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Контент табов */}
            <div className="p-6">
              {/* Вкладка "Избранное" */}
              {activeTab === 'favorites' && (
                <div className="space-y-8">
                  {/* Избранные спикеры */}
                  <section>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <Heart className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Избранные спикеры
                        </h2>
                        <span className="bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                          {favoriteSpeakersData.length}
                        </span>
                      </div>
                      <Link 
                        to="/speakers"
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium transition-colors"
                      >
                        Все спикеры
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                    
                    {loadingFavorites ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse bg-gray-200 dark:bg-dark-700 h-24 rounded-lg"></div>
                        ))}
                      </div>
                    ) : favoriteSpeakersData.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {favoriteSpeakersData.map((speaker) => (
                          <div
                            key={speaker.id}
                            className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                                {speaker.photos && speaker.photos.length > 0 ? (
                                  <img
                                    src={speaker.photos.find(p => p.isMain)?.url || speaker.photos[0]?.url}
                                    alt={speaker.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                  {speaker.name}
                                </h3>
                                {speaker.field_of_expertise && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {speaker.field_of_expertise}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => toggleFavoriteSpeaker(speaker.id)}
                                className="text-red-500 hover:text-red-600 transition-colors opacity-70 group-hover:opacity-100"
                                title="Убрать из избранного"
                              >
                                <Heart className="h-5 w-5 fill-current" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Нет избранных спикеров
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Добавьте интересных спикеров в избранное
                        </p>
                        <Link
                          to="/speakers"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          Посмотреть спикеров
                        </Link>
                      </div>
                    )}
                  </section>

                  {/* Избранные мероприятия */}
                  <section>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Избранные мероприятия
                        </h2>
                        <span className="bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                          {favoriteEventsData.length}
                        </span>
                      </div>
                      <Link 
                        to="/events"
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium transition-colors"
                      >
                        Все мероприятия
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                    
                    {loadingFavorites ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="animate-pulse bg-gray-200 dark:bg-dark-700 h-40 rounded-lg"></div>
                        ))}
                      </div>
                    ) : favoriteEventsData.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {favoriteEventsData.map((event) => (
                          <div
                            key={event.id}
                            className="bg-gray-50 dark:bg-dark-700 rounded-lg overflow-hidden hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors group"
                          >
                            {event.bg_image && (
                              <div className="h-32 overflow-hidden">
                                <img
                                  src={getSupabaseImageUrl(event.bg_image)}
                                  alt={event.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
                                    {event.title}
                                  </h3>
                                  
                                  <div className="space-y-1">
                                    {event.start_at && (
                                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <Clock className="h-4 w-4" />
                                        <span>{new Date(event.start_at).toLocaleDateString('ru-RU')}</span>
                                      </div>
                                    )}
                                    
                                    {event.location && (
                                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <MapPin className="h-4 w-4" />
                                        <span className="truncate">{event.location}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {event.event_type && (
                                    <span className="inline-block mt-3 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                                      {event.event_type}
                                    </span>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => toggleFavoriteEvent(event.id)}
                                  className="text-red-500 hover:text-red-600 transition-colors opacity-70 group-hover:opacity-100"
                                  title="Убрать из избранного"
                                >
                                  <Heart className="h-5 w-5 fill-current" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Нет избранных мероприятий
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Добавьте интересные мероприятия в избранное
                        </p>
                        <Link
                          to="/events"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                        >
                          <Calendar className="h-4 w-4" />
                          Посмотреть мероприятия
                        </Link>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* Вкладка "Комментарии" */}
              {activeTab === 'comments' && (
                <UserCommentsTab userId={profile.id} />
              )}

              {/* Вкладка "История" */}
              {activeTab === 'history' && (
                <div className="space-y-8">
                  {/* История регистраций */}
                  <section>
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                        <History className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        История посещений
                      </h2>
                    </div>
                    <UserRegistrationHistory userId={profile.id} />
                  </section>
                  
                  {/* QR-код пользователя */}
                  <section>
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                        <QrCode className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        QR-код профиля
                      </h2>
                    </div>
                    <UserQRCode 
                      userId={profile.id}
                      userName={profile.name || profile.email?.split('@')[0] || 'Пользователь'}
                      userEmail={profile.email || currentUser.email}
                    />
                  </section>
                </div>
              )}
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Настройки и безопасность
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Управляйте своими данными и приватностью
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-lg transition-colors text-sm font-medium opacity-50 cursor-not-allowed"
                  disabled
                >
                  Настройки уведомлений
                </button>
                <button
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-lg transition-colors text-sm font-medium opacity-50 cursor-not-allowed"
                  disabled
                >
                  Экспорт данных
                </button>
              </div>
            </div>
            <div className="mt-4 text-xs text-blue-600 dark:text-blue-400">
              💡 Дополнительные функции будут добавлены в следующих обновлениях
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно выбора аватара */}
      {showAvatarSelector && (
        <AvatarSelector
          currentAvatar={profile?.avatar}
          onAvatarSelect={handleAvatarSelect}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </Layout>
  );
};

export default ProfilePage;