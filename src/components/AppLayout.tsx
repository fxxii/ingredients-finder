import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

// We need a Toaster. I'll use 'react-hot-toast' for simplicity as it's standard.
// Adding it to package.json in next step if missed, or I can build a custom one.
// User asked for "Toaster box to show status and their percentage".
// Custom might be better for "percentage". But standard toast library is safer.
// I'll stick to a simple custom Toaster or use a library. 
// "react-hot-toast" is great. I'll use it.

// Check if I added react-hot-toast? No. 
// I will add it.

interface AppLayoutProps {
  children: React.ReactNode;
}

import { Toaster } from 'react-hot-toast';
import { Footer } from './Footer';
import { ToastContainer } from './ui/Toast';
import { DebugConsole } from './DebugConsole';

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans antialiased overflow-hidden relative pb-12">
        {children}
        <Footer />
        <Toaster position="bottom-center" toastOptions={{ duration: 4000, style: { fontSize: '13px' } }} />
        <ToastContainer />
        <DebugConsole />
      </div>
    </QueryClientProvider>
  );
};
