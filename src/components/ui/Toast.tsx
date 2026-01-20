import React from 'react';
import { useStore } from '../../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const ToastContainer: React.FC = () => {
  const toasts = useStore((state) => state.toasts);
  const currentView = useStore((state) => state.currentView);

  // Hide the container entirely in scanner view to maintain the pro camera feel
  if (currentView === 'scanner') return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none p-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] pointer-events-auto",
              toast.type === 'error' && "bg-red-600",
              toast.type === 'success' && "bg-green-600"
            )}
          >
            <div className="flex-1 font-medium">{toast.message}</div>
            {toast.type === 'percentage' && (
              <div className="font-mono text-sm bg-white/20 px-2 py-0.5 rounded">
                {toast.value}%
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
