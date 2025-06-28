import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface RentalBooking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  durationHours: number;
  revenue: number;
}

interface AnalyticsRentalBookingsChartProps {
  bookings: RentalBooking[];
  height?: number;
  groupBy?: 'date' | 'dayOfWeek' | 'timeOfDay';
}

const AnalyticsRentalBookingsChart = ({ 
  bookings, 
  height = 300,
  groupBy = 'date'
}: AnalyticsRentalBookingsChartProps) => {
  
  // Group bookings by the specified dimension
  const groupedData = bookings.reduce((acc, booking) => {
    let key;
    
    if (groupBy === 'date') {
      // Group by date
      key = booking.date;
    } else if (groupBy === 'dayOfWeek') {
      // Group by day of week
      const date = new Date(booking.date);
      const dayOfWeek = format(date, 'EEEE', { locale: ru });
      key = dayOfWeek;
    } else if (groupBy === 'timeOfDay') {
      // Group by time of day (morning, afternoon, evening)
      const hour = parseInt(booking.startTime.split(':')[0]);
      if (hour < 12) {
        key = 'Утро (до 12:00)';
      } else if (hour < 17) {
        key = 'День (12:00-17:00)';
      } else {
        key = 'Вечер (после 17:00)';
      }
    }
    
    if (!acc[key]) {
      acc[key] = {
        name: key,
        bookings: 0,
        hours: 0,
        revenue: 0
      };
    }
    
    acc[key].bookings += 1;
    acc[key].hours += booking.durationHours;
    acc[key].revenue += booking.revenue;
    
    return acc;
  }, {} as Record<string, { name: string; bookings: number; hours: number; revenue: number }>);
  
  // Convert to array and sort
  let chartData = Object.values(groupedData);
  
  // Sort data based on groupBy
  if (groupBy === 'date') {
    chartData = chartData.sort((a, b) => a.name.localeCompare(b.name));
  } else if (groupBy === 'dayOfWeek') {
    // Sort by day of week order
    const dayOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    chartData = chartData.sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name));
  } else if (groupBy === 'timeOfDay') {
    // Sort by time of day order
    const timeOrder = ['Утро (до 12:00)', 'День (12:00-17:00)', 'Вечер (после 17:00)'];
    chartData = chartData.sort((a, b) => timeOrder.indexOf(a.name) - timeOrder.indexOf(b.name));
  }
  
  // Format X-axis labels
  const formatXAxis = (value: string) => {
    if (groupBy === 'date') {
      try {
        return format(parseISO(value), 'dd.MM');
      } catch (e) {
        return value;
      }
    }
    return value;
  };
  
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tickFormatter={formatXAxis}
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'bookings') return [value.toLocaleString(), 'Бронирований'];
              if (name === 'hours') return [value.toLocaleString(), 'Часов'];
              if (name === 'revenue') return [`${value.toLocaleString()} ₽`, 'Выручка'];
              return [value, name];
            }}
            labelFormatter={(label) => {
              if (groupBy === 'date') {
                try {
                  return format(parseISO(label), 'dd MMMM yyyy', { locale: ru });
                } catch (e) {
                  return label;
                }
              }
              return label;
            }}
          />
          <Legend />
          <Bar 
            yAxisId="left"
            type="monotone" 
            dataKey="bookings" 
            name="Бронирований"
            fill="#8884d8" 
          />
          <Bar 
            yAxisId="left"
            type="monotone" 
            dataKey="hours" 
            name="Часов"
            fill="#82ca9d" 
          />
          <Bar 
            yAxisId="right"
            type="monotone" 
            dataKey="revenue" 
            name="Выручка"
            fill="#ffc658" 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsRentalBookingsChart;