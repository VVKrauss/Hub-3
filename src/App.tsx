import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import SpeakersPage from './pages/SpeakersPage';
import SpeakerProfilePage from './pages/SpeakerProfilePage';
import RentPage from './pages/RentPage';
import CoworkingPage from './pages/CoworkingPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminHomeHeader from './pages/admin/AdminHomeHeader';
import AdminEvents from './pages/admin/AdminEvents';
import CreateEditEventPage from './pages/admin/CreateEditEventPage';
import AdminSpeakers from './pages/admin/AdminSpeakers';
import AdminRent from './pages/admin/AdminRent';
import AdminCoworking from './pages/admin/AdminCoworking';
import AdminAbout from './pages/admin/AdminAbout';
import AdminNavigation from './pages/admin/AdminNavigation';
import AdminExport from './pages/admin/AdminExport';
import AdminEventStatistics from './pages/admin/AdminEventStatistics';
import AdminAttendance from './pages/admin/AdminAttendance';
import ProtectedRoute from './components/admin/ProtectedRoute';
import PublicProtectedRoute from './components/auth/PublicProtectedRoute';
import AdminCalendarPage from './pages/admin/AdminCalendarPage';
import PostersPage from './components/posters/PostersPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <div className="app">
      <Toaster position="top-center" />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/speakers" element={<SpeakersPage />} />
        <Route path="/speakers/:id" element={<SpeakerProfilePage />} />
        <Route path="/rent" element={<RentPage />} />
        <Route path="/coworking" element={<CoworkingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/posters" element={<PostersPage />} />
        
        {/* Auth routes */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Protected public routes */}
        <Route path="/profile" element={
          <PublicProtectedRoute>
            <ProfilePage />
          </PublicProtectedRoute>
        } />
        
        {/* Protected Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminHomeHeader />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="events/new" element={<CreateEditEventPage />} />
          <Route path="events/:id/edit" element={<CreateEditEventPage />} />
          <Route path="speakers" element={<AdminSpeakers />} />
          <Route path="rent" element={<AdminRent />} />
          <Route path="coworking" element={<AdminCoworking />} />
          <Route path="about" element={<AdminAbout />} />
          <Route path="navigation" element={<AdminNavigation />} />
          <Route path="export" element={<AdminExport />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
          <Route path="event-statistics" element={<AdminEventStatistics />} />
          <Route path="attendance" element={<AdminAttendance />} />
        </Route>

        {/* 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;