import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface PageVisit {
  page: string;
  visits: number;
  avgTimeSpent: number;
}

interface AnalyticsPageVisitsTableProps {
  pageVisits: PageVisit[];
}

type SortField = 'page' | 'visits' | 'avgTimeSpent';

const AnalyticsPageVisitsTable = ({ pageVisits }: AnalyticsPageVisitsTableProps) => {
  const [sortField, setSortField] = useState<SortField>('visits');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [eventNames, setEventNames] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Fetch event names for event pages
    const fetchEventNames = async () => {
      // Extract event IDs from page paths
      const eventIds = pageVisits
        .map(visit => {
          const match = visit.page.match(/^\/events\/([a-zA-Z0-9-]+)$/);
          return match ? match[1] : null;
        })
        .filter(id => id !== null) as string[];
      
      if (eventIds.length === 0) return;
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
        
        if (error) throw error;
        
        const nameMap: Record<string, string> = {};
        data?.forEach(event => {
          nameMap[`/events/${event.id}`] = event.title;
        });
        
        setEventNames(nameMap);
      } catch (error) {
        console.error('Error fetching event names:', error);
      }
    };
    
    fetchEventNames();
  }, [pageVisits]);
  
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const sortedPageVisits = [...pageVisits].sort((a, b) => {
    if (sortField === 'page') {
      return sortDirection === 'asc' 
        ? a.page.localeCompare(b.page)
        : b.page.localeCompare(a.page);
    } else if (sortField === 'visits') {
      return sortDirection === 'asc' 
        ? a.visits - b.visits
        : b.visits - a.visits;
    } else {
      return sortDirection === 'asc' 
        ? a.avgTimeSpent - b.avgTimeSpent
        : b.avgTimeSpent - a.avgTimeSpent;
    }
  });
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const formatPageName = (path: string) => {
    // For the home page
    if (path === '/' || path === '') return 'Главная';
    
    // For event pages
    if (path.startsWith('/events/')) {
      const eventName = eventNames[path];
      if (eventName) {
        return (
          <div className="flex items-center">
            <span className="mr-2">Мероприятие: {eventName}</span>
            <Link to={path} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </Link>
          </div>
        );
      }
    }
    
    // For other pages, remove leading slash and capitalize
    return path.replace(/^\//, '').replace(/\/$/, '') || 'Главная';
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
        <thead className="bg-gray-50 dark:bg-dark-700">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('page')}
            >
              <div className="flex items-center">
                <span>Страница</span>
                {sortField === 'page' && (
                  sortDirection === 'asc' 
                    ? <ChevronUp className="ml-1 h-4 w-4" />
                    : <ChevronDown className="ml-1 h-4 w-4" />
                )}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('visits')}
            >
              <div className="flex items-center">
                <span>Посещения</span>
                {sortField === 'visits' && (
                  sortDirection === 'asc' 
                    ? <ChevronUp className="ml-1 h-4 w-4" />
                    : <ChevronDown className="ml-1 h-4 w-4" />
                )}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('avgTimeSpent')}
            >
              <div className="flex items-center">
                <span>Среднее время</span>
                {sortField === 'avgTimeSpent' && (
                  sortDirection === 'asc' 
                    ? <ChevronUp className="ml-1 h-4 w-4" />
                    : <ChevronDown className="ml-1 h-4 w-4" />
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
          {sortedPageVisits.map((page, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-700/50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {formatPageName(page.page)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">{page.visits.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {formatTime(page.avgTimeSpent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnalyticsPageVisitsTable;