// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import AppLoadingWrapper from './components/AppLoadingWrapper';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppLoadingWrapper>
            <App />
          </AppLoadingWrapper>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);