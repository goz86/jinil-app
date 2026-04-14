import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MiniWidget from './components/MiniWidget.jsx'
import { LanguageProvider } from './contexts/LanguageContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'

const renderApp = () => {
  // Simple hash-based router
  if (window.location.hash.includes('mini')) {
    document.documentElement.classList.add('is-mini');
    return (
      <StrictMode>
        <LanguageProvider>
          <MiniWidget />
        </LanguageProvider>
      </StrictMode>
    );
  }

  document.documentElement.classList.remove('is-mini');

  return (
    <StrictMode>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </StrictMode>
  );
};

createRoot(document.getElementById('root')).render(renderApp());
