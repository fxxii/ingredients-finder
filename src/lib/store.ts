import { create } from 'zustand';

type View = 'home' | 'scanner' | 'history';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'percentage' | 'error';
  value?: number; // for percentage
}

interface AppState {
  currentView: View;
  setView: (view: View) => void;
  
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // DB Sync state
  dbStatus: string;
  setDbStatus: (status: string) => void;

  // Active scan state
  activeCode: string | null;
  setActiveCode: (code: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  currentView: 'home',
  setView: (view) => set({ currentView: view }),

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    // Limit to max one toast at a time
    set({ toasts: [{ ...toast, id }] });
    
    if (toast.type !== 'percentage') {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, 3000);
    }
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  dbStatus: 'Checked: Jan 20, 2026',
  setDbStatus: (status) => set({ dbStatus: status }),

  activeCode: null,
  setActiveCode: (code) => set({ activeCode: code }),
}));
