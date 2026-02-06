import { CheckCircle2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ConfirmedCard - Confirmed Data Card
 * 
 * Displays data confirmed by the user, supporting expand/collapse and editing.
 * 
 * @param {string} title - Card title
 * @param {Array} dataLines - Array of data lines [{label, value}]
 * @param {Function} onEdit - Edit button click callback
 * @param {boolean} isExpanded - Whether it is expanded
 * @param {Function} onToggle - Expand/collapse toggle callback
 */
export const ConfirmedCard = ({ title, dataLines = [], onEdit, isExpanded, onToggle }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <div className="font-bold text-slate-900">{title}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">Confirmed · Click edit to modify</div>
            </div>
            <div className="flex items-center gap-2">
                {onEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
                {onToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                )}
            </div>
        </div>
        {isExpanded && dataLines.length > 0 && (
            <div className="mt-3 space-y-1 text-sm text-slate-600 border-t border-slate-100 pt-3">
                {dataLines.map((line, idx) => (
                    <div key={idx} className="flex justify-between gap-2">
                        <span className="text-slate-500">{line.label}</span>
                        <span className="font-semibold text-slate-800">{line.value}</span>
                    </div>
                ))}
            </div>
        )}
    </div>
);

export default ConfirmedCard;
