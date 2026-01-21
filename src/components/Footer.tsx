
import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Database, RotateCw } from 'lucide-react';
import { getDatabaseStats } from '../lib/db';
import { getRemoteVersion, syncDatabase } from '../lib/sync';
import toast from 'react-hot-toast';

import { useStore } from '../lib/store';

export const Footer: React.FC = () => {
    const isOnline = useStore((state) => state.isOnline);
    const setOnlineStatus = useStore((state) => state.setOnlineStatus);

    const [dbDate, setDbDate] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    const [hasAutoSynced, setHasAutoSynced] = useState(false);

    useEffect(() => {
        const checkConnection = async () => {
             // Basic Check
             if (!navigator.onLine) {
                 setOnlineStatus(false);
                 return;
             }

             // Active Ping Check
             try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                // Use random query param to bypass cache
                await fetch(`${import.meta.env.BASE_URL}vite.svg?t=${Date.now()}`, { 
                    method: 'HEAD', 
                    signal: controller.signal,
                    cache: 'no-store'
                });
                
                clearTimeout(timeoutId);
                setOnlineStatus(true);
             } catch (e) {
                 // Ping failed -> We are OFFLINE
                 console.log("[Connection] Ping failed, setting global Offline.");
                 setOnlineStatus(false);
             }
        };

     const handleStatus = () => {
          // Immediate quick check
          if (!navigator.onLine) setOnlineStatus(false);
          else checkConnection();
     };

        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        
        // Polling fallback
        const interval = setInterval(checkConnection, 10000); // Check every 10s

        refreshStats();
        // Check remote immediately
        checkConnection();
        checkRemote();

        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
            clearInterval(interval);
        };
    }, []);

    // Auto-Sync Effect
    useEffect(() => {
        if (isOnline && updateAvailable && !hasAutoSynced) {
            console.log("Auto-syncing on WiFi...");
            setHasAutoSynced(true); // Prevent loops
            handleSync();
        }
    }, [isOnline, updateAvailable, hasAutoSynced]);

    const refreshStats = async () => {
        const stats = await getDatabaseStats();
        if (stats && stats.last_updated) {
            const date = new Date(Number(stats.last_updated));
            if (stats.last_updated > 0) {
                 setDbDate(date.toLocaleDateString());
            } else {
                 setDbDate("Basic");
            }
        } else {
             setDbDate("Empty");
        }
    };

    const checkRemote = async () => {
        if (!navigator.onLine) return;
        const remoteTs = await getRemoteVersion();
        const localVs = localStorage.getItem('db_version');
        
        if (remoteTs && (!localVs || Number(localVs) < remoteTs)) {
            setUpdateAvailable(true);
        }
    }

    const handleSync = async () => {
        if (!isOnline) {
             // For auto-sync we might not want to show error if offline, but handleSync checks isOnline.
             // If manual click, we want error. If auto, maybe silent? 
             // Logic below handles it.
            toast.error("You are offline.");
            return;
        }
        setIsSyncing(true);
        const toastId = toast.loading("Updating Database...");
        try {
            const updated = await syncDatabase((msg) => {
                 // Update the loading toast message
                 toast.loading(msg, { id: toastId });
            });
            if (updated) {
                toast.success("Update Complete!", { id: toastId });
                await refreshStats();
                setUpdateAvailable(false);
            } else {
                toast.success("Already up to date", { id: toastId });
            }
        } catch (e) {
            console.error(e);
            toast.error("Update Failed", { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[10px] sm:text-xs text-slate-500 z-50 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 w-full justify-between">
                 <div className={`flex items-center gap-1.5 ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                    <span className="font-semibold hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                 </div>
                 
                 <div className="h-3 w-[1px] bg-slate-200"></div>

                 <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`flex items-center gap-1.5 transition-colors ${
                        updateAvailable || isSyncing
                        ? 'text-blue-600 font-bold animate-pulse' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                 >
                    {isSyncing ? (
                        <RotateCw size={14} className="animate-spin" />
                    ) : updateAvailable ? (
                        <RotateCw size={14} />
                    ) : (
                        <Database size={14} />
                    )}
                    <span>
                        {isSyncing ? 'Updating...' : updateAvailable ? 'Update Now' : dbDate ? `${dbDate}` : 'No Data'}
                    </span>
                 </button>
            </div>
        </div>
    );
};
