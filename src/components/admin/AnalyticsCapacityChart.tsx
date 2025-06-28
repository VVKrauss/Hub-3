import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList } from 'recharts';

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

interface AnalyticsCapacityChartProps {
  events: EventRegistration[];
  height?: number;
}

const AnalyticsCapacityChart = ({ events, height = 400 }: AnalyticsCapacityChartProps) => {
  // Цвета для графика
  const COLORS = {
    registered: '#4CAF50', // Зеленый для зарегистрированных
    available: '#E0E0E0', // Серый для свободных мест
    text: '#333333'       // Цвет текста
  };

  const data = events.map(event => ({
    name: event.eventTitle.length > 15 ? `${event.eventTitle.substring(0, 15)}...` : event.eventTitle,
    fullName: event.eventTitle,
    current: event.totalRegistrations,
    remaining: event.maxCapacity - event.totalRegistrations,
    percentage: Math.round((event.totalRegistrations / event.maxCapacity) * 100),
    maxCapacity: event.maxCapacity
  }));

  // Кастомный тултип
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p><strong>{data.fullName}</strong></p>
          <p style={{ color: COLORS.registered }}>Зарегистрировано: {data.current}</p>
          <p style={{ color: COLORS.available }}>Свободно: {data.remaining}</p>
          <p>Всего мест: {data.maxCapacity}</p>
          <p>Заполнено: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // Кастомная легенда
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '10px 0',
        gap: '20px'
      }}>
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} style={{ 
            display: 'flex', 
            alignItems: 'center',
            color: COLORS.text
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              backgroundColor: entry.color,
              marginRight: '5px'
            }} />
            <span>{entry.value === 'current' ? 'Зарегистрировано' : 'Свободно'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          barGap={0}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={(value) => `${value}`}
            label={{ 
              value: 'Количество участников', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: COLORS.text }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
          
          <Bar 
            name="current" 
            dataKey="current" 
            stackId="a"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS.registered} />
            ))}
            <LabelList 
              dataKey="current" 
              position="top" 
              formatter={(value: number) => value}
              style={{ fill: COLORS.text, fontSize: 12 }}
            />
          </Bar>
          
          <Bar 
            name="remaining" 
            dataKey="remaining" 
            stackId="a"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS.available} />
            ))}
            <LabelList 
              dataKey="percentage" 
              position="center" 
              formatter={(value: number) => `${value}%`}
              style={{ fill: COLORS.text, fontSize: 12, fontWeight: 'bold' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsCapacityChart;