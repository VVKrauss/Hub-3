import { format, subDays, parseISO, addDays, isAfter, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

// Types
export interface RegistrationData {
  date: string;
  registrations: number;
  revenue: number;
}

export interface EventRegistration {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  adultRegistrations: number;
  childRegistrations: number;
  totalRegistrations: number;
  maxCapacity: number;
  paymentLinkClicks: number;
  conversionRate: number;
  revenue: number;
  registrationDetails: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    adultTickets: number;
    childTickets: number;
    totalAmount: number;
    status: boolean;
    createdAt: string;
  }>;
}

export interface RentalBooking {
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

export type DateRange = '7days' | '30days' | '90days' | 'custom';
export type ExportFormat = 'csv' | 'xlsx';
export type ExportType = 'all' | 'registrations' | 'rental';

// Fetch registration data from Supabase
export const fetchRegistrationData = async (startDate: string, endDate: string): Promise<RegistrationData[]> => {
  try {
    // Get all events with registrations
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, registrations, registrations_list, date, price, currency')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (eventsError) throw eventsError;
    
    // Process registration data by date
    const registrationsByDate = new Map<string, { registrations: number; revenue: number }>();
    
    events?.forEach(event => {
      const date = event.date;
      
      // Get registrations from either new or legacy structure
      const registrations = event.registrations?.reg_list || event.registrations_list || [];
      
      registrations.forEach((reg: any) => {
        if (reg.status) {
          const regDate = reg.created_at ? reg.created_at.split('T')[0] : date;
          const totalTickets = (reg.adult_tickets || 0) + (reg.child_tickets || 0);
          const revenue = reg.total_amount || 0;
          
          if (!registrationsByDate.has(regDate)) {
            registrationsByDate.set(regDate, { registrations: 0, revenue: 0 });
          }
          
          const current = registrationsByDate.get(regDate)!;
          registrationsByDate.set(regDate, {
            registrations: current.registrations + totalTickets,
            revenue: current.revenue + revenue
          });
        }
      });
    });
    
    // Convert to array and sort by date
    const result: RegistrationData[] = Array.from(registrationsByDate.entries())
      .map(([date, data]) => ({
        date,
        registrations: data.registrations,
        revenue: data.revenue
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return result;
  } catch (error) {
    console.error('Error fetching registration data:', error);
    return [];
  }
};

// Fetch event registrations from Supabase
export const fetchEventRegistrations = async (): Promise<EventRegistration[]> => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, date, start_time, end_time, location, registrations, registrations_list, max_registrations, current_registration_count, payment_link_clicks, price, currency')
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return (events || []).map(event => {
      // Determine if we're using new or legacy structure
      const useNewStructure = !!event.registrations;
      
      // Get registrations list
      const registrations = useNewStructure 
        ? event.registrations?.reg_list || []
        : event.registrations_list || [];
      
      // Get counts
      const adultRegistrations = useNewStructure
        ? event.registrations?.current_adults || 0
        : registrations.reduce((sum: number, reg: any) => 
            sum + (reg.status ? (reg.adult_tickets || 0) : 0), 0);
            
      const childRegistrations = useNewStructure
        ? event.registrations?.current_children || 0
        : registrations.reduce((sum: number, reg: any) => 
            sum + (reg.status ? (reg.child_tickets || 0) : 0), 0);
            
      const totalRegistrations = useNewStructure
        ? event.registrations?.current || 0
        : event.current_registration_count || 0;
        
      const maxCapacity = useNewStructure
        ? event.registrations?.max_regs || 100
        : event.max_registrations || 100;
        
      const revenue = registrations.reduce((sum: number, reg: any) => 
        sum + (reg.status ? (reg.total_amount || 0) : 0), 0);
        
      const paymentLinkClicks = event.payment_link_clicks || 0;
      const conversionRate = paymentLinkClicks > 0 
        ? (totalRegistrations / paymentLinkClicks) * 100 
        : 0;
      
      // Format registration details
      const registrationDetails = registrations.map((reg: any) => ({
        id: reg.id,
        fullName: reg.full_name,
        email: reg.email,
        phone: reg.phone || '',
        adultTickets: reg.adult_tickets || 0,
        childTickets: reg.child_tickets || 0,
        totalAmount: reg.total_amount || 0,
        status: reg.status,
        createdAt: reg.created_at || event.date
      }));
      
      return {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: `${formatTimeFromTimestamp(event.start_time)} - ${formatTimeFromTimestamp(event.end_time)}`,
        eventLocation: event.location,
        adultRegistrations,
        childRegistrations,
        totalRegistrations,
        maxCapacity,
        paymentLinkClicks,
        conversionRate,
        revenue,
        registrationDetails
      };
    });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    return [];
  }
};

// Fetch rental bookings from Supabase
export const fetchRentalBookings = async (startDate: string, endDate: string): Promise<RentalBooking[]> => {
  try {
    const { data, error } = await supabase
      .from('time_slots_table')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('slot_details->>type', 'booking')
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(slot => {
      const startTime = slot.start_time.substring(0, 5);
      const endTime = slot.end_time.substring(0, 5);
      
      // Calculate duration in hours
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const durationHours = (endHour - startHour) + (endMinute - startMinute) / 60;
      
      // Calculate revenue (mock data for now)
      const hourlyRate = 1000; // 1000 RUB per hour
      const revenue = durationHours * hourlyRate;
      
      return {
        id: slot.id,
        date: slot.date,
        startTime,
        endTime,
        clientName: slot.slot_details.user_name || 'Неизвестно',
        clientEmail: slot.slot_details.email || 'Неизвестно',
        clientPhone: slot.slot_details.phone,
        durationHours,
        revenue
      };
    });
  } catch (error) {
    console.error('Error fetching rental bookings:', error);
    return [];
  }
};

// Export analytics data
export const exportAnalyticsData = async (
  format: ExportFormat,
  type: ExportType,
  startDate: string,
  endDate: string
): Promise<Blob> => {
  try {
    // Fetch data based on type
    let data: any = {};
    
    if (type === 'all' || type === 'registrations') {
      data.registrations = await fetchRegistrationData(startDate, endDate);
      data.events = await fetchEventRegistrations();
    }
    
    if (type === 'all' || type === 'rental') {
      data.rentalBookings = await fetchRentalBookings(startDate, endDate);
    }
    
    // Convert to CSV or XLSX
    if (format === 'csv') {
      return generateCSV(data, type);
    } else {
      return generateXLSX(data, type);
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    throw error;
  }
};

// Generate CSV file
const generateCSV = (data: any, type: ExportType): Blob => {
  let csvContent = '';
  
  if (type === 'all' || type === 'registrations') {
    csvContent += 'Данные о регистрациях\n';
    csvContent += 'Дата,Регистрации,Выручка\n';
    
    data.registrations.forEach((reg: RegistrationData) => {
      csvContent += `${reg.date},${reg.registrations},${reg.revenue}\n`;
    });
    
    csvContent += '\n';
    
    csvContent += 'Регистрации по мероприятиям\n';
    csvContent += 'Мероприятие,Взрослые,Дети,Всего,Максимум,Заполнено (%),Конверсия (%),Выручка\n';
    
    data.events.forEach((event: EventRegistration) => {
      csvContent += `"${event.eventTitle}",${event.adultRegistrations},${event.childRegistrations},${event.totalRegistrations},${event.maxCapacity},${Math.round((event.totalRegistrations / event.maxCapacity) * 100)},${event.conversionRate.toFixed(1)},${event.revenue}\n`;
    });
  }
  
  if (type === 'all' || type === 'rental') {
    csvContent += 'Данные о бронированиях помещений\n';
    csvContent += 'Дата,Время начала,Время окончания,Клиент,Email,Телефон,Длительность (ч),Выручка\n';
    
    data.rentalBookings.forEach((booking: RentalBooking) => {
      csvContent += `${booking.date},${booking.startTime},${booking.endTime},"${booking.clientName}",${booking.clientEmail},${booking.clientPhone || ''},${booking.durationHours.toFixed(1)},${booking.revenue}\n`;
    });
  }
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

// Generate XLSX file (mock implementation)
const generateXLSX = (data: any, type: ExportType): Blob => {
  // In a real implementation, this would use a library like xlsx
  // For now, we'll just return the same CSV data with a different MIME type
  return generateCSV(data, type);
};

// Helper function to format time from timestamp
const formatTimeFromTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';
  
  try {
    if (timestamp.includes('T')) {
      return format(parseISO(timestamp), 'HH:mm');
    }
    
    // If it's already in HH:MM format
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(timestamp)) {
      return timestamp.substring(0, 5);
    }
    
    return timestamp;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timestamp;
  }
};