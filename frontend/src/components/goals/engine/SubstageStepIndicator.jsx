/**
 * SubstageStepIndicator - Substage Step Indicator
 * 
 * Displays the progress and status of the current substage.
 * 
 * @param {Array} config - Array of substage configurations
 * @param {Object} state - Current state object
 * @param {number} state.currentIndex - Current substage index
 * @param {Object} state.statusById - Status mapping for each substage
 */
export const SubstageStepIndicator = ({ config, state }) => {
    const current = state?.currentIndex ?? 0;
    
    return (
        <div className="flex items-center gap-3 mb-4">
            {config.map((item, idx) => {
                const status = state?.statusById?.[item.id] || 'collecting';
                const isActive = idx === current;
                const isDone = status === 'confirmed';
                const nextExists = idx < config.length - 1;
                
                return (
                    <div key={item.id} className="flex items-center gap-3">
                        <div className="relative group">
                            <div
                                className={`
                                    w-4 h-4 rounded-full border-2 transition-all
                                    ${isDone 
                                        ? 'border-green-500 bg-green-500/20' 
                                        : isActive 
                                            ? 'border-slate-900 bg-slate-900' 
                                            : 'border-slate-300 bg-white'
                                    }
                                `}
                            />
                            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition">
                                {item.label}
                            </div>
                        </div>
                        {nextExists && (
                            <div className={`h-0.5 w-12 sm:w-20 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`}></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default SubstageStepIndicator;
