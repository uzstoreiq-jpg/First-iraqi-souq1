import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Suppress annoying or non-critical runtime errors (like ResizeObserver & blocked/CORS third-party scripts)
const suppressErrorsAndResizeObserver = () => {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string') {
      const lowerArg = args[0].toLowerCase();
      if (lowerArg.includes('resizeobserver') || lowerArg.includes('script error') || lowerArg.includes('facebook') || lowerArg.includes('fbevents')) {
        return;
      }
    }
    originalError.call(console, ...args);
  };

  // Modern browser errors list/message inspection
  window.addEventListener('error', (e) => {
    const errorMsg = String(e.message || '').toLowerCase();
    const errorObjStr = e.error ? String(e.error).toLowerCase() : '';
    const src = String(e.filename || '').toLowerCase();
    
    if (
      errorMsg.includes('resizeobserver') ||
      errorMsg.includes('script error') ||
      errorMsg.includes('fbevents') ||
      errorMsg.includes('facebook') ||
      errorObjStr.includes('script error') ||
      errorObjStr.includes('resizeobserver') ||
      src.includes('fbevents') ||
      src.includes('facebook') ||
      e.lineno === 0 ||
      e.colno === 0
    ) {
      const viteErrorOverlay = document.querySelector('vite-error-overlay');
      if (viteErrorOverlay) {
        viteErrorOverlay.remove();
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true);

  // Global windowOnError handler for legacy and cross-origin script error tracking
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = String(message || '').toLowerCase();
    const src = String(source || '').toLowerCase();
    const errStr = error ? String(error).toLowerCase() : '';
    if (
      msg.includes('script error') ||
      msg.includes('resizeobserver') ||
      msg.includes('fbevents') ||
      msg.includes('facebook') ||
      src.includes('fbevents') ||
      src.includes('facebook') ||
      errStr.includes('script error') ||
      lineno === 0 ||
      colno === 0
    ) {
      console.warn("Suppressed runtime error:", message, "from:", source);
      return true; // Prevents the firing of the default browser error handler
    }
  };

  // Suppress unhandled promise rejections that might bubble up from cross-origin scripts
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason ? String(e.reason).toLowerCase() : '';
    if (
      reason.includes('script error') ||
      reason.includes('facebook') ||
      reason.includes('fbevents') ||
      reason.includes('resizeobserver')
    ) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  });
};

suppressErrorsAndResizeObserver();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
