import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

const PostersPage = () => {
  const [activeEvents, setActiveEvents] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active events and check every hour
  useEffect(() => {
    const fetchActiveEvents = async () => {
      setIsLoading(true);
      const now = new Date().toISOString();
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          // .lte('start_time', now)
          // .gte('end_time', now)
          .eq('status', 'active');
        
        if (error) throw error;
        
        // Fetch speaker details for each event
        const eventsWithSpeakers = await Promise.all(
          data.map(async (event) => {
            if (event.speakers && event.speakers.length > 0) {
              const { data: speakerData, error: speakerError } = await supabase
                .from('speakers')
                .select('*')
                .in('id', event.speakers);
              
              if (!speakerError) {
                return { ...event, speakerDetails: speakerData };
              }
            }
            return event;
          })
        );
        
        setActiveEvents(eventsWithSpeakers);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching events:', err);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchActiveEvents();
    
    // Set up hourly refresh
    const intervalId = setInterval(fetchActiveEvents, 60 * 60 * 1000);
    
    // Set up slideshow rotation every 10 seconds
    const slideshowInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % Math.max(1, activeEvents.length));
    }, 10000);
    
    return () => {
      clearInterval(intervalId);
      clearInterval(slideshowInterval);
    };
  }, [activeEvents.length]);

  // Handle manual slide navigation
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  if (isLoading) {
    return <div className="loading">Loading events...</div>;
  }

  if (activeEvents.length === 0) {
    return <div className="no-events">No active events at this time.</div>;
  }

  const currentEvent = activeEvents[currentSlide];
  const eventUrl = `${window.location.origin}/event/${currentEvent.id}`;
  const mainSpeaker = currentEvent.speakerDetails?.[0];

  return (
    <div className="posters-container">
      <div className="poster-slide">
        {/* Background image - top half */}
        <div 
          className="poster-bg-image" 
          style={{ 
           backgroundImage: `url(${getSupabaseImageUrl(currentEvent.bg_image)})`,
            height: '50vh'
          }}
        >
          <h1 className="poster-title">{currentEvent.title}</h1>
        </div>
        
        {/* Short description */}
        <p className="poster-description">{currentEvent.short_description}</p>
        
        {/* Speaker block */}
        {mainSpeaker && (
          <div className="speaker-block">
            <div className="speaker-photo-container">
              <div className="hexagon">
                <div 
                  className="hexagon-inner" 
                  style={{ 
                   backgroundImage: `url(${getSupabaseImageUrl(mainSpeaker.photos?.[0]?.url || '')})`,
                  }}
                />
              </div>
            </div>
            <div className="speaker-info">
              <h3 className="speaker-name">{mainSpeaker.name}</h3>
            </div>
          </div>
        )}
        
        {/* QR Code */}
        <div className="qr-container">
          <QRCode 
            value={eventUrl} 
            size={128} 
            bgColor="#ffffff" 
            fgColor="#000000" 
          />
          <p className="qr-text">Scan to learn more</p>
        </div>
        
        {/* Date and time */}
        <div className="event-time">
          <p className="event-date">{currentEvent.date}</p>
          <p className="event-hours">
            {new Date(currentEvent.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
            {new Date(currentEvent.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>
      </div>
      
      {/* Slide indicators */}
      <div className="slide-indicators">
        {activeEvents.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PostersPage;