import React, { useEffect, useState, useRef } from 'react';
import { X, Trash2, Terminal, Bug } from 'lucide-react';

interface LogEntry {
  ts: string;
  type: 'log' | 'warn' | 'error';
  args: any[];
}

const STORAGE_KEY = 'foodscan_debug_logs';

export const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing logs from storage to see what happened before reload
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLogs(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load logs", e);
    }

    // Hook into console
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
      const entry: LogEntry = {
        ts: new Date().toISOString().split('T')[1].slice(0, 8), // HH:MM:SS
        type,
        args: args.map(a => {
            try {
                if (a instanceof Error) return a.toString();
                if (typeof a === 'object') return JSON.stringify(a, null, 2);
                return String(a);
            } catch (e) {
                return '[Circular/Unserializable]';
            }
        })
      };

      setLogs(prev => {
        const next = [...prev, entry].slice(-50); // Keep last 50
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    };

    console.log = (...args) => {
      addLog('log', args);
      originalLog.apply(console, args);
    };

    console.warn = (...args) => {
      addLog('warn', args);
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      addLog('error', args);
      originalError.apply(console, args);
    };

    const handleError = (event: ErrorEvent) => {
        addLog('error', ["[Global Error]", event.message, event.filename, event.lineno]);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
        addLog('error', ["[Unhandled Rejection]", event.reason]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[9999] w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center shadow-lg backdrop-blur"
      >
        <Bug size={20} />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 h-[50vh] bg-slate-900 z-[9999] flex flex-col shadow-2xl border-t border-slate-700 animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
            <Terminal size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-200">Debug Console</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={clearLogs} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400">
                <Trash2 size={16} />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                <X size={16} />
            </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 font-mono text-[10px] space-y-1">
        {logs.length === 0 && <span className="text-slate-500 italic">No logs...</span>}
        {logs.map((log, i) => (
          <div key={i} className={`flex gap-2 break-all ${
            log.type === 'error' ? 'text-red-400' : 
            log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'
          }`}>
            <span className="opacity-50 shrink-0">[{log.ts}]</span>
            <span>{log.args.join(' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
