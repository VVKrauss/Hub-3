import { Link } from 'react-router-dom';
import { Calendar, Users, Globe, Tag } from 'lucide-react';
import { formatRussianDate } from '../../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type Event = {
  id: number;
  title: string;
  date: string;
  time?: string;
  location?: string;
  bg_image: string;
  age_category: string;
  languages: string[];
  event_type: string;
  start_time: string;
  end_time: string;
};

type CompactEventsListProps = {
  events: Event[];
};

const CompactEventsList = ({ events }: CompactEventsListProps) => {
  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-4">
        <h3 className="text-lg font-medium mb-4">Ближайшие мероприятия</h3>
        <p className="text-dark-500 dark:text-dark-400 text-center py-4">
          Нет предстоящих мероприятий
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-medium mb-4">Ближайшие мероприятия</h3>
      <div className="space-y-4">
        {events.map(event => (
          <Link 
            key={event.id} 
            to={`/events/${event.id}`}
            className="block hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg overflow-hidden"
          >
            <div 
              className="h-32 bg-cover bg-center"
              style={{ backgroundImage: `url(${getSupabaseImageUrl(event.bg_image)})` }}
            ></div>
            <div className="p-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2 text-center min-w-[3rem]">
                  <span className="block text-xl font-bold text-primary-600 dark:text-primary-400">
                    {formatRussianDate(event.date, 'd')}
                  </span>
                  <span className="block text-xs text-primary-600 dark:text-primary-400 capitalize">
                    {formatRussianDate(event.date, 'LLL')}
                  </span>
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium line-clamp-2 mb-2">{event.title}</h4>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {event.age_category}
                    </span>
                    {event.languages.map((lang, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs"
                      >
                        <Globe className="w-3 h-3 mr-1" />
                        {lang}
                      </span>
                    ))}
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {event.event_type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link 
        to="/events" 
        className="block text-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium mt-4 pt-4 border-t border-gray-200 dark:border-dark-700"
      >
        Все мероприятия
      </Link>
    </div>
  );
};

export default CompactEventsList;