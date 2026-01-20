import React from 'react';
import { useStore } from '../lib/store';
import { Scan, History } from 'lucide-react';
import { ResultCard } from '../components/ResultCard';
import { HistoryList } from '../components/HistoryList';
import { useProduct } from '../hooks/useProduct';
import { useHistory } from '../hooks/useHistory';

export const HomePage: React.FC = () => {
  const setView = useStore((state) => state.setView);
  // dbStatus removed in favor of global Footer
  const activeCode = useStore((state) => state.activeCode);
  const setActiveCode = useStore((state) => state.setActiveCode);

  const { data: productData, isLoading } = useProduct(activeCode);
  const { data: history } = useHistory(5);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Main Content Area */}
      <main className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full pt-12 gap-10">
        
        {/* State Logic: Result vs Dashboard */}
        <div className="space-y-8">
          {productData || isLoading ? (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <ResultCard 
                 data={productData} 
                 isLoading={isLoading} 
                 onReset={() => setActiveCode(null)} 
                 code={activeCode}
               />
             </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-12 py-8">
               <div className="space-y-2">
                 <h1 className="text-4xl font-black text-slate-900 tracking-tight">FoodScan</h1>
                 <p className="text-slate-500 font-medium">Ingredients Finder</p>
               </div>

               <button 
                 onClick={() => setView('scanner')}
                 className="group relative w-48 h-48 bg-white rounded-full shadow-2xl flex flex-col items-center justify-center border-8 border-blue-50 transition-all hover:scale-105 active:scale-95 hover:border-blue-100"
               >
                 <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse group-hover:bg-blue-500/10"></div>
                 <Scan size={64} className="text-blue-600 mb-2 group-hover:text-blue-700 transition-colors" />
                 <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tap to Scan</span>
               </button>

               <div className="w-full">
                 <p className="text-sm text-slate-400">
                   Instant palm oil detection for your groceries
                 </p>
               </div>
            </div>
          )}
        </div>
        
        {/* Recent Scans Section */}
        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <History size={18} className="text-slate-400" />
              <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wider">Recent History</h3>
            </div>
          </div>
          
          <div className="space-y-2.5">
             <HistoryList 
               history={history || []} 
               onSelect={setActiveCode} 
             />
          </div>
        </section>
      </main>

      {/* Footer Status handled by AppLayout */}
    </div>
  );
};
