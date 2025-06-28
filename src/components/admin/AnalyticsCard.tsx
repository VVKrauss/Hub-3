import { ReactNode } from 'react';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: {
    value: string | number;
    percentage: number;
    isPositive: boolean;
  };
  iconBgClass?: string;
}

const AnalyticsCard = ({ 
  title, 
  value, 
  icon, 
  change,
  iconBgClass = "bg-primary-100 dark:bg-primary-900/30"
}: AnalyticsCardProps) => {
  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-3xl font-semibold mt-1">{value}</h3>
        </div>
        <div className={`p-3 ${iconBgClass} rounded-full`}>
          {icon}
        </div>
      </div>
      
      {change && (
        <div className={`mt-2 text-sm ${change.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {change.isPositive ? '+' : '-'}{change.value} ({Math.abs(change.percentage)}%) с прошлого периода
        </div>
      )}
    </div>
  );
};

export default AnalyticsCard;