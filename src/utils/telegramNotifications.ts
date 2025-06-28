import { toast } from 'react-hot-toast';

/**
 * Sends a notification to Telegram using the configured bot
 * @param chatId The target Telegram chat ID to send the message to
 * @param message The message to send (supports HTML formatting)
 * @returns Promise that resolves when the message is sent
 */
export const sendTelegramNotification = async (chatId: string, message: string): Promise<boolean> => {
  try {
    const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

    if (!TELEGRAM_BOT_TOKEN || !chatId) {
      console.error('Telegram configuration missing: Bot token or Chat ID not set');
      return false;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram notification failed with status:', response.status, 'Error text:', errorText);
      throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
    }
    
    console.log('Telegram notification sent successfully!');
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
};

/**
 * Sends a notification to Telegram with error handling and user feedback
 * @param message The message to send
 * @param showToast Whether to show success/error toasts
 * @param targetChatId The target Telegram chat ID to send the message to
 */
export const sendTelegramNotificationWithFeedback = async (
  message: string, 
  showToast = false,
  targetChatId: string
): Promise<boolean> => {
  try {
    const success = await sendTelegramNotification(targetChatId, message);
    
    if (success && showToast) {
      toast.success('Уведомление отправлено');
    } else if (!success && showToast) {
      toast.error('Не удалось отправить уведомление');
    }
    
    return success;
  } catch (error) {
    if (showToast) {
      toast.error('Ошибка при отправке уведомления');
    }
    return false;
  }
};