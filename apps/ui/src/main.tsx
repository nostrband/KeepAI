import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from '@posthog/react';
import { Toaster, toast } from 'sonner';
import posthog from './lib/posthog';
import App from './App';
import './index.css';

declare const __ELECTRON__: boolean;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      gcTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        toast.error(error.message || 'Something went wrong');
      },
    },
  },
});

const Router = typeof __ELECTRON__ !== 'undefined' && __ELECTRON__ ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <App />
          <Toaster position="bottom-right" richColors />
        </Router>
      </QueryClientProvider>
    </PostHogProvider>
  </React.StrictMode>
);
