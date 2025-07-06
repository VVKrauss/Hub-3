// src/pages/HomePage.tsx
// ДИАГНОСТИЧЕСКАЯ ВЕРСИЯ - включаем компоненты по одному

import Layout from '../components/layout/Layout';
import HeroSection from '../components/home/HeroSection';
import InfoSection from '../components/home/InfoSection';
import EventsSection from '../components/home/EventsSection';
import SpeakersSection from '../components/home/SpeakersSection';
import RentSection from '../components/home/RentSection';
import CoworkingSection from '../components/home/CoworkingSection';

const HomePage = () => {
  return (
    <Layout>
      {/* ВКЛЮЧАЙТЕ ПО ОДНОМУ И ТЕСТИРУЙТЕ */}
      
      {/* Шаг 1: Только HeroSection */}
      {/* <HeroSection />
      
      {/* Шаг 2: Добавьте InfoSection и проверьте */}
      <InfoSection />
      
      {/* Шаг 3: Добавьте EventsSection и проверьте */}
      {/* <EventsSection /> */}
       
      {/* Шаг 4: Добавьте SpeakersSection и проверьте */}
      {/* <SpeakersSection /> */}
      
      {/* Шаг 5: Добавьте RentSection и проверьте */}
      {/* <RentSection/> */}
      
      {/* Шаг 6: Добавьте CoworkingSection и проверьте */}
      {/* <CoworkingSection/> */}
    </Layout>
  );
};

export default HomePage;

// ИНСТРУКЦИЯ:
// 1. Сохраните этот файл
// 2. Перезагрузите страницу - проверьте скорость
// 3. Раскомментируйте SpeakersSection - проверьте скорость
// 4. Раскомментируйте RentSection - проверьте скорость  
// 5. Раскомментируйте CoworkingSection - проверьте скорость
// 
// На каком шаге сайт начинает тормозить - тот компонент и проблемный