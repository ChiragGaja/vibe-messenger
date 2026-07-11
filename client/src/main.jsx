import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker
registerSW({ immediate: true });

// Suppress known harmless WebRTC abort errors from showing in dev overlays (e.g. Vercel Toolbar)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.name === 'OperationError' && event.reason.message.includes('Abort')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
