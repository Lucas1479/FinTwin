import React from 'react';
import { 
    HelpCircle, 
    Calendar, 
    DollarSign, 
    Hash, 
    Check, 
    ChevronDown 
} from 'lucide-react';

/**
 * Dynamic Form Renderer
 * Renders a form based on a JSON Schema provided by the Backend/AI.
 * 
 * @param {Object} schema - The form schema (fields array)
 * @param {Object} value - The current form values
 * @param {Function} onChange - Callback when any field changes
 */
const DynamicFormRenderer = ({ schema, value = {}, onChange }) => {
    
    if (!schema || !schema.fields) {
        return <div className="text-slate-400 text-sm">No form schema provided.</div>;
    }

    const handleChange = (fieldName, fieldValue) => {
        // Support nested keys like "goal_details.retirement_age"
        // For simplicity in this version, we'll just update the flat structure 
        // or simple nested structure if easy, but typically React forms like flat or use a library.
        // Here we will do a simple deep merge logic or just flatten for now.
        
        // Deep set helper could be used here, but for MVP let's assume parent handles nesting
        // or we pass back the full updated object.
        
        const updated = { ...value };
        
        if (fieldName.includes('.')) {
            const [parent, child] = fieldName.split('.');
            updated[parent] = {
                ...updated[parent],
                [child]: fieldValue
            };
        } else {
            updated[fieldName] = fieldValue;
        }

        onChange(updated);
    };

    const getValue = (fieldName) => {
        if (fieldName.includes('.')) {
            const [parent, child] = fieldName.split('.');
            return value[parent]?.[child] ?? '';
        }
        return value[fieldName] ?? '';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {schema.title && (
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900">{schema.title}</h3>
                    {schema.description && <p className="text-sm text-slate-500">{schema.description}</p>}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {schema.fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                        <div className="flex justify-between">
                            <label className="block text-sm font-semibold text-slate-700">
                                {field.label} 
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.helpText && (
                                <div className="group relative flex items-center">
                                    <HelpCircle size={14} className="text-slate-400 cursor-help" />
                                    <div className="absolute right-0 bottom-6 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {field.helpText}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="relative">
                            {/* --- TEXT / TEXTAREA --- */}
                            {(field.type === 'text' || field.type === 'textarea') && (
                                field.type === 'textarea' ? (
                                    <textarea
                                        value={getValue(field.name)}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none h-24"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={getValue(field.name)}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                )
                            )}

                            {/* --- NUMBER / CURRENCY --- */}
                            {(field.type === 'number' || field.type === 'currency') && (
                                <div className="relative">
                                    {field.type === 'currency' && (
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <DollarSign size={16} />
                                        </div>
                                    )}
                                    <input
                                        type="number"
                                        value={getValue(field.name)}
                                        onChange={(e) => handleChange(field.name, Number(e.target.value))}
                                        min={field.min}
                                        max={field.max}
                                        step={field.step || 1}
                                        className={`w-full bg-white border border-slate-200 rounded-xl py-3 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono ${
                                            field.type === 'currency' ? 'pl-10 pr-4' : 'px-4'
                                        }`}
                                    />
                                </div>
                            )}

                            {/* --- DATE --- */}
                            {field.type === 'date' && (
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={getValue(field.name) ? new Date(getValue(field.name)).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pl-10 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <Calendar size={16} />
                                    </div>
                                </div>
                            )}

                            {/* --- SELECT --- */}
                            {field.type === 'select' && (
                                <div className="relative">
                                    <select
                                        value={getValue(field.name)}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 appearance-none text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all cursor-pointer"
                                    >
                                        <option value="" disabled>Select an option</option>
                                        {field.options?.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            )}

                             {/* --- SLIDER --- */}
                             {field.type === 'slider' && (
                                <div className="pt-2 px-1">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-400">{field.min || 0}</span>
                                        <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                            {getValue(field.name)} {field.unit || '%'}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">{field.max || 100}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={field.min || 0}
                                        max={field.max || 100}
                                        step={field.step || 1}
                                        value={getValue(field.name) || 0}
                                        onChange={(e) => handleChange(field.name, Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            )}

                            {/* --- TOGGLE --- */}
                            {field.type === 'toggle' && (
                                <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                    <span className="text-sm text-slate-600 font-medium select-none">
                                        {field.label}
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={!!getValue(field.name)}
                                            onChange={(e) => handleChange(field.name, e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </div>
                                </label>
                            )}

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DynamicFormRenderer;

