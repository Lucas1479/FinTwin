import React, { useState, useEffect, useRef } from 'react';
import { 
    Palmtree, 
    DollarSign, 
    Calendar,
    Users,
    Clock,
    MapPin
} from 'lucide-react';
import LocationPickerModal from '../LocationPickerModal';

const TravelGoalForm = ({ initialValues, onChange }) => {
    const [details, setDetails] = useState({
        destination: initialValues?.goal_details?.destination || '',
        coordinates: initialValues?.goal_details?.coordinates || null,
        travelers_count: initialValues?.goal_details?.travelers_count || 2,
        duration_days: initialValues?.goal_details?.duration_days || 14
    });

    const [meta, setMeta] = useState({
        goal_name: initialValues?.goal_name || 'My Next Adventure',
        target_amount: initialValues?.target_amount || 5000,
        due_date: initialValues?.due_date || ''
    });

    const lastSentPayloadRef = useRef(null);
    const isInternalChangeRef = useRef(false);

    useEffect(() => {
        if (!initialValues || isInternalChangeRef.current) {
            isInternalChangeRef.current = false;
            return;
        }

        if (initialValues.goal_details) {
            setDetails(prev => ({
                ...prev,
                destination: initialValues.goal_details.destination ?? prev.destination,
                travelers_count: initialValues.goal_details.travelers_count ?? prev.travelers_count,
                duration_days: initialValues.goal_details.duration_days ?? prev.duration_days
            }));
        }
        if (initialValues.goal_name) setMeta(prev => ({ ...prev, goal_name: initialValues.goal_name }));
        if (initialValues.target_amount) setMeta(prev => ({ ...prev, target_amount: initialValues.target_amount }));
        if (initialValues.due_date) setMeta(prev => ({ ...prev, due_date: initialValues.due_date }));
    }, [initialValues]);

    useEffect(() => {
        const payload = {
            goal_name: meta.goal_name,
            target_amount: meta.target_amount,
            due_date: meta.due_date,
            goal_details: details
        };

        const payloadKey = JSON.stringify(payload);

        if (payloadKey !== lastSentPayloadRef.current) {
            lastSentPayloadRef.current = payloadKey;
            isInternalChangeRef.current = true;
            onChange(payload);
        }
    }, [details, meta, onChange]);

    const handleDetailChange = (key, value) => setDetails(prev => ({ ...prev, [key]: value }));
    const handleMetaChange = (key, value) => setMeta(prev => ({ ...prev, [key]: value }));

    const handleLocationSelect = (loc) => {
        setDetails(prev => ({ 
            ...prev, 
            destination: loc.name,
            coordinates: { lat: loc.lat, lng: loc.lng }
        }));
        setIsMapOpen(false);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-br from-cyan-50 to-blue-100/50 rounded-3xl p-6 border border-cyan-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-cyan-600">
                        <Palmtree size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Travel & Adventure</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Saving for a trip to remember.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                    <input 
                        type="text" 
                        value={meta.goal_name}
                        onChange={(e) => handleMetaChange('goal_name', e.target.value)}
                        className="w-full input-base"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Destination</label>
                        <div className="relative flex-1">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <MapPin size={16} />
                            </div>
                            <input 
                                type="text" 
                                value={details.destination}
                                placeholder="e.g. Europe, Bali, Queenstown"
                                onChange={(e) => handleDetailChange('destination', e.target.value)}
                                className="w-full input-base pl-10"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Total Budget ($)</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <DollarSign size={16} />
                            </div>
                            <input 
                                type="number" 
                                value={meta.target_amount}
                                onChange={(e) => handleMetaChange('target_amount', Number(e.target.value))}
                                className="w-full input-base pl-10 font-bold"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-slate-700">Number of Travelers</label>
                            <span className="text-2xl font-black text-cyan-600">{details.travelers_count}</span>
                        </div>
                        <input 
                            type="range" 
                            min={1} max={10} 
                            value={details.travelers_count}
                            onChange={(e) => handleDetailChange('travelers_count', Number(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                            <span>Solo</span>
                            <span>Couple</span>
                            <span>Group</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-slate-700">Duration (Days)</label>
                            <span className="text-2xl font-black text-cyan-600">{details.duration_days}</span>
                        </div>
                        <input 
                            type="range" 
                            min={1} max={60} 
                            value={details.duration_days}
                            onChange={(e) => handleDetailChange('duration_days', Number(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                            <span>1 Day</span>
                            <span>2 Weeks</span>
                            <span>2 Months</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target Departure Date</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Calendar size={16} />
                        </div>
                        <input 
                            type="date" 
                            value={meta.due_date ? new Date(meta.due_date).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleMetaChange('due_date', e.target.value)}
                            className="w-full input-base pl-10"
                        />
                    </div>
                </div>
            </div>

            {/* Location Picker Inline */}
            <LocationPickerModal 
                onSelect={handleLocationSelect}
                initialLocation={details.coordinates}
            />
        </div>
    );
};

export default TravelGoalForm;

