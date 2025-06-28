import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Required environment variables are not set');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramMessage(message: string) {
  try {
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

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

function isEventEnded(event: any): boolean {
  const now = new Date();
  const eventDate = new Date(event.date);
  const [hours, minutes] = event.end_time.split(':').map(Number);
  
  eventDate.setHours(hours, minutes);
  
  return now > eventDate;
}

async function archiveEvents() {
  console.log('Starting event archival process...');

  try {
    // Get active events
    const { data: activeEvents, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active');

    if (fetchError) {
      throw new Error(`Error fetching events: ${fetchError.message}`);
    }

    if (!activeEvents || activeEvents.length === 0) {
      console.log('No active events to process');
      return { processed: 0, total: 0, events: [] };
    }

    console.log(`Found ${activeEvents.length} active events`);

    const processedEvents = [];
    let archivedCount = 0;

    for (const event of activeEvents) {
      if (isEventEnded(event)) {
        console.log(`Archiving event: ${event.title}`);
        
        const { error: updateError } = await supabase
          .from('events')
          .update({ status: 'past' })
          .eq('id', event.id);

        if (updateError) {
          console.error(`Error updating event ${event.id}:`, updateError);
          continue;
        }

        archivedCount++;
        processedEvents.push(event);

        // Send notification
        const message = `
🎫 <b>Мероприятие завершено</b>

📅 Название: ${event.title}
📆 Дата: ${event.date}
⏰ Время: ${event.start_time} - ${event.end_time}
👥 Участников: ${event.current_registration_count || 0}/${event.max_registrations || 'не ограничено'}
📍 Место: ${event.location}

💰 Стоимость: ${event.payment_type === 'free' ? 'Бесплатно' : `${event.price} ${event.currency}`}
✅ Статус: Архивировано
⏱ Время архивации: ${new Date().toISOString()}
`;

        try {
          await sendTelegramMessage(message);
          console.log(`Notification sent for event: ${event.title}`);
        } catch (error) {
          console.error(`Error sending notification for event ${event.id}:`, error);
        }
      }
    }

    console.log(`
Archival process completed:
- Total active events: ${activeEvents.length}
- Events archived: ${archivedCount}
- Events remaining: ${activeEvents.length - archivedCount}
`);

    return {
      processed: archivedCount,
      total: activeEvents.length,
      events: processedEvents,
    };
  } catch (error) {
    console.error('Error in archiveEvents:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method === 'POST') {
    try {
      const result = await archiveEvents();
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Events checked and archived successfully',
          result,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders,
  });
});