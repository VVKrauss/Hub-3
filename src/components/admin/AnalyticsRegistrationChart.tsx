import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface RegistrationData {
  date: string;
  registrations: number;
  revenue: number;
}

interface AnalyticsRegistrationChartProps {
  data: RegistrationData[];
  height?: number;
}

const AnalyticsRegistrationChart = ({ data, height = 300 }: AnalyticsRegistrationChartProps) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => {
              return format(parseISO(date), 'dd.MM');
            }}
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'registrations') return [value.toLocaleString(), 'Регистрации'];
              if (name === 'revenue') return [`${value.toLocaleString()} ₽`, 'Выручка'];
              return [value, name];
            }}
            labelFormatter={(date) => format(parseISO(date), 'dd MMMM yyyy', { locale: ru })}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="registrations" 
            name="Регистрации"
            stroke="#8884d8" 
            activeDot={{ r: 8 }}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="revenue" 
            name="Выручка"
            stroke="#82ca9d" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsRegistrationChart;