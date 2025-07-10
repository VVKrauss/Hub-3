// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { TopBarProvider } from './contexts/TopBarContext';
import AppLoadingWrapper from './components/AppLoadingWrapper';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <TopBarProvider>
          <AppLoadingWrapper>
            <App />
          </AppLoadingWrapper>
        </TopBarProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);