import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global API Routing Interceptor for Frontend-Backend Parity (e.g., Cloudflare Pages)
function resolveInterceptorBackend(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && origin !== 'null') {
      if (origin.includes('.run.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin;
      }
    }
    try {
      const href = window.location.href;
      if (href.includes('ais-dev')) {
        return 'https://ais-dev-kyvvoxeb2asjm65vu4oxou-375267897647.asia-east1.run.app';
      }
      if (href.includes('ais-pre')) {
        return 'https://ais-pre-kyvvoxeb2asjm65vu4oxou-375267897647.asia-east1.run.app';
      }
    } catch (e) {}
  }

  if (import.meta.env.DEV) {
    return 'https://ais-dev-kyvvoxeb2asjm65vu4oxou-375267897647.asia-east1.run.app';
  }

  return 'https://ais-pre-kyvvoxeb2asjm65vu4oxou-375267897647.asia-east1.run.app';
}

const apiBase = resolveInterceptorBackend();
if (apiBase) {
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: function (input: RequestInfo | URL, init?: RequestInit) {
        let url = '';
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.pathname + input.search;
        } else if (input && typeof input === 'object' && 'url' in input) {
          url = (input as any).url || '';
        }

        if (url.startsWith('/api/')) {
          const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
          const targetUrl = `${cleanBase}${url}`;
          
          if (typeof input === 'string') {
            input = targetUrl;
          } else if (input instanceof URL) {
            input = new URL(targetUrl);
          } else if (input && typeof input === 'object' && 'url' in input) {
            (input as any).url = targetUrl;
          }
        }
        return originalFetch(input, init);
      },
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (err) {
    console.warn('[Fetch Interceptor] Failed to define window.fetch property via defineProperty. Trying direct override:', err);
    try {
      (window as any).fetch = function (input: any, init: any) {
        let url = '';
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.pathname + input.search;
        } else if (input && typeof input === 'object' && 'url' in input) {
          url = (input as any).url || '';
        }

        if (url.startsWith('/api/')) {
          const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
          const targetUrl = `${cleanBase}${url}`;
          
          if (typeof input === 'string') {
            input = targetUrl;
          } else if (input instanceof URL) {
            input = new URL(targetUrl);
          } else if (input && typeof input === 'object' && 'url' in input) {
            (input as any).url = targetUrl;
          }
        }
        return originalFetch(input, init);
      };
    } catch (directErr) {
      console.error('[Fetch Interceptor] Reassignment and defineProperty both failed:', directErr);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
