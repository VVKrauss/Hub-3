// src/components/speakers/SpeakersGrid.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, User, Link2 } from 'lucide-react';
import { getSupabaseImageUrl } from '../../utils/imageUtils';
import SpeakerFavoriteButton from './SpeakerFavoriteButton';

export type Speaker = {
  id: string;
  name: string;
  field_of_expertise: string;
  description: string;
  photos: { url: string }[];
  blog_visibility?: boolean;
  blogs?: string; // JSON string of blog array
};

type SpeakersGridProps = {
  speakers: Speaker[];
  searchQuery?: string;
};

const SpeakersGrid = ({ 
  speakers, 
  searchQuery = ''
}: SpeakersGridProps) => {
  const filteredSpeakers = speakers.filter(speaker => {
    const matchesSearch = speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         speaker.field_of_expertise.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (speaker.description && speaker.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  if (filteredSpeakers.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-dark-500 dark:text-dark-400">
          Спикеры не найдены. Попробуйте изменить параметры поиска.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filteredSpeakers.map(speaker => {
        const parsedBlogs = speaker.blog_visibility && speaker.blogs 
          ? JSON.parse(speaker.blogs)
          : null;

        return (
          <div key={speaker.id} className="card hover:shadow-lg flex flex-col md:flex-row lg:flex-col transition-shadow duration-200 relative">
            {/* Кнопка избранного */}
            <div className="absolute top-4 right-4 z-10">
              <SpeakerFavoriteButton
                speakerId={speaker.id}
                className="bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-800 shadow-md"
                size="sm"
              />
            </div>

            <div className="md:w-1/3 lg:w-full h-60 md:h-auto lg:h-60 bg-cover bg-center relative">
              {speaker.photos?.[0]?.url ? (
                <img
                  src={getSupabaseImageUrl(speaker.photos[0].url)}
                  alt={speaker.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-dark-700">
                        <svg class="w-16 h-16 text-gray-400 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                    `;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-dark-700">
                  <User className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                </div>
              )}
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-semibold">{speaker.name}</h3>
                </div>
                <p className="text-primary-600 dark:text-primary-400 font-medium mb-3">
                  {speaker.field_of_expertise}
                </p>
                {speaker.description && (
                  <p className="text-dark-600 dark:text-dark-300 mb-4 line-clamp-3">
                    {speaker.description}
                  </p>
                )}
              </div>
              
              {/* Blog links section */}
              {parsedBlogs && parsedBlogs.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {parsedBlogs.slice(0, 3).map((blog: { url: string; platform: string }, index: number) => (
                      <a
                        key={index}
                        href={blog.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-dark-700 text-primary-800 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-dark-600 transition-colors"
                        title={blog.platform}
                      >
                        <Link2 className="w-3 h-3 mr-1.5" />
                        {blog.platform.length > 12 
                          ? `${blog.platform.substring(0, 10)}...` 
                          : blog.platform}
                      </a>
                    ))}
                    {parsedBlogs.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                        +{parsedBlogs.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <Link 
                to={`/speakers/${speaker.id}`}
                className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center mt-auto"
              >
                Подробнее
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SpeakersGrid;