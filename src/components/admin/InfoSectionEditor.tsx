import { useState } from 'react';
import { Save, Eye, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import ImageUploadAndCrop from '../shared/ImageUploadAndCrop';

type InfoSectionData = {
  title: string;
  description: string;
  image: string;
  enabled: boolean;
  order: number;
};

type InfoSectionEditorProps = {
  siteSettingsId: string;
  initialData: InfoSectionData;
  onUpdate: (data: InfoSectionData) => void;
};

const InfoSectionEditor = ({ siteSettingsId, initialData, onUpdate }: InfoSectionEditorProps) => {
  const [data, setData] = useState<InfoSectionData>(initialData);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = async () => {
    if (!data.title.trim()) {
      toast.error('Введите заголовок');
      return;
    }

    if (!data.description.trim()) {
      toast.error('Введите описание');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('site_settings')
        .update({
          info_section: data
        })
        .eq('id', siteSettingsId);

      if (error) throw error;

      onUpdate(data);
      toast.success('Изменения сохранены');
    } catch (error) {
      console.error('Error saving info section:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUploadSuccess = (imageUrl: string) => {
    setData(prev => ({
      ...prev,
      image: imageUrl
    }));
    toast.success('Изображение обновлено');
  };

  if (previewMode) {
    return (
      <div className="relative">
        <button
          onClick={() => setPreviewMode(false)}
          className="absolute top-4 right-4 p-2 bg-white dark:bg-dark-800 rounded-full shadow-lg"
        >
          <X className="h-5 w-5" />
        </button>
        
        <section className="section bg-white dark:bg-dark-900">
          <div className="container grid-layout items-center">
            <div className="text-content">
              <h2 className="mb-6">{data.title}</h2>
              <div 
                className="text-lg space-y-4"
                dangerouslySetInnerHTML={{ __html: data.description }}
              />
            </div>
            <div className="image-content mt-8 md:mt-0">
              <img 
                src={data.image} 
                alt={data.title} 
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Инфо на главной странице</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(true)}
            className="btn-outline flex items-center gap-2"
          >
            <Eye className="h-5 w-5" />
            Предпросмотр
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="h-5 w-5" />
            Сохранить
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.enabled}
            onChange={(e) => setData({ ...data, enabled: e.target.checked })}
            className="form-checkbox"
          />
          <span>Показывать блок на главной странице</span>
        </label>
      </div>

      <div className="form-group">
        <label htmlFor="title" className="block font-medium mb-2">
          Заголовок
        </label>
        <input
          type="text"
          id="title"
          value={data.title}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description" className="block font-medium mb-2">
          Описание
        </label>
        <textarea
          id="description"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          rows={6}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="block font-medium mb-2">
          Изображение
        </label>
        
        <ImageUploadAndCrop
          aspectRatio={3/2}
          targetWidth={1200}
          targetHeight={800}
          storagePathPrefix="info_section/"
          initialImageUrl={data.image}
          onUploadSuccess={(url) => handleImageUploadSuccess(url)}
          onRemoveImage={() => setData(prev => ({ ...prev, image: '' }))}
          recommendedText="Рекомендуемый размер: 1200x800px"
        />
      </div>

      <div className="form-group">
        <label htmlFor="order" className="block font-medium mb-2">
          Порядок отображения
        </label>
        <input
          type="number"
          id="order"
          value={data.order}
          onChange={(e) => setData({ ...data, order: parseInt(e.target.value) })}
          min="1"
          className="form-input w-24"
        />
      </div>
    </div>
  );
};

export default InfoSectionEditor;