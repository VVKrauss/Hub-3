// src/components/TestFavorites.tsx - ВРЕМЕННЫЙ ТЕСТОВЫЙ КОМПОНЕНТ
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteSpeakers } from '../hooks/useFavorites';

const TestFavorites: React.FC = () => {
  const { user } = useAuth();
  const { favoriteSpeakers, loading, toggleFavoriteSpeaker } = useFavoriteSpeakers(user?.id);

  console.log('User:', user);
  console.log('Favorite speakers:', favoriteSpeakers);
  console.log('Loading:', loading);

  if (!user) {
    return <div className="p-4 text-red-500">Пользователь не авторизован</div>;
  }

  return (
    <div className="p-4 border border-gray-300 rounded-lg">
      <h3 className="text-lg font-bold mb-2">🧪 Тест избранного</h3>
      <p><strong>User ID:</strong> {user.id}</p>
      <p><strong>Loading:</strong> {loading ? 'Да' : 'Нет'}</p>
      <p><strong>Количество избранных спикеров:</strong> {favoriteSpeakers.length}</p>
      
      <button
        onClick={() => toggleFavoriteSpeaker('test-speaker-1')}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
      >
        Тест добавления спикера
      </button>

      {favoriteSpeakers.length > 0 && (
        <div className="mt-2">
          <strong>Избранные спикеры:</strong>
          <ul>
            {favoriteSpeakers.map(id => <li key={id}>- {id}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TestFavorites;