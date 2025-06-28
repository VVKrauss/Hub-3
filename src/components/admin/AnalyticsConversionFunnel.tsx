import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface EventRegistration {
  eventId: string;
  eventTitle: string;
  adultRegistrations: number;
  childRegistrations: number;
  totalRegistrations: number;
  maxCapacity: number;
  paymentLinkClicks: number;
  conversionRate: number;
  revenue: number;
}

interface AnalyticsConversionFunnelProps {
  events: EventRegistration[];
  height?: number;
}

const AnalyticsConversionFunnel = ({ events, height = 300 }: AnalyticsConversionFunnelProps) => {
  const totalViews = events.reduce((sum, event) => sum + event.paymentLinkClicks * 3, 0);
  const totalClicks = events.reduce((sum, event) => sum + event.paymentLinkClicks, 0);
  const totalRegistrations = events.reduce((sum, event) => sum + event.totalRegistrations, 0);
  
  const data = [
    { name: 'Просмотры', value: totalViews },
    { name: 'Клики по оплате', value: totalClicks },
    { name: 'Регистрации', value: totalRegistrations }
  ];
  
  const colors = ['#8884d8', '#82ca9d', '#ffc658'];
  
  // Calculate conversion rates
  const viewsToClicks = Math.round((totalClicks / totalViews) * 100);
  const clicksToRegistrations = Math.round((totalRegistrations / totalClicks) * 100);
  const viewsToRegistrations = Math.round((totalRegistrations / totalViews) * 100);
  
  return (
    <div className="space-y-6">
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [value.toLocaleString(), 'Количество']} />
            <Bar dataKey="value" name="Количество" fill="#8884d8">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
          <h4 className="font-medium text-center mb-2">Просмотры → Клики</h4>
          <p className="text-2xl text-center font-semibold">{viewsToClicks}%</p>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
          <h4 className="font-medium text-center mb-2">Клики → Регистрации</h4>
          <p className="text-2xl text-center font-semibold">{clicksToRegistrations}%</p>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
          <h4 className="font-medium text-center mb-2">Просмотры → Регистрации</h4>
          <p className="text-2xl text-center font-semibold">{viewsToRegistrations}%</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsConversionFunnel;