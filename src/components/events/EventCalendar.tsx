import { Calendar as CalendarIcon } from 'lucide-react';

const EventCalendar = () => {
  // In a real application, this would be a proper calendar component
  // For now, we'll just show a placeholder
  
  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <CalendarIcon className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
        Календарь мероприятий
      </h3>
      <div className="border dark:border-dark-700 rounded-md p-4 text-center">
        <div className="text-dark-500 dark:text-dark-400 flex flex-col items-center">
          <CalendarIcon className="w-16 h-16 mb-3 opacity-30" />
          <p>Календарь будет доступен в полной версии приложения</p>
        </div>
      </div>
    </div>
  );
};

export default EventCalendar;