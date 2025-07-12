// src/App.tsx - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ с lazy loading
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FullScreenLoader } from './components/ui/UnifiedLoading';
import SessionMonitor from './components/SessionMonitor';
import AppRecovery from './components/AppRecovery';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy загрузка основных страниц
const HomePage = lazy(() => import('./pages/HomePage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const SpeakersPage = lazy(() => import('./pages/SpeakersPage'));
const SpeakerProfilePage = lazy(() => import('./pages/SpeakerProfilePage'));
const RentPage = lazy(() => import('./pages/RentPage'));
const CoworkingPage = lazy(() => import('./pages/CoworkingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Lazy загрузка админ-страниц
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminHomeHeader = lazy(() => import('./pages/admin/AdminHomeHeader'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const CreateEditEventPage = lazy(() => import('./pages/admin/CreateEditEventPage'));
const AdminSpeakers = lazy(() => import('./pages/admin/AdminSpeakers'));
const AdminSpeakersMigration = lazy(() => import('./pages/admin/AdminSpeakersMigration'));
const AdminUsersManagement = lazy(() => import('./pages/admin/AdminUsersManagement'));
const AdminRent = lazy(() => import('./pages/admin/AdminRent'));
const AdminCoworking = lazy(() => import('./pages/admin/AdminCoworking'));
const AdminAbout = lazy(() => import('./pages/admin/AdminAbout'));
const AdminNavigation = lazy(() => import('./pages/admin/AdminNavigation'));
const AdminExport = lazy(() => import('./pages/admin/AdminExport'));
const AdminEventStatistics = lazy(() => import('./pages/admin/AdminEventStatistics'));
const AdminAttendance = lazy(() => import('./pages/admin/AdminAttendance'));
const AdminCalendarPage = lazy(() => import('./pages/admin/AdminCalendarPage'));

// Lazy загрузка специальных страниц
const PostersPage = lazy(() => import('./components/posters/PostersPage'));
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Компоненты защиты маршрутов - не lazy, так как нужны сразу
import ProtectedRoute from './components/admin/ProtectedRoute';
import PublicProtectedRoute from './components/auth/PublicProtectedRoute';

// Компонент загрузки с обработкой ошибок
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<FullScreenLoader text="Загружаем страницу..." />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

function App() {
  return (
    <div className="app">
      <Toaster position="top-center" />
      
      {/* Оптимизированные мониторы - избегают конфликтов */}
      <SessionMonitor />
      <AppRecovery />
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
          <LazyWrapper>
            <HomePage />
          </LazyWrapper>
        } />
        
        <Route path="/events" element={
          <LazyWrapper>
            <EventsPage />
          </LazyWrapper>
        } />
        
        <Route path="/events/:id" element={
          <LazyWrapper>
            <EventDetailsPage />
          </LazyWrapper>
        } />
        
        <Route path="/courses" element={
          <LazyWrapper>
            <CoursesPage />
          </LazyWrapper>
        } />
        
        <Route path="/speakers" element={
          <LazyWrapper>
            <SpeakersPage />
          </LazyWrapper>
        } />
        
        <Route path="/speakers/:id" element={
          <LazyWrapper>
            <SpeakerProfilePage />
          </LazyWrapper>
        } />
        
        <Route path="/rent" element={
          <LazyWrapper>
            <RentPage />
          </LazyWrapper>
        } />
        
        <Route path="/coworking" element={
          <LazyWrapper>
            <CoworkingPage />
          </LazyWrapper>
        } />
        
        <Route path="/about" element={
          <LazyWrapper>
            <AboutPage />
          </LazyWrapper>
        } />
        
        <Route path="/posters" element={
          <LazyWrapper>
            <PostersPage />
          </LazyWrapper>
        } />
        
        {/* Auth routes */}
        <Route path="/auth/callback" element={
          <LazyWrapper>
            <AuthCallbackPage />
          </LazyWrapper>
        } />
        
        <Route path="/reset-password" element={
          <LazyWrapper>
            <ResetPasswordPage />
          </LazyWrapper>
        } />
      
        {/* Protected public routes */}
        <Route path="/profile" element={
          <PublicProtectedRoute>
            <LazyWrapper>
              <ProfilePage />
            </LazyWrapper>
          </PublicProtectedRoute>
        } />
        
        {/* Protected Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <LazyWrapper>
              <AdminLayout />
            </LazyWrapper>
          </ProtectedRoute>
        }>
          <Route index element={
            <LazyWrapper>
              <AdminHomeHeader />
            </LazyWrapper>
          } />
          
          <Route path="events" element={
            <LazyWrapper>
              <AdminEvents />
            </LazyWrapper>
          } />
          
          <Route path="events/new" element={
            <LazyWrapper>
              <CreateEditEventPage />
            </LazyWrapper>
          } />
          
          <Route path="events/:id/edit" element={
            <LazyWrapper>
              <CreateEditEventPage />
            </LazyWrapper>
          } />
          
          <Route path="speakers" element={
            <LazyWrapper>
              <AdminSpeakers />
            </LazyWrapper>
          } />
          
          <Route path="speakers-migration" element={
            <LazyWrapper>
              <AdminSpeakersMigration />
            </LazyWrapper>
          } />
          
          <Route path="users" element={
            <LazyWrapper>
              <AdminUsersManagement />
            </LazyWrapper>
          } />
          
          <Route path="rent" element={
            <LazyWrapper>
              <AdminRent />
            </LazyWrapper>
          } />
          
          <Route path="coworking" element={
            <LazyWrapper>
              <AdminCoworking />
            </LazyWrapper>
          } />
          
          <Route path="about" element={
            <LazyWrapper>
              <AdminAbout />
            </LazyWrapper>
          } />
          
          <Route path="navigation" element={
            <LazyWrapper>
              <AdminNavigation />
            </LazyWrapper>
          } />
          
          <Route path="export" element={
            <LazyWrapper>
              <AdminExport />
            </LazyWrapper>
          } />
          
          <Route path="calendar" element={
            <LazyWrapper>
              <AdminCalendarPage />
            </LazyWrapper>
          } />
          
          <Route path="event-statistics" element={
            <LazyWrapper>
              <AdminEventStatistics />
            </LazyWrapper>
          } />
          
          <Route path="attendance" element={
            <LazyWrapper>
              <AdminAttendance />
            </LazyWrapper>
          } />
        </Route>

        {/* 404 route */}
        <Route path="*" element={
          <LazyWrapper>
            <NotFoundPage />
          </LazyWrapper>
        } />
      </Routes>
    </div>
  );
}

export default App;