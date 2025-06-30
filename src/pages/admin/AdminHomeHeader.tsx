import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { Plus, ArrowUp, ArrowDown, Edit, Trash2, Image as ImageIcon, Save, Home, Calendar, Upload, Users } from 'lucide-react';

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
  image: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_science_hub%20no_title.png',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

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
            
            canvas.toBlob((blob) => {
              if (blob && blob.size > 1000000) {
                canvas.toBlob((smallerBlob) => {
                  if (smallerBlob) {
                    const compressedFile = new File([smallerBlob], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now()
                    });
                    resolve(compressedFile);
                  } else {
                    resolve(file);
                  }
                }, 'image/jpeg', 0.5);
              } else if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            }, 'image/jpeg', 0.7);
          } else {
            resolve(file);
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  // Функция загрузки изображения
  const handleImageUpload = async (file: File, type: 'slide' | 'info' | 'rent' | 'coworking' | 'logo-light' | 'logo-dark') => {
    try {
      const compressedFile = await compressImage(file);
      await uploadAndSetImage(compressedFile, type);
      toast.success('Изображение успешно загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    }
  };

  // Функция загрузки и установки изображения
  const uploadAndSetImage = async (file: File, type: 'slide' | 'info' | 'rent' | 'coworking' | 'logo-light' | 'logo-dark') => {
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
      } else if (type === 'logo-light') {
        setHeaderData(prev => ({
          ...prev,
          centered: { ...prev.centered, logoLight: imageUrl }
        }));
      } else if (type === 'logo-dark') {
        setHeaderData(prev => ({
          ...prev,
          centered: { ...prev.centered, logoDark: imageUrl }
        }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 dark:bg-dark-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Управление главным экраном</h1>
            <p className="text-dark-600 dark:text-dark-400 mt-1">
              Настройте заголовок, слайдшоу и информационные разделы
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>

        {/* Header Style Selection */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-6">Стиль шапки</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setHeaderData(prev => ({ ...prev, style: 'centered' }))}
              className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 flex flex-col items-center transition-colors ${
                headerData.style === 'centered'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-dark-200 dark:border-dark-600 hover:border-dark-300 dark:hover:border-dark-500'
              }`}
            >
              <div className="w-16 h-16 bg-dark-100 dark:bg-dark-700 rounded-full mb-3 flex items-center justify-center">
                <Home className="w-8 h-8 text-dark-500" />
              </div>
              <span className="font-medium">Центрированный логотип</span>
            </button>
            <button
              onClick={() => setHeaderData(prev => ({ ...prev, style: 'slideshow' }))}
              className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 flex flex-col items-center transition-colors ${
                headerData.style === 'slideshow'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-dark-200 dark:border-dark-600 hover:border-dark-300 dark:hover:border-dark-500'
              }`}
            >
              <div className="w-16 h-16 bg-dark-100 dark:bg-dark-700 rounded-lg mb-3 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-dark-500" />
              </div>
              <span className="font-medium">Слайдшоу</span>
            </button>
          </div>
        </div>

        {/* Centered Header Settings */}
        {headerData.style === 'centered' && (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-6">Настройки центрированного стиля</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Заголовок
                </label>
                <input
                  type="text"
                  id="title"
                  value={headerData.centered.title}
                  onChange={(e) => setHeaderData(prev => ({
                    ...prev,
                    centered: { ...prev.centered, title: e.target.value }
                  }))}
                  className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Введите заголовок"
                />
              </div>

              <div>
                <label htmlFor="subtitle" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Подзаголовок
                </label>
                <input
                  type="text"
                  id="subtitle"
                  value={headerData.centered.subtitle}
                  onChange={(e) => setHeaderData(prev => ({
                    ...prev,
                    centered: { ...prev.centered, subtitle: e.target.value }
                  }))}
                  className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Введите подзаголовок"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                    Логотип (светлая тема)
                  </label>
                  <div className="p-4 border border-dark-300 dark:border-dark-600 rounded-lg bg-white flex flex-col items-center">
                    <img
                      src={headerData.centered.logoLight}
                      alt="Light Logo Preview"
                      className="h-20 w-auto object-contain mb-3"
                    />
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) await handleImageUpload(file, 'logo-light');
                        };
                        input.click();
                      }}
                      className="px-3 py-1.5 text-sm bg-dark-100 hover:bg-dark-200 text-dark-800 rounded-lg flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Изменить
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                    Логотип (тёмная тема)
                  </label>
                  <div className="p-4 border border-dark-300 dark:border-dark-600 rounded-lg bg-dark-900 flex flex-col items-center">
                    <img
                      src={headerData.centered.logoDark}
                      alt="Dark Logo Preview"
                      className="h-20 w-auto object-contain mb-3"
                    />
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) await handleImageUpload(file, 'logo-dark');
                        };
                        input.click();
                      }}
                      className="px-3 py-1.5 text-sm bg-dark-700 hover:bg-dark-600 text-white rounded-lg flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Изменить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slideshow Settings */}
        {headerData.style === 'slideshow' && (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Управление слайдшоу</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) await handleImageUpload(file, 'slide');
                    };
                    input.click();
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Загрузить изображение
                </button>
                <button
                  onClick={addSlide}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить слайд
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {headerData.slideshow.slides.length > 0 ? (
                <div className="space-y-4">
                  {headerData.slideshow.slides.map((slide, index) => (
                    <div key={slide.id} className="border border-dark-300 dark:border-dark-600 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-32 h-20 bg-dark-100 dark:bg-dark-700 rounded-lg flex items-center justify-center overflow-hidden relative group">
                          {slide.image ? (
                            <>
                              <img src={slide.image} alt="Slide preview" className="w-full h-full object-cover" />
                              <button
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      const compressedFile = await compressImage(file);
                                      const timestamp = Date.now();
                                      const fileExt = file.name.split('.').pop();
                                      const fileName = `slide_${timestamp}.${fileExt}`;
                                      const filePath = `images/${fileName}`;

                                      const { error: uploadError } = await supabase.storage
                                        .from('images')
                                        .upload(filePath, compressedFile);

                                      if (!uploadError) {
                                        const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${filePath}`;
                                        const newSlides = headerData.slideshow.slides.map(s => 
                                          s.id === slide.id ? { ...s, image: imageUrl } : s
                                        );
                                        setHeaderData(prev => ({
                                          ...prev,
                                          slideshow: { ...prev.slideshow, slides: newSlides }
                                        }));
                                        toast.success('Изображение обновлено');
                                      }
                                    }
                                  };
                                  input.click();
                                }}
                                className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="w-8 h-8 text-dark-400" />
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <div>
                            <input
                              type="text"
                              value={slide.title}
                              onChange={(e) => {
                                const newSlides = headerData.slideshow.slides.map(s => 
                                  s.id === slide.id ? { ...s, title: e.target.value } : s
                                );
                                setHeaderData(prev => ({
                                  ...prev,
                                  slideshow: { ...prev.slideshow, slides: newSlides }
                                }));
                              }}
                              className="w-full p-2 border border-dark-300 dark:border-dark-600 rounded-md dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="Введите заголовок слайда"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={slide.subtitle}
                              onChange={(e) => {
                                const newSlides = headerData.slideshow.slides.map(s => 
                                  s.id === slide.id ? { ...s, subtitle: e.target.value } : s
                                );
                                setHeaderData(prev => ({
                                  ...prev,
                                  slideshow: { ...prev.slideshow, slides: newSlides }
                                }));
                              }}
                              className="w-full p-2 border border-dark-300 dark:border-dark-600 rounded-md dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="Введите подзаголовок"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 self-center md:self-start">
                          <button
                            onClick={() => moveSlide(slide.id, 'up')}
                            disabled={index === 0}
                            className="p-2 hover:bg-dark-200 dark:hover:bg-dark-600 rounded-md disabled:opacity-50"
                            title="Переместить вверх"
                          >
                            <ArrowUp className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => moveSlide(slide.id, 'down')}
                            disabled={index === headerData.slideshow.slides.length - 1}
                            className="p-2 hover:bg-dark-200 dark:hover:bg-dark-600 rounded-md disabled:opacity-50"
                            title="Переместить вниз"
                          >
                            <ArrowDown className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteSlide(slide.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 rounded-md"
                            title="Удалить слайд"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-dark-50 dark:bg-dark-700 rounded-lg border-2 border-dashed border-dark-300 dark:border-dark-600">
                  <ImageIcon className="mx-auto h-12 w-12 text-dark-400" />
                  <h3 className="mt-2 text-sm font-medium text-dark-900 dark:text-white">Нет добавленных слайдов</h3>
                  <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
                    Нажмите кнопку "Загрузить изображение" чтобы начать
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                <Home className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Настройки блока "О нас"</h2>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={infoSection.enabled}
                onChange={(e) => setInfoSection(prev => ({
                  ...prev,
                  enabled: e.target.checked
                }))}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-dark-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-dark-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-dark-600 peer-checked:bg-primary-600"></div>
              <span className="ms-3 text-sm font-medium text-dark-700 dark:text-dark-300">
                {infoSection.enabled ? 'Включено' : 'Отключено'}
              </span>
            </label>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Заголовок
              </label>
              <input
                type="text"
                value={infoSection.title}
                onChange={(e) => setInfoSection(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Введите заголовок"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Описание
              </label>
              <textarea
                value={infoSection.description}
                onChange={(e) => setInfoSection(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Введите описание"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Изображение
              </label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 border border-dark-300 dark:border-dark-600 rounded-lg overflow-hidden">
                  <img 
                    src={infoSection.image} 
                    alt="Info section preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) await handleImageUpload(file, 'info');
                    };
                    input.click();
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Загрузить изображение
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Events Settings Section */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Настройки блока "Мероприятия"</h2>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Количество отображаемых мероприятий
              </label>
              <select
                value={eventsSettings.events_count}
                onChange={(e) => setEventsSettings(prev => ({
                  ...prev,
                  events_count: parseInt(e.target.value)
                }))}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value={1}>1 мероприятие</option>
                <option value={2}>2 мероприятия</option>
                <option value={3}>3 мероприятия</option>
                <option value={4}>4 мероприятия</option>
                <option value={6}>6 мероприятий</option>
                <option value={8}>8 мероприятий</option>
              </select>
            </div>

            <div>
              <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-4">
                Отображаемые элементы
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'show_title', label: 'Заголовок' },
                  { key: 'show_date', label: 'Дата' },
                  { key: 'show_time', label: 'Время' },
                  { key: 'show_language', label: 'Язык' },
                  { key: 'show_type', label: 'Тип события' },
                  { key: 'show_age', label: 'Возрастная категория' },
                  { key: 'show_image', label: 'Изображение' },
                  { key: 'show_price', label: 'Цена' }
                ].map(setting => (
                  <label key={setting.key} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventsSettings[setting.key as keyof HomepageEventsSettings] as boolean}
                      onChange={(e) => setEventsSettings(prev => ({
                        ...prev,
                        [setting.key]: e.target.checked
                      }))}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-dark-700 dark:text-dark-300">
                      {setting.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-4">
                Предварительный просмотр
              </h3>
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-dark-600">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2" />
                  <p>Будет показано {eventsSettings.events_count} мероприятий</p>
                  <p className="text-xs mt-1">
                    С элементами: {[
                      eventsSettings.show_title && 'заголовок',
                      eventsSettings.show_date && 'дата',
                      eventsSettings.show_time && 'время',
                      eventsSettings.show_image && 'изображение',
                      eventsSettings.show_price && 'цена'
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rent Section */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                <Home className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Настройки блока "Аренда"</h2>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rentSection.enabled}
                onChange={(e) => setRentSection(prev => ({
                  ...prev,
                  enabled: e.target.checked
                }))}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-dark-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-dark-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-dark-600 peer-checked:bg-primary-600"></div>
              <span className="ms-3 text-sm font-medium text-dark-700 dark:text-dark-300">
                {rentSection.enabled ? 'Включено' : 'Отключено'}
              </span>
            </label>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Заголовок
              </label>
              <input
                type="text"
                value={rentSection.title}
                onChange={(e) => setRentSection(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Введите заголовок"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Описание
              </label>
              <textarea
                value={rentSection.description}
                onChange={(e) => setRentSection(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Введите описание"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Изображение
              </label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 border border-dark-300 dark:border-dark-600 rounded-lg overflow-hidden">
                  <img 
                    src={rentSection.image} 
                    alt="Rent section preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) await handleImageUpload(file, 'rent');
                    };
                    input.click();
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Загрузить изображение
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Coworking Section */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Настройки блока "Коворкинг"</h2>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={coworkingSection.enabled}
                onChange={(e) => setCoworkingSection(prev => ({
                  ...prev,
                  enabled: e.target.checked
                }))}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-dark-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-dark-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-dark-600 peer-checked:bg-primary-600"></div>
              <span className="ms-3 text-sm font-medium text-dark-700 dark:text-dark-300">
                {coworkingSection.enabled ? 'Включено' : 'Отключено'}
              </span>
            </label>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Заголовок
              </label>
              <input
                type="text"
                value={coworkingSection.title}
                onChange={(e) => setCoworkingSection(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Введите заголовок"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Описание
              </label>
              <textarea
                value={coworkingSection.description}
                onChange={(e) => setCoworkingSection(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Введите описание"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Изображение
              </label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 border border-dark-300 dark:border-dark-600 rounded-lg overflow-hidden">
                  <img 
                    src={coworkingSection.image} 
                    alt="Coworking section preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) await handleImageUpload(file, 'coworking');
                    };
                    input.click();
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Загрузить изображение
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default AdminHomeHeader;