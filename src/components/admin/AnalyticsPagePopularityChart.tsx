import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface PagePopularity {
  name: string;
  value: number;
}

interface AnalyticsPagePopularityChartProps {
  data: PagePopularity[];
  height?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsPagePopularityChart = ({ data, height = 300 }: AnalyticsPagePopularityChartProps) => {
  const [processedData, setProcessedData] = useState<PagePopularity[]>(data);
  
  useEffect(() => {
    // Fetch event names for event pages
    const fetchEventNames = async () => {
      // Extract event IDs from page names
      const eventPaths = data.filter(item => item.name.startsWith('events/'));
      
      if (eventPaths.length === 0) {
        setProcessedData(data);
        return;
      }
      
      const eventIds = eventPaths.map(item => {
        const match = item.name.match(/^events\/([a-zA-Z0-9-]+)$/);
        return match ? match[1] : null;
      }).filter(id => id !== null) as string[];
      
      try {
        const { data: events, error } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
        
        if (error) throw error;
        
        // Create a map of event IDs to titles
        const eventMap: Record<string, string> = {};
        events?.forEach(event => {
          eventMap[`events/${event.id}`] = `Мероприятие: ${event.title}`;
        });
        
        // Replace event paths with event titles
        const updatedData = data.map(item => {
          if (item.name.startsWith('events/') && eventMap[item.name]) {
            return { ...item, name: eventMap[item.name] };
          }
          
          // Format other page names
          if (item.name === '') return { ...item, name: 'Главная' };
          
          // Capitalize first letter of other pages
          return { 
            ...item, 
            name: item.name.charAt(0).toUpperCase() + item.name.slice(1)
          };
        });
        
        setProcessedData(updatedData);
      } catch (error) {
        console.error('Error fetching event names:', error);
        setProcessedData(data);
      }
    };
    
    fetchEventNames();
  }, [data]);
  
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}%`, 'Доля посещений']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsPagePopularityChart;