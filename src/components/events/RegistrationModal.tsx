import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatRussianDate, formatTimeFromTimestamp } from '../../utils/dateTimeUtils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { syncUserRegistration } from '../../utils/registrationSync';
import Modal from '../ui/Modal';
import { EventRegistrations } from '../../pages/admin/constants';

type RegistrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    start_at: string;
    location: string;
    price: number;
    currency: string;
    payment_type: string;
    payment_link?: string;
    payment_widget_id?: string;
    widget_chooser?: boolean;
    couple_discount?: number;
    child_half_price?: boolean;
    adults_only?: boolean;
    registrations?: EventRegistrations;
  };
};

const RegistrationModal = ({ isOpen, onClose, event }: RegistrationModalProps) => {
  const { user: currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    comment: '',
    adultTickets: 1,
    childTickets: 0,
  });
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<{
    id: string;
    fullName: string;
    email: string;
    adultTickets: number;
    childTickets: number;
    total: number;
  } | null>(null);

  // Заполняем данные пользователя при открытии модального окна
  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || currentUser.name || '',
        contact: prev.contact || currentUser.email || ''
      }));
    }
  }, [isOpen, currentUser]);

  const isFreeOrDonation = event.payment_type === 'free' || event.payment_type === 'donation';
  
  const roundUpToHundred = (num: number) => Math.ceil(num / 100) * 100;

  const calculateTotal = () => {
    if (isFreeOrDonation) return 0;

    let adultTotal = 0;
    let childTotal = 0;

    if (event.couple_discount && formData.adultTickets >= 2) {
      const pairs = Math.floor(formData.adultTickets / 2);
      const single = formData.adultTickets % 2;
      
      const discountedPairPrice = event.price * 2 * (1 - event.couple_discount / 100);
      adultTotal = pairs * roundUpToHundred(discountedPairPrice) + single * event.price;
    } else {
      adultTotal = formData.adultTickets * event.price;
    }

    if (!event.adults_only) {
      const childPrice = event.child_half_price ? event.price / 2 : event.price;
      childTotal = formData.childTickets * childPrice;
    }

    return adultTotal + childTotal;
  };

  const getPriceDetails = () => {
    if (isFreeOrDonation) return null;

    const details = [];
    const totalAdult = formData.adultTickets;
    const totalChild = event.adults_only ? 0 : formData.childTickets;

    if (event.couple_discount && totalAdult >= 2) {
      const pairs = Math.floor(totalAdult / 2);
      const single = totalAdult % 2;
      
      const regularPrice = single * event.price;
      const pairPrice = event.price * 2 * (1 - event.couple_discount / 100);
      const roundedPairPrice = roundUpToHundred(pairPrice);

      details.push(
        <div key="adult" className="flex justify-between">
          <span>
            Взрослые ({totalAdult}×)
            {pairs > 0 && (
              <span className="text-xs text-green-500 dark:text-green-400 ml-1">
                ({pairs}×2 со скидкой {event.couple_discount}%)
              </span>
            )}
          </span>
          <span>
            {pairs > 0 && (
              <span className="text-xs line-through text-gray-500 dark:text-gray-400 mr-1">
                {event.price * 2 * pairs}
              </span>
            )}
            {pairs * roundedPairPrice + regularPrice} {event.currency}
          </span>
        </div>
      );
    } else {
      details.push(
        <div key="adult" className="flex justify-between">
          <span>Взрослые ({totalAdult}×)</span>
          <span>{totalAdult * event.price} {event.currency}</span>
        </div>
      );
    }

    if (!event.adults_only && totalChild > 0) {
      const childPrice = event.child_half_price ? event.price / 2 : event.price;
      details.push(
        <div key="child" className="flex justify-between">
          <span>
            Дети ({totalChild}×)
            {event.child_half_price && (
              <span className="text-xs text-green-500 dark:text-green-400 ml-1">
                (50% скидка)
              </span>
            )}
          </span>
          <span>{childPrice * totalChild} {event.currency}</span>
        </div>
      );
    }

    return details;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const total = calculateTotal();
      const registrationId = crypto.randomUUID();
      
      const registrationData = {
        id: registrationId,
        full_name: formData.name,
        email: formData.contact,
        phone: formData.phone,
        comment: formData.comment,
        adult_tickets: Number(formData.adultTickets),
        child_tickets: Number(event.adults_only ? 0 : formData.childTickets),
        total_amount: Number(total),
        status: true,
        qr_code: registrationId, // Используем ID как QR код
        created_at: new Date().toISOString(),
        payment_link_clicked: false,
      };

      // Call the Edge Function instead of directly updating the database
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            eventId: event.id,
            registrationData
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register for event');
      }

      const result = await response.json();

      // Если пользователь авторизован, синхронизируем регистрацию с таблицей user_event_registrations
      if (currentUser) {
        try {
          await syncUserRegistration(
            currentUser.id,
            event.id,
            registrationData,
            isFreeOrDonation ? 'free' : 'pending'
          );
          console.log('User registration synced successfully');
        } catch (syncError) {
          console.error('Failed to sync user registration:', syncError);
          // Не показываем ошибку пользователю, так как основная регистрация прошла успешно
        }
      }

      setRegistrationDetails({
        id: registrationId,
        fullName: formData.name,
        email: formData.contact,
        adultTickets: formData.adultTickets,
        childTickets: event.adults_only ? 0 : formData.childTickets,
        total,
      });
      
      setRegistrationSuccess(true);
      toast.success('Регистрация успешна!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Ошибка при регистрации: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  // Генерируем опции для выпадающих меню
  const generateOptions = (max: number, start: number = 0) => {
    return Array.from({ length: max - start + 1 }, (_, i) => start + i);
  };

  // Сброс формы при закрытии
  const handleClose = () => {
    setFormData({
      name: '',
      contact: '',
      phone: '',
      comment: '',
      adultTickets: 1,
      childTickets: 0,
    });
    setRegistrationSuccess(false);
    setRegistrationDetails(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={event.title}
      size="md"
    >
      <div className="p-3 space-y-3">
        {registrationSuccess && registrationDetails ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Регистрация успешна!</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <p><strong>Имя:</strong> {registrationDetails.fullName}</p>
                <p><strong>Email:</strong> {registrationDetails.email}</p>
                <p><strong>Билеты:</strong> {registrationDetails.adultTickets} взрослых, {registrationDetails.childTickets} детей</p>
                {registrationDetails.total > 0 && (
                  <p><strong>Сумма:</strong> {registrationDetails.total} {event.currency}</p>
                )}
                <p><strong>ID регистрации:</strong> {registrationDetails.id}</p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="w-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 py-2 px-4 rounded text-sm text-gray-700 dark:text-gray-200"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <>
            {/* Информация о мероприятии */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>{formatRussianDate(event.start_at, 'dd.MM.yyyy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>{formatTimeFromTimestamp(event.start_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="line-clamp-1 max-w-[100px]">{event.location}</span>
              </div>
              {!isFreeOrDonation && (
                <div className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span>{event.price} {event.currency}</span>
                </div>
              )}
            </div>

            {/* Форма регистрации */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Ваше имя"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                required
              />
              
              <input
                type="email"
                placeholder="Email"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                required
              />

              <input
                type="tel"
                placeholder="Телефон"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />

              <textarea
                placeholder="Комментарий"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
              />

              {/* Выбор количества билетов */}
              {!isFreeOrDonation && (
                <div className={`flex gap-2 ${event.adults_only ? 'justify-center' : ''}`}>
                  <div className={event.adults_only ? 'w-full' : 'flex-1'}>
                    <label className="block text-xs font-medium mb-1">Взрослых билетов</label>
                    <select
                      value={formData.adultTickets}
                      onChange={(e) => setFormData({ ...formData, adultTickets: Number(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700"
                    >
                      {generateOptions(10, 1).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  {!event.adults_only && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Детских билетов</label>
                      <select
                        value={formData.childTickets}
                        onChange={(e) => setFormData({ ...formData, childTickets: Number(e.target.value) })}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700"
                      >
                        {generateOptions(10, 0).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Детализация цены */}
              {!isFreeOrDonation && (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
                  <h4 className="font-semibold mb-2">Детализация стоимости:</h4>
                  <div className="space-y-1">
                    {getPriceDetails()}
                    <div className="border-t pt-1 mt-2 font-semibold flex justify-between">
                      <span>Итого:</span>
                      <span>{calculateTotal()} {event.currency}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Кнопки */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 py-2 px-4 rounded text-sm text-gray-700 dark:text-gray-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-2 px-4 rounded text-sm transition-colors"
                >
                  {loading ? '...' : 'Подтвердить'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RegistrationModal;