import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

// Define types
interface RegistrationData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  comment?: string;
  adult_tickets: number;
  child_tickets: number;
  total_amount: number;
  status: boolean;
  created_at: string;
  payment_link_clicked?: boolean;
}

interface EventRegistrations {
  max_regs: number | null;
  current: number;
  current_adults: number;
  current_children: number;
  reg_list: RegistrationData[];
}

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Create Supabase client with service role key for bypassing RLS
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Send notification to Telegram
async function sendTelegramNotification(message: string) {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram configuration missing');
      return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
    }

    console.log('Telegram notification sent successfully');
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

// Log registration activity for audit purposes
async function logRegistrationActivity(eventId: string, action: string, registrationId: string, userData: any) {
  try {
    const { error } = await supabaseAdmin
      .from('registration_logs')
      .insert([{
        event_id: eventId,
        registration_id: registrationId,
        action,
        user_data: userData,
        timestamp: new Date().toISOString()
      }]);
    
    if (error) {
      console.error('Error logging registration activity:', error);
    }
  } catch (error) {
    console.error('Error logging registration activity:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Parse request body
    const { eventId, registrationData, action = 'create' } = await req.json();
    
    // Validate required fields
    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: eventId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'create' && !registrationData) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: registrationData is required for create action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing ${action} for event:`, eventId);
    if (registrationData) {
      console.log('Registration data:', registrationData);
    }

    // Fetch current event data
    const { data: eventData, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('registrations, registrations_list, max_registrations, current_registration_count, title, date, start_time, location, price, currency')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      console.error('Error fetching event data:', fetchError);
      throw new Error(`Failed to fetch event data: ${fetchError.message}`);
    }

    console.log('Current event data:', eventData);

    // Determine if we're using new or legacy structure
    const useNewStructure = !!eventData.registrations;
    console.log('Using new structure:', useNewStructure);

    // Always use new registrations structure
    let currentRegistrations: EventRegistrations;
    
    if (useNewStructure) {
      currentRegistrations = eventData.registrations;
    } else {
      // Convert from legacy structure
      currentRegistrations = {
        max_regs: eventData.max_registrations || null,
        current: eventData.current_registration_count || 0,
        current_adults: 0,
        current_children: 0,
        reg_list: eventData.registrations_list || []
      };
      
      // Calculate adults and children counts from legacy structure
      if (Array.isArray(currentRegistrations.reg_list)) {
        currentRegistrations.current_adults = currentRegistrations.reg_list.reduce(
          (sum, reg) => sum + (reg.status ? (reg.adult_tickets || 0) : 0), 
          0
        );
        
        currentRegistrations.current_children = currentRegistrations.reg_list.reduce(
          (sum, reg) => sum + (reg.status ? (reg.child_tickets || 0) : 0), 
          0
        );
      }
    }

    console.log('Current registrations structure:', currentRegistrations);

    let updatedRegistrations: EventRegistrations;
    let message = '';

    // Process based on action
    switch (action) {
      case 'create':
        // Add new registration to the list
        updatedRegistrations = {
          ...currentRegistrations,
          reg_list: [...(currentRegistrations.reg_list || []), registrationData]
        };
        
        // Send notification to Telegram
        message = `🎟 <b>Новая регистрация</b>\n\n` +
          `Мероприятие: ${eventData.title}\n` +
          `Дата: ${eventData.date} ${eventData.start_time ? eventData.start_time.substring(0, 5) : ''}\n` +
          `Участник: ${registrationData.full_name}\n` +
          `Email: ${registrationData.email}\n` +
          `Телефон: ${registrationData.phone || 'не указан'}\n` +
          `Комментарий: ${registrationData.comment || 'нет'}\n` +
          `Взрослых: ${registrationData.adult_tickets}\n` +
          `Детей: ${registrationData.child_tickets}\n` +
          `Сумма: ${registrationData.total_amount} ${eventData.currency || ''}\n` +
          `ID: ${registrationData.id}`;
        
        // Log the activity
        await logRegistrationActivity(eventId, 'create', registrationData.id, registrationData);
        break;
        
      case 'update':
        // Update existing registration
        const regList = [...(currentRegistrations.reg_list || [])];
        const updatedRegList = regList.map(reg =>
          reg.id === registrationData.id ? { ...reg, ...registrationData } : reg
        );
        
        updatedRegistrations = {
          ...currentRegistrations,
          reg_list: updatedRegList
        };
        
        // Send notification to Telegram
        message = `🔄 <b>Обновление регистрации</b>\n\n` +
          `Мероприятие: ${eventData.title}\n` +
          `Дата: ${eventData.date} ${eventData.start_time ? eventData.start_time.substring(0, 5) : ''}\n` +
          `Участник: ${registrationData.full_name}\n` +
          `Email: ${registrationData.email}\n` +
          `Статус: ${registrationData.status ? 'Активна' : 'Отменена'}\n` +
          `ID: ${registrationData.id}`;
        
        // Log the activity
        await logRegistrationActivity(eventId, 'update', registrationData.id, registrationData);
        break;
        
      case 'delete':
        // Delete registration
        const filteredRegList = (currentRegistrations.reg_list || []).filter(
          reg => reg.id !== registrationData.id
        );
        
        updatedRegistrations = {
          ...currentRegistrations,
          reg_list: filteredRegList
        };
        
        // Send notification to Telegram
        message = `❌ <b>Удаление регистрации</b>\n\n` +
          `Мероприятие: ${eventData.title}\n` +
          `Дата: ${eventData.date} ${eventData.start_time ? eventData.start_time.substring(0, 5) : ''}\n` +
          `ID регистрации: ${registrationData.id}`;
        
        // Log the activity
        await logRegistrationActivity(eventId, 'delete', registrationData.id, { id: registrationData.id });
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Updated registrations structure:', updatedRegistrations);

    // Update the event with new registrations data
    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({ registrations: updatedRegistrations })
      .eq('id', eventId);

    if (updateError) {
      console.error('Error updating event:', updateError);
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    // Send notification to Telegram
    await sendTelegramNotification(message);

    return new Response(
      JSON.stringify({ 
        success: true,
        action,
        registrationId: registrationData?.id,
        message: `Registration ${action} successful`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing registration:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});