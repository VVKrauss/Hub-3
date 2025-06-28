import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { Plus, X, ArrowUp, ArrowDown, Edit, Trash2, Image as ImageIcon, Save, Eye, Home, Clock, Users, Check, Calendar, Upload } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type HeaderStyle = 'centered' | 'slideshow';
type Slide = {
  id: string;
  image: string;
  title: string;
  subtitle: string; 
};

type HeaderData = {
  style: HeaderStyle;
  centered: {
    title: string;
    subtitle: string;
    logoLight: string;
    logoDark: string;
  };
  slideshow: {
    slides: Slide[];
    settings: {
      autoplaySpeed: number;
      transition: 'fade' | 'slide';
    };
  };
};

type InfoSection = {
  enabled: boolean;
  title: string;
  description: string;
  image: string;
  order: number;
};

type RentSection = {
  enabled: boolean;
  title: string;
  description: string;
  image: string;
  order: number;
};

type CoworkingSection = {
  enabled: boolean;
  title: string;
  description: string;
  image: string;
  order: number;
};

type HomepageEventsSettings = {
  events_count: number;
  show_title: boolean;
  show_date: boolean;
  show_time: boolean;
  show_language: boolean;
  show_type: boolean;
  show_age: boolean;
  show_image: boolean;
  show_price: boolean;
};

const defaultHeaderData: HeaderData = {
  style: 'centered',
  centered: {
    title: 'ScienceHub',
    subtitle: 'Место для научного сообщества',
    logoLight: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_science_hub%20no_title.png',
    logoDark: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_white_science_hub%20no_title.png'
  },
  slideshow: {
    slides: [],
    settings: {
      autoplaySpeed: 5000,
      transition: 'fade'
    }
  }
};

const defaultInfoSection: InfoSection = {
  enabled: true,
  title: 'Добро пожаловать в ScienceHub',
  description: 'Мы создаем уникальное пространство для науки, образования и инноваций. Присоединяйтесь к нашему сообществу исследователей, предпринимателей и энтузиастов.',
  image: 'https://wummwcsqsznyyaajcxww.supabase.co/storage/v1/object/public/images/logo/logo_science_hub%20no_title.png',
  order: 1
};

const defaultRentSection: RentSection = {
  enabled: true,
  title: 'Аренда помещений',
  description: 'Предоставляем в аренду современные помещения для проведения мероприятий, конференций и лабораторных исследований.',
  image: 'https://example.com/rent-image.jpg',
  order: 2
};

const defaultCoworkingSection: CoworkingSection = {
  enabled: true,
  title: 'Коворкинг пространство',
  description: 'Комфортные рабочие места для исследователей и стартапов с доступом ко всей инфраструктуре ScienceHub.',
  image: 'https://example.com/coworking-image.jpg',
  order: 3
};

const defaultEventsSettings: HomepageEventsSettings = {
  events_count: 3,
  show_title: true,
  show_date: true,
  show_time: true,
  show_language: true,
  show_type: true,
  show_age: true,
  show_image: true,
  show_price: true
};

