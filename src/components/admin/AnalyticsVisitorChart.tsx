import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface VisitorData {
  date: string;
  visitors: number;
  uniqueVisitors: number;
}

interface AnalyticsVisitorChartProps {
  data: VisitorData[];
  height?: number;
}

const AnalyticsVisitorChart = ({ data, height = 300 }: AnalyticsVisitorChartProps) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorUniqueVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => {
              return format(parseISO(date), 'dd.MM');
            }}
          />
          <YAxis />
          <Tooltip 
            formatter={(value: number) => [value.toLocaleString(), '']}
            labelFormatter={(date) => format(parseISO(date), 'dd MMMM yyyy', { locale: ru })}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="visitors" 
            name="Все посещения"
            stroke="#8884d8" 
            fillOpacity={1} 
            fill="url(#colorVisitors)" 
          />
          <Area 
            type="monotone" 
            dataKey="uniqueVisitors" 
            name="Уникальные посетители"
            stroke="#82ca9d" 
            fillOpacity={1} 
            fill="url(#colorUniqueVisitors)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsVisitorChart;