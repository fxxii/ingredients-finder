import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertTriangle, Image as ImageIcon, X } from 'lucide-react';

interface ResultCardProps {
  isLoading?: boolean;
  data?: any; 
  onReset?: () => void;
  code?: string | null;
}

export const ResultCard: React.FC<ResultCardProps> = ({ isLoading, data, code, onReset }) => {
  const [showIngredients, setShowIngredients] = useState(false);
  const [showAdditives, setShowAdditives] = useState(false);
  const [showPalmDetails, setShowPalmDetails] = useState(false);

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center min-h-[200px]"
      >
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-center">
          <p className="text-neutral-500 font-medium">Analyzing product...</p>
          {code && (
            <p className="text-[10px] font-mono text-neutral-400 mt-2 uppercase tracking-widest">
              Code: {code}
            </p>
          )}
        </div>
      </motion.div>
    );    
  }

  if (!data) return null;

  if (data.source === 'none') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-neutral-50 rounded-2xl p-6 border-2 border-dashed border-neutral-200 text-center"
      >
        <p className="text-neutral-600 font-medium mb-2">Product Not Found</p>
        <p className="text-sm text-neutral-400">
          This barcode is not yet in our databases.
        </p>
      </motion.div>
    );
  }

  // Parse Data
  const p = data.data;
  const palmTags = JSON.parse(p.palm_oil_tags || '[]');
  const palmMayBeTags = JSON.parse(p.palm_oil_may_be_tags || '[]');
  
  const hasPalm = palmTags.length > 0;
  const mayHavePalm = palmMayBeTags.length > 0;

  let statusColor = 'border-green-500';
  let bgColor = 'bg-emerald-50';
  let textColor = 'text-green-900';
  let iconColor = 'text-emerald-600';
  let statusText = 'No Palm Oil Detected';

  if (hasPalm) {
    statusColor = 'border-red-500';
    bgColor = 'bg-red-50';
    textColor = 'text-red-900';
    iconColor = 'text-red-600';
    statusText = 'Contains Palm Oil';
  } else if (mayHavePalm) {
    statusColor = 'border-orange-500';
    bgColor = 'bg-orange-50';
    textColor = 'text-orange-900';
    iconColor = 'text-orange-600';
    statusText = 'May Contain Palm Oil';
  }

  const nutrientLevels = JSON.parse(p.nutrient_levels || '{}');
  const additives = JSON.parse(p.additives_tags || '[]');

  // Get Score Colors/Labels
  const getNutriColor = (grade: string) => {
    switch(grade?.toLowerCase()) {
      case 'a': return 'bg-emerald-600';
      case 'b': return 'bg-emerald-400';
      case 'c': return 'bg-yellow-400';
      case 'd': return 'bg-orange-500';
      case 'e': return 'bg-red-600';
      default: return 'bg-neutral-300';
    }
  };

  const highRisks = Object.entries(nutrientLevels).filter(([_, lvl]) => lvl === 'high');

  return (
     <motion.div 
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className={`bg-white rounded-2xl shadow-lg border-l-8 ${statusColor} overflow-hidden`}
     >
       <div className="p-4">
         {/* Header with Thumbnail */}
         <div className="flex gap-4 mb-3">
            <div className="w-20 h-20 shrink-0 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-100 shadow-sm flex items-center justify-center">
              {p.image_url ? (
                <img 
                  src={p.image_url} 
                  alt={p.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                    // Create fallback element visually using existing structure
                    const icon = document.createElement('div');
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-300"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                    e.currentTarget.parentElement?.appendChild(icon.firstChild!);
                  }}
                />
              ) : (
                <ImageIcon className="text-neutral-300" size={24} />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
               <div className="flex items-start justify-between gap-2">
                 <div>
                    <h3 className="text-lg font-bold text-neutral-800 leading-tight mb-1">
                      {p.name || 'Unknown Product'}
                    </h3>
                    <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                      {p.code}
                    </p>
                 </div>
               </div>


               {/* Badges */}
               <div className="flex flex-wrap items-center gap-2 mt-3">
                 {p.nutriscore_grade && (
                   <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase text-white shadow-sm ${getNutriColor(p.nutriscore_grade)}`}>
                     Nutri-Score: <span className="text-sm">{p.nutriscore_grade.toUpperCase()}</span>
                   </span>
                 )}
                 {p.nova_group && (
                   <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase bg-neutral-800 text-white shadow-sm">
                     NOVA: <span className="text-sm">{p.nova_group}</span>
                   </span>
                 )}
               </div>
            </div>
            
            {/* Close Button (if reset handler provided) */}
            {onReset && (
              <button 
                onClick={onReset}
                className="w-8 h-8 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-700 rounded-full transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
         </div>
         
         {/* Palm Oil Status */}
         <div className={`rounded-xl mb-3 overflow-hidden ${bgColor} ${textColor}`}>
           <button
             onClick={() => setShowPalmDetails(!showPalmDetails)}
             disabled={!hasPalm && !mayHavePalm}
             className="w-full py-2 px-4 flex items-center justify-between text-left transition-colors"
           >
             <div className="flex items-center gap-3">
               <AlertTriangle size={20} className={iconColor} />
               <span className="font-bold text-sm leading-tight">{statusText}</span>
             </div>
             {(hasPalm || mayHavePalm) && (
               showPalmDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />
             )}
           </button>

           <AnimatePresence>
             {showPalmDetails && (hasPalm || mayHavePalm) && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="px-4 pb-4"
               >
                 {hasPalm && (
                   <div className="text-xs opacity-80">
                     <strong>Detected:</strong> {palmTags.map((t: string) => t.replace('en:', '').replace(/-/g, ' ')).join(', ')}
                   </div>
                 )}
                 {!hasPalm && mayHavePalm && (
                   <div className="text-xs opacity-80">
                     <strong>Potential:</strong> {palmMayBeTags.map((t: string) => t.replace('en:', '').replace(/-/g, ' ')).join(', ')}
                   </div>
                 )}
               </motion.div>
             )}
           </AnimatePresence>
         </div>

         {/* Nutrient Warnings */}
         {highRisks.length > 0 && (
           <div className="mb-3">
             <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">High Levels</h4>
             <div className="flex flex-wrap gap-2">
               {highRisks.map(([key]) => (
                 <span key={key} className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full capitalize">
                   High {key}
                 </span>
               ))}
               {p.nova_group === 4 && (
                 <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                   Ultra-Processed
                 </span>
               )}
             </div>
           </div>
         )}
         
         {/* Additives Section */}
         {additives.length > 0 && (
           <div className="border-t border-neutral-100">
             <button 
               onClick={() => setShowAdditives(!showAdditives)}
               className="w-full flex items-center justify-between py-2 text-sm font-bold text-neutral-600 hover:text-blue-600 transition-colors"
             >
               <span>Additives ({additives.length})</span>
               {showAdditives ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>

             <AnimatePresence>
                {showAdditives && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                     <div className="flex flex-wrap gap-2 pb-4">
                       {additives.map((tag: string) => (
                         <span key={tag} className="px-2 py-1 bg-neutral-100 text-neutral-600 border border-neutral-200 text-[10px] font-bold rounded uppercase">
                           {tag.replace('en:', '').toUpperCase()}
                         </span>
                       ))}
                     </div>
                  </motion.div>
                )}
             </AnimatePresence>
           </div>
         )}

         {/* Ingredients Toggle */}
         <button 
           onClick={() => setShowIngredients(!showIngredients)}
           className="w-full flex items-center justify-between py-3 border-t border-neutral-100 text-sm font-bold text-neutral-600 hover:text-blue-600 transition-colors"
         >
           <span>Full Ingredients List</span>
           {showIngredients ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
         </button>

         <AnimatePresence>
            {showIngredients && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-neutral-500 leading-relaxed pb-4 capitalize">
                  {p.ingredients || 'No ingredient list available.'}
                </p>
              </motion.div>
            )}
         </AnimatePresence>
       </div>
       
       <div className="bg-neutral-50 px-6 py-3 border-t text-xs text-neutral-400 flex justify-between">
          <span>Source: {data.source === 'local' ? 'Local DB' : 'Open Food Facts'}</span>
       </div>
     </motion.div>
   );
};
