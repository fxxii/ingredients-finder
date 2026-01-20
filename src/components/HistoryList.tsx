import React from 'react';
import { Search } from 'lucide-react';

interface HistoryItem {
  code: string;
  productName?: string;
  scannedAt: number;
  status?: string; 
  palmOilText?: string;
}

interface HistoryListProps {
  history: HistoryItem[];
  onSelect: (code: string) => void;
  activeCode?: string | null;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, activeCode }) => {
  // Filter out the active product if provided
  const displayHistory = activeCode 
    ? history.filter(item => item.code !== activeCode)
    : history;

  if (!displayHistory || displayHistory.length === 0) {
    return (
      <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-300 text-sm italic">
        No recent scans found
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {displayHistory.map((item) => (
        <button 
          key={item.scannedAt}
          onClick={() => onSelect(item.code)}
          className="w-full bg-white px-5 py-4 rounded-3xl shadow-sm border border-slate-200/60 flex items-center justify-between hover:bg-slate-50 transition-all text-left group overflow-hidden"
        >
           <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                      item.status === 'green' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 
                      item.status === 'red' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 
                      'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                    }`} />
             
             <div className="flex flex-col flex-1 min-w-0">
               <span className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                 {item.productName || 'Unknown Product'}
               </span>
               <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                   item.status === 'red' ? 'text-rose-500' : 'text-emerald-500'
                 }`}>
                   {item.palmOilText}
                 </span>
               </div>
             </div>

             <div className="flex-shrink-0 text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-full uppercase tracking-tighter">
               {new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
           </div>
           <Search size={16} className="text-slate-200 group-hover:text-blue-400 ml-3 transition-colors" />
        </button>
      ))}
    </div>
  );
};
