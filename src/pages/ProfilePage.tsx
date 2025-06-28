// src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Mail, Calendar, Edit, Save, X, Shield, Heart, Users, ExternalLink, MapPin, Clock, Camera, History, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteSpeakers, useFavoriteEvents } from '../hooks/useFavorites';
import { getSupabaseImageUrl } from '../utils/imageUtils';
import AvatarSelector from '../components/ui/AvatarSelector';
import UserRegistrationHistory from '../components/profile/UserRegistrationHistory';
import UserQRCode from '../components/profile/UserQRCode';
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
            const newProfile = {
              id: currentUser.id,
              name: currentUser.name || currentUser.email?.split('@')[0] || 'Пользователь',
              role: 'Guest',
              email: currentUser.email,
              avatar: randomAvatarUrl
            };

            const { data: created, error: createError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single();

            if (createError) throw createError;
            setProfile(created);
          } catch (createError) {
            console.error('Error creating profile:', createError);
            // Fallback - создаем профиль без аватара
            const fallbackProfile = {
              id: currentUser.id,
              name: currentUser.name || currentUser.email?.split('@')[0] || 'Пользователь',
              role: 'Guest',
              email: currentUser.email,
              avatar: null
            };

            const { data: created } = await supabase
              .from('profiles')
              .insert(fallbackProfile)
              .select()
              .single();

            setProfile(created);
          }
        } else {
          setProfile(profileData);
        }

        setFormData({
          name: profileData?.name || currentUser.name || currentUser.email?.split('@')[0] || 'Пользователь',
        });
      } catch (error) {
        console.error('Profile fetch error:', error);
        toast.error('Ошибка загрузки профиля');
      } finally {
        setLoading(false);
      }
    };

    const fetchFavorites = async () => {
      if (currentUser) {
        setLoadingFavorites(true);
        await Promise.all([fetchFavoriteSpeakers(), fetchFavoriteEvents()]);
        setLoadingFavorites(false);
      }
    };

    fetchProfile();
    fetchFavorites();
  }, [currentUser]);

  const fetchFavoriteSpeakers = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('user_favorite_speakers')
        .select(`
          speakers (
            id,
            name,
            description,
            field_of_expertise,
            photos
          )
        `)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      
      const speakers = data?.map(item => item.speakers).filter(Boolean) || [];
      setFavoriteSpeakersData(speakers);
    } catch (error) {
      console.error('Error fetching favorite speakers:', error);
    }
  };

  const fetchFavoriteEvents = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('user_favorite_events')
        .select(`
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
        .eq('user_id', currentUser.id);

      if (error) throw error;
      
      const events = data?.map(item => item.events).filter(Boolean) || [];
      setFavoriteEventsData(events);
    } catch (error) {
      console.error('Error fetching favorite events:', error);
    }
  };

  const handleSave = async () => {
    if (!profile || !currentUser) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, name: formData.name } : prev);
      setEditMode(false);
      toast.success('Профиль обновлен');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Ошибка при обновлении профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || currentUser?.name || currentUser?.email?.split('@')[0] || 'Пользователь',
    });
    setEditMode(false);
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: avatarUrl })
        .eq('id', currentUser.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, avatar: avatarUrl } : prev);
      setShowAvatarSelector(false);
      
      toast.success('Аватар обновлен');
      
      // Принудительно обновляем страницу через небольшую задержку
      // чтобы TopBar подхватил новый аватар
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Ошибка при обновлении аватара');
      throw error;
    }
  };

  const removeFavoriteSpeaker = async (speakerId: string) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('user_favorite_speakers')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('speaker_id', speakerId);

      if (error) throw error;
      
      setFavoriteSpeakersData(prev => prev.filter(speaker => speaker.id !== speakerId));
      toast.success('Спикер удален из избранного');
    } catch (error) {
      console.error('Error removing favorite speaker:', error);
      toast.error('Ошибка при удалении спикера');
    }
  };

  const removeFavoriteEvent = async (eventId: string) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('user_favorite_events')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('event_id', eventId);

      if (error) throw error;
      
      setFavoriteEventsData(prev => prev.filter(event => event.id !== eventId));
      toast.success('Мероприятие удалено из избранного');
    } catch (error) {
      console.error('Error removing favorite event:', error);
      toast.error('Ошибка при удалении мероприятия');
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Основная информация профиля */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
              <h1 className="text-2xl font-bold">Мой профиль</h1>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      {profile?.avatar ? (
                        <img 
                          src={getSupabaseImageUrl(profile.avatar)} 
                          alt="Аватар пользователя"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                    <button
                      onClick={() => setShowAvatarSelector(true)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors"
                      title="Изменить аватар"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {profile?.name || 'Пользователь'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditMode(!editMode)}
                  className="btn-outline"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Редактировать
                </button>
              </div>

              {editMode ? (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-2">Имя</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-dark-600 rounded-lg dark:bg-dark-800"
                      placeholder="Введите ваше имя"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary flex-1"
                    >
                      {saving ? (
                        <>Сохраняется...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Сохранить
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="btn-outline flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium">{currentUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Роль</p>
                      <p className="font-medium">{profile?.role || 'Гость'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Дата регистрации</p>
                      <p className="font-medium">
                        {profile?.created_at ? 
                          new Date(profile.created_at).toLocaleDateString('ru-RU') :
                          'Не указано'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR-код пользователя */}
          {profile && (
            <UserQRCode 
              userId={profile.id}
              userName={profile.name || profile.email?.split('@')[0] || 'Пользователь'}
              userEmail={profile.email || currentUser.email}
            />
          )}

          {/* История регистраций */}
          {profile && (
            <UserRegistrationHistory userId={profile.id} />
          )}

          {/* Избранные спикеры */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-lg font-medium">Избранные спикеры</h3>
                  <span className="bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                    {favoriteSpeakersData.length}
                  </span>
                </div>
                <Link 
                  to="/speakers"
                  className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                >
                  Все спикеры
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {loadingFavorites ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 dark:bg-dark-700 h-20 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : favoriteSpeakersData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteSpeakersData.map((speaker) => (
                    <div 
                      key={speaker.id}
                      className="group bg-gray-50 dark:bg-dark-700 rounded-lg p-4 hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-dark-600"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
                            {speaker.photos && speaker.photos.length > 0 ? (
                              <img
                                src={getSupabaseImageUrl(speaker.photos.find(p => p.isMain)?.url || speaker.photos[0].url)}
                                alt={speaker.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                              {speaker.name}
                            </h4>
                            {speaker.field_of_expertise && (
                              <p className="text-sm text-primary-600 dark:text-primary-400 mt-1 line-clamp-2 font-medium">
                                {speaker.field_of_expertise}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Кнопка удаления */}
                        <button
                          onClick={() => removeFavoriteSpeaker(speaker.id)}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
                          title="Удалить из избранного"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Ссылка на профиль */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        <Link 
                          to={`/speakers/${speaker.id}`}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm flex items-center gap-1 transition-colors font-medium"
                        >
                          Посмотреть профиль
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>У вас пока нет любимых спикеров</p>
                  <p className="text-sm mt-1">Добавьте спикеров в избранное на странице спикеров</p>
                </div>
              )}
            </div>
          </div>

          {/* Избранные мероприятия */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-lg font-medium">Избранные мероприятия</h3>
                  <span className="bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                    {favoriteEventsData.length}
                  </span>
                </div>
                <Link 
                  to="/events"
                  className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                >
                  Все мероприятия
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {favoriteEventsData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favoriteEventsData.map((event) => (
                    <div 
                      key={event.id}
                      className="group bg-gray-50 dark:bg-dark-700 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-dark-600"
                    >
                      {/* Изображение */}
                      {event.bg_image && (
                        <div className="h-32 bg-gray-200 dark:bg-dark-600">
                          <img
                            src={getSupabaseImageUrl(event.bg_image)}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                            <Link to={`/events/${event.id}`}>
                              {event.title}
                            </Link>
                          </h4>
                          
                          <button
                            onClick={() => removeFavoriteEvent(event.id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 opacity-0 group-hover:opacity-100 ml-2"
                            title="Удалить из избранного"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                          {event.start_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(event.start_at).toLocaleDateString('ru-RU')}</span>
                            </div>
                          )}
                          
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span className="line-clamp-1">{event.location}</span>
                            </div>
                          )}
                          
                          {event.event_type && (
                            <span className="inline-block bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 px-2 py-1 rounded text-xs">
                              {event.event_type}
                            </span>
                          )}
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>У вас пока нет любимых мероприятий</p>
                  <p className="text-sm mt-1">Добавьте мероприятия в избранное на странице событий</p>
                </div>
              )}
            </div>
          </div>

          {/* Заглушка для будущих секций */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Дополнительные функции</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  🚧 <strong>В разработке:</strong> Статистика активности и настройки уведомлений будут добавлены в следующих обновлениях.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Selector Modal */}
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