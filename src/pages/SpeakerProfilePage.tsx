// src/pages/SpeakerProfilePage.tsx
// ОБНОВЛЕНО: теперь использует новые sh_ таблицы

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  ExternalLink,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Github
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteSpeakers } from '../hooks/useFavorites';
import FavoriteButton from '../components/favorites/FavoriteButton';
import { getSpeaker } from '../api/speakers';
import { getEventsBySpeaker } from '../api/events';
import type { SpeakerWithSocials, EventWithDetails } from '../types/database';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../utils/imageUtils';

const SpeakerProfilePage = () => { 
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Функции форматирования
  const formatDate = (dateString: string): string => {
    return formatRussianDate(dateString, 'd MMMM yyyy');
  };

  const formatTime = (dateString: string): string => {
    return formatTimeFromTimestamp(dateString);
  };
  
  // Состояние
  const [speaker, setSpeaker] = useState<SpeakerWithSocials | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithDetails[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Хуки для избранного
  const { 
    toggleFavoriteSpeaker, 
    isFavoriteSpeaker, 
    loading: favLoading 
  } = useFavoriteSpeakers(user?.id);

  useEffect(() => {
    if (id) {
      fetchSpeaker(id);
      fetchSpeakerEvents(id);
    }
  }, [id]);

  const fetchSpeaker = async (speakerId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching speaker:', speakerId);
      
      const result = await getSpeaker(speakerId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error('Спикер не найден');
      }

      console.log('Speaker loaded successfully:', result.data);
      setSpeaker(result.data);

    } catch (err: any) {
      console.error('Error fetching speaker:', err);
      setError(err.message || 'Ошибка при загрузке спикера');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpeakerEvents = async (speakerId: string) => {
    try {
      setEventsLoading(true);

      console.log('Fetching speaker events:', speakerId);
      
      const result = await getEventsBySpeaker(speakerId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        const now = new Date();
        const upcoming = result.data.filter(event => new Date(event.start_at) >= now);
        const past = result.data.filter(event => new Date(event.start_at) < now);
        
        setUpcomingEvents(upcoming);
        setPastEvents(past);
      }

    } catch (err: any) {
      console.error('Error fetching speaker events:', err);
      // Не показываем ошибку для событий, так как это не критично
    } finally {
      setEventsLoading(false);
    }
  };

  // Функция для получения иконки социальной сети
  const getSocialIcon = (platform: string) => {
    const icons = {
      website: Globe,
      linkedin: Linkedin,
      twitter: Twitter,
      instagram: Instagram,
      facebook: Facebook,
      youtube: Youtube,
      github: Github
    };
    const Icon = icons[platform as keyof typeof icons] || ExternalLink;
    return <Icon className="w-5 h-5" />;
  };

  const handleFavoriteClick = () => {
    if (!user) {
      toast.error('Войдите в аккаунт для добавления в избранное');
      return;
    }
    toggleFavoriteSpeaker(speaker!.id);
  };

  // Рендеринг состояний загрузки и ошибок
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Загрузка профиля спикера...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !speaker) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error || 'Спикер не найден'}
            </h1>
            <button
              onClick={() => navigate('/speakers')}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              К списку спикеров
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Кнопка назад */}
        <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => navigate('/speakers')}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              К списку спикеров
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Основная информация */}
            <div className="lg:col-span-2 space-y-8">
              {/* Профиль спикера */}
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
                  {/* Фото спикера */}
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                    <div 
                      className="w-32 h-32 relative"
                      style={{ 
                        clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                        shapeRendering: 'geometricPrecision'
                      }}
                    >
                      {speaker.avatar_url ? (
                        <img
                          src={getSupabaseImageUrl(speaker.avatar_url)}
                          alt={speaker.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                          <User className="w-16 h-16 text-primary-400 dark:text-primary-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Информация о спикере */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                          {speaker.name}
                        </h1>
                        
                        {speaker.field_of_expertise && (
                          <p className="text-xl text-primary-600 dark:text-primary-400 font-medium mb-4">
                            {speaker.field_of_expertise}
                          </p>
                        )}
                      </div>

                      {/* Кнопки действий */}
                      <div className="flex items-center space-x-3">
                        {user && (
                          <FavoriteButton
                            isFavorite={isFavoriteSpeaker(speaker.id)}
                            onClick={handleFavoriteClick}
                            loading={favLoading}
                            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                          />
                        )}
                      </div>
                    </div>

                    {/* Статус */}
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        speaker.status === 'active' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : speaker.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {speaker.status === 'active' ? 'Активный спикер' :
                         speaker.status === 'pending' ? 'На рассмотрении' :
                         speaker.status === 'inactive' ? 'Неактивный' : speaker.status}
                      </span>
                      
                      {speaker.is_featured && (
                        <span className="inline-flex items-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-medium ml-2">
                          ⭐ Рекомендуемый
                        </span>
                      )}
                    </div>

                    {/* Социальные ссылки */}
                    {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        {speaker.sh_speaker_social_links
                          .filter(link => link.is_public)
                          .map((social) => (
                            <a
                              key={social.id}
                              href={social.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title={social.display_name || social.platform}
                            >
                              {getSocialIcon(social.platform)}
                              <span className="ml-2 capitalize">
                                {social.display_name || social.platform}
                              </span>
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Биография */}
              {speaker.bio && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    О спикере
                  </h2>
                  <div 
                    className="prose prose-gray dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: speaker.bio }}
                  />
                </div>
              )}

              {/* Предстоящие мероприятия */}
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Предстоящие мероприятия
                </h2>
                
                {eventsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upcomingEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        compact={true}
                        showFavoriteButton={false}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Нет запланированных мероприятий
                  </p>
                )}
              </div>

              {/* Прошедшие мероприятия */}
              {pastEvents.length > 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Прошедшие мероприятия
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pastEvents.slice(0, 4).map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        compact={true}
                        showFavoriteButton={false}
                      />
                    ))}
                  </div>
                  
                  {pastEvents.length > 4 && (
                    <div className="mt-6 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        И еще {pastEvents.length - 4} мероприятий
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Боковая панель */}
            <div className="space-y-6">
              {/* Статистика */}
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Статистика
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Всего мероприятий:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {upcomingEvents.length + pastEvents.length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Предстоящих:</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {upcomingEvents.length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Завершенных:</span>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">
                      {pastEvents.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Контактная информация */}
              {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Контакты
                  </h3>
                  
                  <div className="space-y-3">
                    {speaker.sh_speaker_social_links
                      .filter(link => link.is_public)
                      .map((social) => (
                        <a
                          key={social.id}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                        >
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                            {getSocialIcon(social.platform)}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                              {social.display_name || social.platform}
                            </p>
                            {social.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {social.description}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
                        </a>
                      ))}
                  </div>
                </div>
              )}

              {/* Дополнительная информация */}
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Информация
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Статус:</span>
                    <span className="text-gray-900 dark:text-white">
                      {speaker.status === 'active' ? 'Активный' :
                       speaker.status === 'pending' ? 'На рассмотрении' :
                       speaker.status === 'inactive' ? 'Неактивный' : speaker.status}
                    </span>
                  </div>
                  
                  {speaker.field_of_expertise && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Экспертиза:</span>
                      <span className="text-gray-900 dark:text-white text-right">
                        {speaker.field_of_expertise}
                      </span>
                    </div>
                  )}
                  
                  {speaker.birth_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Дата рождения:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(speaker.birth_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Последние активности */}
              {(upcomingEvents.length > 0 || pastEvents.length > 0) && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Последние активности
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Ближайшее мероприятие */}
                    {upcomingEvents.length > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-1">
                          Ближайшее мероприятие
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {upcomingEvents[0].title}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {formatDate(upcomingEvents[0].start_at)} в {formatTime(upcomingEvents[0].start_at)}
                        </p>
                      </div>
                    )}
                    
                    {/* Последнее прошедшее мероприятие */}
                    {pastEvents.length > 0 && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                          Последнее мероприятие
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {pastEvents[0].title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatDate(pastEvents[0].start_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SpeakerProfilePage;