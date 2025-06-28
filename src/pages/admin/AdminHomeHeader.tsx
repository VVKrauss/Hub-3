import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { Plus, X, ArrowUp, ArrowDown, Edit, Trash2, Image as ImageIcon, Save, Eye, Home, Clock, Users, Check } from 'lucide-react';

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

const AdminHomeHeader = () => {
  const [siteSettingsId, setSiteSettingsId] = useState<string | null>(null);
  const [headerData, setHeaderData] = useState<HeaderData>(defaultHeaderData);
  const [infoSection, setInfoSection] = useState<InfoSection>(defaultInfoSection);
  const [rentSection, setRentSection] = useState<RentSection>(defaultRentSection);
  const [coworkingSection, setCoworkingSection] = useState<CoworkingSection>(defaultCoworkingSection);
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
              coworking_selection: defaultCoworkingSection
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
          coworking_selection: coworkingSection
        })
        .eq('id', siteSettingsId);

      if (error) throw error;

      toast.success('Настройки успешно сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

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
                          if (file) await handleImageUpload(file, 'info');
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
                          if (file) await handleImageUpload(file, 'info');
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Настройки слайдшоу</h2>
              <div className="flex gap-3">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleImageUpload(file, 'slide');
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Добавить слайд
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="autoplaySpeed" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Скорость автопрокрутки (мс)
                </label>
                <input
                  type="number"
                  id="autoplaySpeed"
                  value={headerData.slideshow.settings.autoplaySpeed}
                  onChange={(e) => setHeaderData(prev => ({
                    ...prev,
                    slideshow: {
                      ...prev.slideshow,
                      settings: {
                        ...prev.slideshow.settings,
                        autoplaySpeed: parseInt(e.target.value)
                      }
                    }
                  }))}
                  min="1000"
                  step="500"
                  className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="transition" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Тип перехода
                </label>
                <select
                  id="transition"
                  value={headerData.slideshow.settings.transition}
                  onChange={(e) => setHeaderData(prev => ({
                    ...prev,
                    slideshow: {
                      ...prev.slideshow,
                      settings: {
                        ...prev.slideshow.settings,
                        transition: e.target.value as 'fade' | 'slide'
                      }
                    }
                  }))}
                  className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="fade">Затухание</option>
                  <option value="slide">Скольжение</option>
                </select>
              </div>
            </div>

            {headerData.slideshow.slides.length > 0 ? (
              <div className="space-y-4">
                {headerData.slideshow.slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className="bg-dark-50 dark:bg-dark-700 rounded-lg p-4 border border-dark-200 dark:border-dark-600"
                  >
                    <div className="flex flex-col md:flex-row items-start gap-4">
                      <div className="w-full md:w-48 flex-shrink-0 aspect-[3/1] bg-dark-200 dark:bg-dark-600 rounded-md overflow-hidden">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-grow space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                            Заголовок слайда
                          </label>
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
                            placeholder="Введите заголовок"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                            Подзаголовок слайда
                          </label>
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
                  Нажмите кнопку "Добавить слайд" чтобы начать
                </p>
              </div>
            )}
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
                {infoSection.enabled ? 'Активен' : 'Неактивен'}
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
                onChange={(e) => setInfoSection(prev => ({
                  ...prev,
                  title: e.target.value
                }))}
                className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите заголовок"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Описание
              </label>
              <textarea
                value={infoSection.description}
                onChange={(e) => setInfoSection(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                rows={4}
                className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите описание"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Изображение
              </label>
              <div className="relative group aspect-[3/1] bg-dark-100 dark:bg-dark-700 rounded-lg overflow-hidden">
                <img
                  src={infoSection.image}
                  alt="Info section preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                    className="p-3 bg-white/90 hover:bg-white text-dark-800 rounded-full shadow-lg"
                    title="Изменить изображение"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24">
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Порядок
                </label>
                <input
                  type="number"
                  value={infoSection.order}
                  onChange={(e) => setInfoSection(prev => ({
                    ...prev,
                    order: parseInt(e.target.value)
                  }))}
                  min="1"
                  className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rent Section */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Настройки блока "Аренда помещений"</h2>
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
                {rentSection.enabled ? 'Активен' : 'Неактивен'}
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
                onChange={(e) => setRentSection(prev => ({
                  ...prev,
                  title: e.target.value
                }))}
                className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите заголовок"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Описание
              </label>
              <textarea
                value={rentSection.description}
                onChange={(e) => setRentSection(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                rows={4}
                className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите описание"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Изображение
              </label>
              <div className="relative group aspect-[3/1] bg-dark-100 dark:bg-dark-700 rounded-lg overflow-hidden">
                <img
                  src={rentSection.image}
                  alt="Rent section preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                    className="p-3 bg-white/90 hover:bg-white text-dark-800 rounded-full shadow-lg"
                    title="Изменить изображение"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24">
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Порядок
                </label>
                <input
                  type="number"
                  value={rentSection.order}
                  onChange={(e) => setRentSection(prev => ({
                    ...prev,
                    order: parseInt(e.target.value)
                  }))}
                  min="1"
                  className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
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
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Настройки блока "Коворкинг пространство"</h2>
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
                {coworkingSection.enabled ? 'Активен' : 'Неактивен'}
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
                onChange={(e) => setCoworkingSection(prev => ({
                  ...prev,
                  title: e.target.value
                }))}
                className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите заголовок"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Описание
              </label>
              <textarea
                value={coworkingSection.description}
                onChange={(e) => setCoworkingSection(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                rows={4}
                className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите описание"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Изображение
              </label>
              <div className="relative group aspect-[3/1] bg-dark-100 dark:bg-dark-700 rounded-lg overflow-hidden">
                <img
                  src={coworkingSection.image}
                  alt="Coworking section preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                    className="p-3 bg-white/90 hover:bg-white text-dark-800 rounded-full shadow-lg"
                    title="Изменить изображение" 
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24">
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Порядок
                </label>
                <input
                  type="number"
                  value={coworkingSection.order}
                  onChange={(e) => setCoworkingSection(prev => ({
                    ...prev,
                    order: parseInt(e.target.value)
                  }))}
                  min="1"
                  className="w-full p-2.5 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHomeHeader;