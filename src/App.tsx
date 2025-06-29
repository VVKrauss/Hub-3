// src/App.tsx - Обновленные маршруты с управлением пользователями

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Public pages
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventDetail from './pages/admin/AdminEventDetail';
import AdminSpeakers from './pages/admin/AdminSpeakers';
import AdminUsersManagement from './pages/admin/AdminUsersManagement'; // Новый компонент
import AdminSettings from './pages/admin/AdminSettings';
import AdminHomeHeader from './pages/admin/AdminHomeHeader';

// Layout components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/admin/ProtectedRoute';

// Context providers
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="events/:id" element={<EventDetailPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              
              {/* События */}
              <Route path="events" element={<AdminEvents />} />
              <Route path="events/:id" element={<AdminEventDetail />} />
              
              {/* Спикеры */}
              <Route path="speakers" element={<AdminSpeakers />} />
              
              {/* Пользователи - НОВЫЙ РАЗДЕЛ */}
              <Route path="users" element={<AdminUsersManagement />} />
              
              {/* Настройки */}
              <Route path="settings" element={<AdminSettings />} />
              <Route path="settings/home" element={<AdminHomeHeader />} />
            </Route>
          </Routes>

          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-color)',
                border: '1px solid var(--toast-border)',
              },
            }}
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;