const AdminHomeHeader = () => {
  const [siteSettingsId, setSiteSettingsId] = useState<string | null>(null);
  const [headerData, setHeaderData] = useState<HeaderData>(defaultHeaderData);
  const [infoSection, setInfoSection] = useState<InfoSection>(defaultInfoSection);
  const [rentSection, setRentSection] = useState<RentSection>(defaultRentSection);
  const [coworkingSection, setCoworkingSection] = useState<CoworkingSection>(defaultCoworkingSection);
  const [eventsSettings, setEventsSettings] = useState<HomepageEventsSettings>(defaultEventsSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [currentUploadType, setCurrentUploadType] = useState<'slide' | 'info' | 'rent' | 'coworking'>('slide');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('site_settings')
            .insert([{
              header_settings: defaultHeaderData,
              info_section: defaultInfoSection,
              rent_selection: defaultRentSection,
              coworking_selection: defaultCoworkingSection,
              homepage_settings: defaultEventsSettings
            }])
            .select()
            .single();

          if (createError) throw createError;
          
          if (newSettings) {
            setSiteSettingsId(newSettings.id);
            return;
          }
        }
        throw error;
      }

      if (data) {
        setSiteSettingsId(data.id);
        if (data.header_settings) {
          setHeaderData({
            ...defaultHeaderData,
            ...data.header_settings,
            slideshow: {
              ...defaultHeaderData.slideshow,
              ...data.header_settings.slideshow,
              settings: {
                ...defaultHeaderData.slideshow.settings,
                ...data.header_settings.slideshow?.settings
              }
            }
          });
        }
        if (data.info_section) {
          setInfoSection({
            ...defaultInfoSection,
            ...data.info_section
          });
        }
        if (data.rent_selection) {
          setRentSection({
            ...defaultRentSection,
            ...data.rent_selection
          });
        }
        if (data.coworking_selection) {
          setCoworkingSection({
            ...defaultCoworkingSection,
            ...data.coworking_selection
          });
        }
        if (data.homepage_settings) {
          setEventsSettings({
            ...defaultEventsSettings,
            ...data.homepage_settings
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  // Функция сжатия изображения
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Рассчитываем новые размеры с сохранением пропорций
          let width = img.width;
          let height = img.height;
          
          if (width > 1000) {
            const ratio = 1000 / width;
            width = 1000;
            height = height * ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Сначала пробуем качество 0.7
            canvas.toBlob((blob) => {
              if (blob && blob.size > 1000000) {
                // Если размер больше 1MB, уменьшаем качество
                canvas.toBlob((smallerBlob) => {
                  if (smallerBlob) {
                    const compressedFile = new File([smallerBlob], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now()
                    });
                    resolve(compressedFile);
                  } else {
                    resolve(file); // fallback
                  }
                }, 'image/jpeg', 0.5);
              } else if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                resolve(file); // fallback
              }
            }, 'image/jpeg', 0.7);
          } else {
            resolve(file); // fallback
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  // Функция загрузки изображения
  const handleImageUpload = async (file: File, type: 'slide' | 'info' | 'rent' | 'coworking') => {
    try {
      setCurrentUploadType(type);
      
      // Сжимаем изображение перед загрузкой
      const compressedFile = await compressImage(file);
      
      // Загружаем сжатое изображение
      await uploadAndSetImage(compressedFile, type);
      
      toast.success('Изображение успешно загружено и сжато');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    }
  };

  // Функция загрузки и установки изображения
  const uploadAndSetImage = async (file: File, type: 'slide' | 'info' | 'rent' | 'coworking') => {
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${timestamp}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${filePath}`;

      if (type === 'slide') {
        setHeaderData(prev => ({
          ...prev,
          slideshow: {
            ...prev.slideshow,
            slides: [
              ...prev.slideshow.slides,
              {
                id: crypto.randomUUID(),
                image: imageUrl,
                title: 'Новый слайд',
                subtitle: 'Описание слайда'
              }
            ]
          }
        }));
      } else if (type === 'info') {
        setInfoSection(prev => ({
          ...prev,
          image: imageUrl
        }));
      } else if (type === 'rent') {
        setRentSection(prev => ({
          ...prev,
          image: imageUrl
        }));
      } else if (type === 'coworking') {
        setCoworkingSection(prev => ({
          ...prev,
          image: imageUrl
        }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!siteSettingsId) {
      toast.error('ID настроек не найден');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('site_settings')
        .update({
          header_settings: headerData,
          info_section: infoSection,
          rent_selection: rentSection,
          coworking_selection: coworkingSection,
          homepage_settings: eventsSettings
        })
        .eq('id', siteSettingsId);

      if (error) throw error;
      
      toast.success('Настройки сохранены успешно');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      image: '',
      title: '',
      subtitle: ''
    };

    setHeaderData(prev => ({
      ...prev,
      slideshow: {
        ...prev.slideshow,
        slides: [...prev.slideshow.slides, newSlide]
      }
    }));
  };

  const moveSlide = (slideId: string, direction: 'up' | 'down') => {
    const slides = [...headerData.slideshow.slides];
    const index = slides.findIndex(slide => slide.id === slideId);
    
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;

    const [slide] = slides.splice(index, 1);
    slides.splice(newIndex, 0, slide);

    setHeaderData(prev => ({
      ...prev,
      slideshow: {
        ...prev.slideshow,
        slides
      }
    }));
  };

  const deleteSlide = (slideId: string) => {
    setHeaderData(prev => ({
      ...prev,
      slideshow: {
        ...prev.slideshow,
        slides: prev.slideshow.slides.filter(slide => slide.id !== slideId)
      }
    }));
  };

  