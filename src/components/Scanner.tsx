import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Search, History as HistoryIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { useProduct } from '../hooks/useProduct';
import { ResultCard } from './ResultCard';
import { useHistory } from '../hooks/useHistory';
import { HistoryList } from './HistoryList';

export const Scanner: React.FC = () => {
  const setView = useStore((state) => state.setView);
  const activeCode = useStore((state) => state.activeCode);
  const setActiveCode = useStore((state) => state.setActiveCode);
  
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [showSearch, setShowSearch] = React.useState(false);
  const [manualInput, setManualInput] = React.useState('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { data: productDetails, isLoading: isFetching } = useProduct(activeCode);
  const { data: history } = useHistory(5);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config: any = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            return { width: viewfinderWidth * 0.8, height: viewfinderHeight * 0.7 };
          },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          // experimental: {
          //   useBarCodeDetectorIfSupported: true
          // }
        };

        await html5QrCode.start(
          { 
             facingMode: "environment",
             // Explicitly request lower resolution to prevent iOS memory crashes
             width: { min: 640, ideal: 640, max: 1280 },
             height: { min: 480, ideal: 480, max: 720 } 
          },
          {
            fps: 10, // Dropped to 10 for maximum stability per reviewer suggestion
            // Use specific pixel values for qrbox to match low-res stream better
            // 250px is large enough for barcodes in a 480p stream
            qrbox: { width: 250, height: 250 },
            aspectRatio: config.aspectRatio,
            disableFlip: false,
          },
          (decodedText) => {
            if (!isMounted) return;

             // 1. VALIDATION: Filter out noise (shorter than 8 chars or non-numeric)
            const cleaned = decodedText.trim();
            if (cleaned.length < 8 || !/^\d+$/.test(cleaned)) {
                 // console.warn("[Scanner] Ignored garbage:", cleaned);
                 return;
            }

            // 2. Check for duplicates (only update if different)
            const currentActive = useStore.getState().activeCode;
            if (cleaned === currentActive) return;

            console.log("[Scanner] Valid Code Detected:", cleaned);
            setActiveCode(cleaned);
          },
          (errorMessage) => {
             // Ignore errors
          } 
        );
        
        if (isMounted) setIsInitializing(false);
      } catch (err) {
        console.error("Scanner error", err);
        if (isMounted) {
          setIsInitializing(false);
          setView('home');
        }
      }
    };

    const timer = setTimeout(startScanner, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
      }
    };
  }, [setView, setActiveCode]);

  // Performance Optimization: Pause scanner ONLY while processing/fetching
  // This satisfies "stops processing new frames until product result is return"
  // allowing continuous scanning once the result is shown.
  useEffect(() => {
    if (!scannerRef.current) return;
    
    const scanner = scannerRef.current;

    try {
        if (isFetching) {
             // If fetching data, pause specificially to save resources during the heavy lift
             console.log("[Scanner] Pausing for fetch...");
             scanner.pause(true); 
        } else {
            // Once result is returned (or if idle), ensure we are scanning
            // This 'resume' call might fail if already running, so we swallow errors
            scanner.resume(); 
        }
    } catch (e: any) {
        // Html5Qrcode throws if you resume while running or pause while paused.
        // limit noise
    }
  }, [isFetching]);

  return (
    <div className="fixed inset-0 bg-slate-950 z-40 flex flex-col font-sans overflow-hidden text-slate-900">
      {/* Top Half: Camera */}
      <div className="h-1/2 relative bg-black flex items-center justify-center overflow-hidden">
        {isInitializing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Initializing...</p>
          </div>
        )}

        {/* The Reader Container */}
        <div id="reader" className="w-full h-full"></div>

        {/* Scanning Guide Overlay */}
        {!isInitializing && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center pb-8">
             {/* Broad Scanning Zone - REMOVED ROUNDED CORNERS */}
             <div className="relative w-[90%] h-[75%] border border-white/40 overflow-hidden shadow-[0_0_0_100vmax_rgba(0,0,0,0.5)]">
                {/* Visual Scanning Effect */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-400/80 shadow-[0_0_15px_rgba(56,189,248,0.8)] animate-[scan_3s_ease-in-out_infinite]"></div>
                
                {/* Sharp Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>
             </div>
          </div>
        )}
      </div>

      {/* Lower Half: Product Details & Controls */}
      <div className="flex-1 bg-slate-50 flex flex-col relative overflow-hidden rounded-t-[32px] -mt-8 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        
        {/* New Header Control Bar */}
        {/* New Header Control Bar */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-slate-50">
           <button 
             onClick={() => {
               setActiveCode(null);
               setView('home');
             }}
             className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-300 active:scale-95 transition-all"
           >
             <X size={16} />
           </button>
           
           <div className="w-8 h-1 bg-slate-200 rounded-full" /> {/* Smaller handle hint */}

           <button 
             onClick={() => setShowSearch(!showSearch)}
             className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showSearch ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
           >
             <Search size={16} />
           </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
            
            {/* Manual Search Input */}
            {showSearch && (
              <div className="mb-6 mt-2.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualInput.trim()) {
                      setActiveCode(manualInput.trim());
                      setManualInput('');
                      setShowSearch(false);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter barcode manually..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    autoFocus
                  />
                  <button type="submit" className="bg-blue-600 text-white px-4 rounded-xl font-bold text-sm tracking-wide">
                    GO
                  </button>
                </form>
              </div>
            )}

            {/* Product Result or Welcome */}
            {activeCode ? (
               <ResultCard 
                 data={productDetails} 
                 isLoading={isFetching} 
                 code={activeCode}
               />
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center mb-8">
                 <p className="text-slate-400 text-sm font-medium">
                   Scan a barcode above or search manually.
                 </p>
              </div>
            )}

            {/* Recent History Section */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <HistoryIcon size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Recent History</h3>
              </div>
              
              <HistoryList 
                history={history || []} 
                onSelect={setActiveCode}
                activeCode={activeCode} 
              />
            </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0.3; }
          50% { top: 90%; opacity: 1; }
        }
        #reader video, #reader canvas {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center !important;
        }
        #reader {
          border: none !important;
        }
        /* Hide the library's default scan region border to only show our custom one */
        #reader__scan_region, #qr-shaded-region {
          border: none !important;
          display: none !important;
        }
        #reader__dashboard {
          display: none !important;
        }
      `}} />
    </div>
  );
};
