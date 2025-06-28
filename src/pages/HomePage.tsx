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
      <HeroSection />
      <InfoSection />
      <EventsSection />
      <SpeakersSection />
      <RentSection/>
      <CoworkingSection/>
    </Layout>
  );
};

export default HomePage;