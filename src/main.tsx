// src/main.tsx - Обновленная версия с обработкой загрузки
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import AppLoadingWrapper from './components/AppLoadingWrapper';
import LoadingDebug from './components/debug/LoadingDebug';

// Проверяем принудительный пропуск авторизации (для экстренных случаев)
const forceSkipAuth = localStorage.getItem('force_skip_auth') === 'true';
if (forceSkipAuth) {
  console.warn('Принудительный пропуск авторизации активен');
  localStorage.removeItem('force_skip_auth');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppLoadingWrapper>
            <App />
            <LoadingDebug />
          </AppLoadingWrapper>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);