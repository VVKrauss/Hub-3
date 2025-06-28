import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

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

interface AnalyticsRevenueForecastProps {
  events: EventRegistration[];
  height?: number;
}

const AnalyticsRevenueForecast = ({ events, height = 300 }: AnalyticsRevenueForecastProps) => {
  // Calculate potential revenue at different capacity levels
  const calculatePotentialRevenue = (capacityPercentage: number) => {
    return Math.round(events.reduce((sum, event) => {
      const currentPercentage = event.totalRegistrations / event.maxCapacity;
      return sum + (event.revenue / currentPercentage * capacityPercentage);
    }, 0));
  };
  
  const currentRevenue = events.reduce((sum, event) => sum + event.revenue, 0);
  
  const data = [
    { name: '25%', value: calculatePotentialRevenue(0.25) },
    { name: '50%', value: calculatePotentialRevenue(0.5) },
    { name: '75%', value: calculatePotentialRevenue(0.75) },
    { name: '100%', value: calculatePotentialRevenue(1) },
    { name: 'Текущая', value: currentRevenue }
  ];
  
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];
  
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value.toLocaleString()} ₽`, 'Выручка']} />
          <Legend />
          <Bar dataKey="value" name="Выручка" fill="#8884d8">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsRevenueForecast;