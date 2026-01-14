import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Plane, 
    Calendar as CalendarIcon, 
    Users, 
    MapPin, 
    BedDouble, 
    Utensils, 
    Car, 
    Wallet, 
    TrendingUp, 
    AlertCircle, 
    CheckCircle2, 
    Calculator, 
    PiggyBank, 
    Banknote,
    Briefcase,
    Info,
    Brain,
    ArrowRight,
    Map as MapIcon,
    Plus,
    X,
    Maximize2,
    Minimize2,
    Trash2,
    Edit3
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- LEAFLET ICON FIX & CUSTOM STYLES ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Numbered Icon
const createNumberedIcon = (number) => {
    return L.divIcon({
        className: 'custom-pin-icon',
        html: `<div style="
            background-color: #4f46e5;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">${number}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

// --- DATABASE: REGIONAL COST INDEX (2026 Estimates in NZD) ---
const REGIONAL_DATA = {
    Europe: { 
        label: 'Europe', icon: '🏰', 
        flightBase: 2400, hotelBase: 250, foodBase: 120, transportBase: 50,
        center: [48.8566, 2.3522], zoom: 4 // Paris
    },
    USA: { 
        label: 'USA', icon: '🗽', 
        flightBase: 2200, hotelBase: 300, foodBase: 150, transportBase: 80,
        center: [37.0902, -95.7129], zoom: 4
    },
    Japan: { 
        label: 'Japan', icon: '🌸', 
        flightBase: 1600, hotelBase: 200, foodBase: 100, transportBase: 40,
        center: [36.2048, 138.2529], zoom: 5
    },
    SEAsia: { 
        label: 'S.E. Asia', icon: '🍜', 
        flightBase: 1300, hotelBase: 80, foodBase: 60, transportBase: 30,
        center: [13.7563, 100.5018], zoom: 5 // Bangkok
    },
    Pacific: { 
        label: 'Pacific Is.', icon: '🏝️', 
        flightBase: 700, hotelBase: 350, foodBase: 120, transportBase: 40,
        center: [-18.1416, 178.4419], zoom: 6 // Fiji
    },
    Australia: { 
        label: 'Australia', icon: '🦘', 
        flightBase: 600, hotelBase: 220, foodBase: 110, transportBase: 60,
        center: [-25.2744, 133.7751], zoom: 4
    }
};

// --- MAP COMPONENTS ---
const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const LocationMarker = ({ onAddPin }) => {
    useMapEvents({
        click(e) {
            onAddPin(e.latlng);
        },
    });
    return null;
};

// --- HELPER: REVERSE GEOCODING ---
const fetchLocationName = async (lat, lng) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: {
                'User-Agent': 'MoneyMindsFintechApp/1.0'
            }
        });
        const data = await response.json();
        if (data && data.address) {
            return data.address.city || data.address.town || data.address.village || data.address.hamlet || data.address.county || data.name || "Unknown Location";
        }
        return "Unknown Location";
    } catch (error) {
        console.error("Geocoding failed", error);
        return "Location";
    }
};

// --- STAGE 1: VISION (Detailed Budget Builder) ---
const TravelVisionForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'Dream Trip',
        destination: initialValues.goal_details?.destination || 'Europe',
        adults: initialValues.goal_details?.adults || 2,
        children: initialValues.goal_details?.children || 0,
        start_date: initialValues.goal_details?.start_date || '',
        end_date: initialValues.goal_details?.end_date || '',
        flight_class: initialValues.goal_details?.flight_class || 'economy',
        accommodation_style: initialValues.goal_details?.accommodation_style || 'hotel',
        lifestyle_level: initialValues.goal_details?.lifestyle_level || 'moderate',
        estimated_cost: initialValues.goal_details?.estimated_cost || 0,
        duration_days: initialValues.goal_details?.duration_days || 14,
        notes: initialValues.goal_details?.notes || '',
        itinerary_pins: initialValues.goal_details?.itinerary_pins || []
    });

    const [showMap, setShowMap] = useState(false);
    const [isLoadingName, setIsLoadingName] = useState(false);
    const isInternalUpdate = useRef(false);

    // Map Center Logic
    const currentRegion = REGIONAL_DATA[formData.destination] || REGIONAL_DATA.Europe;
    
    // --- MAP HANDLERS ---
    const handleAddPin = async (latlng) => {
        setIsLoadingName(true);
        // Optimistic add with loading state
        const tempId = Date.now();
        const initialName = "Locating...";
        
        setFormData(prev => ({
            ...prev,
            itinerary_pins: [...prev.itinerary_pins, {
                id: tempId,
                lat: latlng.lat,
                lng: latlng.lng,
                note: initialName
            }]
        }));

        // Fetch name
        const locationName = await fetchLocationName(latlng.lat, latlng.lng);
        
        // Update name
        setFormData(prev => ({
            ...prev,
            itinerary_pins: prev.itinerary_pins.map(p => 
                p.id === tempId ? { ...p, note: locationName } : p
            )
        }));
        setIsLoadingName(false);
    };

    const handleUpdatePin = (id, note) => {
        setFormData(prev => ({
            ...prev,
            itinerary_pins: prev.itinerary_pins.map(p => p.id === id ? { ...p, note } : p)
        }));
    };

    const handleDeletePin = (id) => {
        setFormData(prev => ({
            ...prev,
            itinerary_pins: prev.itinerary_pins.filter(p => p.id !== id)
        }));
    };

    // --- LOGIC: Cost Engine (Same as before) ---
    const costBreakdown = useMemo(() => {
        const region = REGIONAL_DATA[formData.destination] || REGIONAL_DATA.Europe;
        let days = 14;
        if (formData.start_date && formData.end_date) {
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);
            const diff = end - start;
            days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        const FLIGHT_MULTS = { economy: 1.0, premium: 1.8, business: 4.0 };
        const ACC_MULTS = { hostel: 0.4, airbnb: 0.9, hotel: 1.0, resort: 2.5 };
        const LIFE_MULTS = { frugal: 0.6, moderate: 1.0, lavish: 2.0 };

        let seasonMult = 1.0;
        if (formData.start_date) {
            const month = new Date(formData.start_date).getMonth();
            if (month === 11 || month === 0 || month === 6) seasonMult = 1.3;
            else if (month === 4 || month === 8) seasonMult = 0.9;
        }

        const flightCost = (region.flightBase * FLIGHT_MULTS[formData.flight_class] * seasonMult) * (formData.adults + (formData.children * 0.85));
        const roomsNeeded = Math.ceil(formData.adults / 2);
        const familySurcharge = formData.children > 0 ? 1.4 : 1.0; 
        const dailyAcc = (region.hotelBase * ACC_MULTS[formData.accommodation_style] * seasonMult) * roomsNeeded * familySurcharge;
        const totalAcc = dailyAcc * days;
        const dailyPerAdult = (region.foodBase + region.transportBase) * LIFE_MULTS[formData.lifestyle_level];
        const dailyPerChild = dailyPerAdult * 0.6;
        const totalLifestyle = (dailyPerAdult * formData.adults + dailyPerChild * formData.children) * days;
        const total = Math.round(flightCost + totalAcc + totalLifestyle);

        return { days, seasonMult, flightCost, totalAcc, totalLifestyle, total, dailyAvg: Math.round(total / days) };

    }, [formData.destination, formData.adults, formData.children, formData.start_date, formData.end_date, formData.flight_class, formData.accommodation_style, formData.lifestyle_level]);

    // --- SYNC ---
    useEffect(() => {
        // --- FIX: Don't overwrite if we just synced from AI/InitialValues ---
        const isInitialSync = 
            formData.destination === (initialValues.goal_details?.destination || 'Europe') &&
            formData.adults === (initialValues.goal_details?.adults || 2) &&
            formData.children === (initialValues.goal_details?.children || 0) &&
            formData.flight_class === (initialValues.goal_details?.flight_class || 'economy') &&
            formData.accommodation_style === (initialValues.goal_details?.accommodation_style || 'hotel') &&
            formData.lifestyle_level === (initialValues.goal_details?.lifestyle_level || 'moderate') &&
            formData.start_date === (initialValues.goal_details?.start_date || '') &&
            formData.end_date === (initialValues.goal_details?.end_date || '');

        if (isInitialSync && initialValues.target_amount) {
            return;
        }

        isInternalUpdate.current = true;
        onChange?.({
            goal_name: formData.goal_name,
            target_amount: costBreakdown.total,
            goal_details: {
                ...initialValues.goal_details,
                ...formData,
                estimated_cost: costBreakdown.total,
                duration_days: costBreakdown.days,
                cost_breakdown: costBreakdown
            }
        });
    }, [formData, costBreakdown.total]);

    useEffect(() => {
        if (!initialValues) return;
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        if (initialValues.goal_details) {
            setFormData(prev => ({
                ...prev,
                ...initialValues.goal_details,
            }));
        }
    }, [initialValues]);

    return (
        <div className="space-y-6 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-sky-50 to-blue-100/50 rounded-3xl p-6 border border-sky-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-sky-600">
                        <Briefcase size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Trip Architect</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Plan your journey on the map. We'll auto-calculate costs based on your itinerary.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* LEFT: Configuration (8 Cols) */}
                <div className="xl:col-span-7 space-y-8">
                    
                    {/* 1. BASICS & MAP TOGGLE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Region</label>
                            <select 
                                value={formData.destination}
                                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                                className="w-full input-base"
                            >
                                {Object.entries(REGIONAL_DATA).map(([key, data]) => (
                                    <option key={key} value={key}>{data.icon} {data.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowMap(!showMap)}
                            className={`h-[46px] flex items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-all ${
                                showMap 
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                            }`}
                        >
                            <MapIcon size={16} />
                            {showMap ? 'Hide Map' : 'Start Planning Route'}
                        </button>
                    </div>

                    {/* 2. MAP COMPONENT (Collapsible) */}
                    {showMap && (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50 relative animate-fade-in flex flex-col">
                            <div className="h-[400px] w-full z-0 relative">
                                <MapContainer 
                                    center={currentRegion.center} 
                                    zoom={currentRegion.zoom} 
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={false}
                                >
                                    <TileLayer
                                        attribution='&copy; OpenStreetMap'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapController center={currentRegion.center} zoom={currentRegion.zoom} />
                                    <LocationMarker onAddPin={handleAddPin} />
                                    
                                    {/* Route Line */}
                                    {formData.itinerary_pins.length > 1 && (
                                        <Polyline 
                                            positions={formData.itinerary_pins.map(p => [p.lat, p.lng])}
                                            pathOptions={{ color: '#4f46e5', dashArray: '10, 10', weight: 3, opacity: 0.6 }}
                                        />
                                    )}

                                    {/* Pins */}
                                    {formData.itinerary_pins.map((pin, idx) => (
                                        <Marker 
                                            key={pin.id} 
                                            position={[pin.lat, pin.lng]}
                                            icon={createNumberedIcon(idx + 1)}
                                        >
                                            {/* Minimal Popup - mostly for visual confirmation */}
                                            <Popup closeButton={false} className="font-bold text-xs">
                                                {pin.note}
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                                
                                {isLoadingName && (
                                    <div className="absolute bottom-4 left-4 z-[400] bg-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        Identifying location...
                                    </div>
                                )}
                            </div>

                            {/* Itinerary List (Better UX than Popups) */}
                            {formData.itinerary_pins.length > 0 ? (
                                <div className="bg-white border-t border-slate-200 p-4">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Itinerary Stops</div>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {formData.itinerary_pins.map((pin, idx) => (
                                            <div key={pin.id} className="flex items-center gap-3 group">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <input 
                                                    type="text"
                                                    value={pin.note}
                                                    onChange={(e) => handleUpdatePin(pin.id, e.target.value)}
                                                    className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-sm text-slate-700 font-medium transition-colors"
                                                />
                                                <button 
                                                    onClick={() => handleDeletePin(pin.id)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remove Stop"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-200">
                                    Click anywhere on the map to add your first stop.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. NOTES & DETAILS */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Trip Notes / Bucket List</label>
                        <textarea 
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full input-base min-h-[100px]"
                            placeholder="e.g. Visit the Louvre, Sushi in Tokyo, Scuba diving in Great Barrier Reef..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Travelers</label>
                             <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] text-slate-400 block mb-1">Adults</label>
                                    <input 
                                        type="number" min={1} value={formData.adults}
                                        onChange={(e) => setFormData(prev => ({ ...prev, adults: Number(e.target.value) }))}
                                        className="w-full input-base text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-slate-400 block mb-1">Children</label>
                                    <input 
                                        type="number" min={0} value={formData.children}
                                        onChange={(e) => setFormData(prev => ({ ...prev, children: Number(e.target.value) }))}
                                        className="w-full input-base text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Dates</label>
                             <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] text-slate-400 block mb-1">Start</label>
                                    <input 
                                        type="date" 
                                        value={formData.start_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                        className="w-full input-base text-xs px-2"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-slate-400 block mb-1">End</label>
                                    <input 
                                        type="date" 
                                        value={formData.end_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                        className="w-full input-base text-xs px-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. GRANULAR BUDGETING */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                            <Wallet size={16} /> Cost Components
                        </div>

                        {/* Flights */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Plane size={14}/> Flights</label>
                                <span className="text-xs font-bold text-sky-600">${Math.round(costBreakdown.flightCost).toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['economy', 'premium', 'business'].map(cls => (
                                    <button
                                        key={cls}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, flight_class: cls }))}
                                        className={`py-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                                            formData.flight_class === cls ? 'bg-sky-50 border-sky-500 text-sky-700' : 'border-slate-200 text-slate-500'
                                        }`}
                                    >
                                        {cls}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Accommodation */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><BedDouble size={14}/> Accommodation</label>
                                <span className="text-xs font-bold text-sky-600">${Math.round(costBreakdown.totalAcc).toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    {id: 'hostel', label: 'Hostel/Budget'}, 
                                    {id: 'airbnb', label: 'Airbnb/Apt'}, 
                                    {id: 'hotel', label: 'Hotel (3-4★)'}, 
                                    {id: 'resort', label: 'Resort/Lux'}
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, accommodation_style: type.id }))}
                                        className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${
                                            formData.accommodation_style === type.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-500'
                                        }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Lifestyle */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Utensils size={14}/> Food & Transport</label>
                                <span className="text-xs font-bold text-sky-600">${Math.round(costBreakdown.totalLifestyle).toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" min={0} max={2} step={1}
                                value={['frugal', 'moderate', 'lavish'].indexOf(formData.lifestyle_level)}
                                onChange={(e) => setFormData(prev => ({ ...prev, lifestyle_level: ['frugal', 'moderate', 'lavish'][e.target.value] }))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-2 uppercase font-bold">
                                <span>Street Food</span>
                                <span>Dining Out</span>
                                <span>Fine Dining</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* RIGHT: Summary Receipt (5 Cols) */}
                <div className="xl:col-span-5">
                    <div className="sticky top-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Total</div>
                                <div className="text-4xl font-black text-slate-900 tracking-tight">
                                    ${(costBreakdown.total / 1000).toFixed(1)}k
                                </div>
                                <div className="text-xs text-slate-500 font-bold mt-1">
                                    ≈ ${costBreakdown.dailyAvg}/day
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-600">
                                <Calculator size={24} />
                            </div>
                        </div>

                        {/* Receipt Breakdown */}
                        <div className="space-y-3 border-t border-slate-100 pt-4 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 flex items-center gap-2"><Plane size={14} className="text-slate-400"/> Flights</span>
                                <span className="font-bold text-slate-900">${Math.round(costBreakdown.flightCost).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 flex items-center gap-2"><BedDouble size={14} className="text-slate-400"/> Accommodation</span>
                                <span className="font-bold text-slate-900">${Math.round(costBreakdown.totalAcc).toLocaleString()}</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-600 flex items-center gap-2"><Utensils size={14} className="text-slate-400"/> Lifestyle</span>
                                <span className="font-bold text-slate-900">${Math.round(costBreakdown.totalLifestyle).toLocaleString()}</span>
                            </div>
                        </div>
                        
                        {/* Map Pins Summary */}
                        {formData.itinerary_pins.length > 0 && (
                            <div className="bg-indigo-50 rounded-xl p-3 mb-6">
                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Itinerary ({formData.itinerary_pins.length} Stops)</div>
                                <div className="space-y-1">
                                    {formData.itinerary_pins.slice(0, 3).map((pin, idx) => (
                                        <div key={pin.id} className="text-xs text-indigo-800 flex items-center gap-1.5">
                                            <span className="font-bold">{idx+1}.</span> {pin.note}
                                        </div>
                                    ))}
                                    {formData.itinerary_pins.length > 3 && (
                                        <div className="text-[10px] text-indigo-400 italic pl-3">+ {formData.itinerary_pins.length - 3} more</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed mb-6">
                            <p><strong>Note:</strong> This estimate uses 2026 inflation-adjusted indices. It includes taxes and fees but excludes travel insurance and visa costs.</p>
                        </div>

                        <button 
                            type="button" 
                            onClick={() => onSubstageSubmit({ ...formData, estimated_cost: costBreakdown.total })}
                            className="w-full btn-primary-rounded py-4 shadow-lg shadow-sky-200 flex items-center justify-center gap-2"
                        >
                            Confirm Budget <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STAGE 2: PARAMETERS (Risk & Timing) ---
const TravelPlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [formData, setFormData] = useState({
        fx_buffer_pct: initialValues.goal_details?.fx_buffer_pct || 5,
        inflation_pct: initialValues.goal_details?.inflation_pct || 3.0,
        prepayment_required_pct: 40 // New field: How much needs to be paid upfront (flights/hotels)
    });

    const isInternalUpdate = useRef(false);

    useEffect(() => {
        if (!initialValues) return;
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        setFormData(prev => ({
            ...prev,
            fx_buffer_pct: initialValues.goal_details?.fx_buffer_pct ?? prev.fx_buffer_pct,
            inflation_pct: initialValues.goal_details?.inflation_pct ?? prev.inflation_pct
        }));
    }, [initialValues]);

    useEffect(() => {
        isInternalUpdate.current = true;
        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                ...formData
            }
        });
    }, [formData]);

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="bg-gradient-to-br from-sky-50 to-blue-100/50 rounded-3xl p-6 border border-sky-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-sky-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Financial Stress Test</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Travel costs are volatile. We add buffers to ensure you don't run out of money abroad.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* FX Risk */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                            <Wallet className="text-sky-500" size={20}/> Exchange Rate Buffer
                        </div>
                        <span className="text-xl font-black text-slate-900">{formData.fx_buffer_pct}%</span>
                    </div>
                    <input 
                        type="range" min={0} max={15} step={1}
                        value={formData.fx_buffer_pct}
                        onChange={(e) => setFormData(prev => ({ ...prev, fx_buffer_pct: Number(e.target.value) }))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <p className="text-xs text-slate-500 mt-4">
                        If the NZD drops against the {initialValues.goal_details?.destination || 'local'} currency, this buffer protects your purchasing power.
                    </p>
                </div>

                {/* Cashflow Timing */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6">
                     <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                            <CalendarIcon className="text-indigo-500" size={20}/> Upfront Cost Ratio
                        </div>
                        <span className="text-xl font-black text-slate-900">{formData.prepayment_required_pct}%</span>
                    </div>
                    <input 
                        type="range" min={20} max={80} step={10}
                        value={formData.prepayment_required_pct}
                        onChange={(e) => setFormData(prev => ({ ...prev, prepayment_required_pct: Number(e.target.value) }))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <p className="text-xs text-slate-500 mt-4">
                        Percentage of budget needed 3-6 months before departure (Flights & Accommodation deposits).
                    </p>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit(formData)}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Confirm Parameters
                </button>
            </div>
        </div>
    );
};

// --- STAGE 3: GAP (Cashflow Analysis) ---
const TravelGapFeasibilityForm = ({ initialValues, onSubstageSubmit }) => {
    // 1. Context
    const details = initialValues.goal_details || {};
    const assets = {
        liquid: details.liquid_assets || 0,
        surplus: details.monthly_surplus || 0, 
    };

    // 2. Calculations
    const BASE_COST = details.estimated_cost || 10000;
    const FX_BUFFER = details.fx_buffer_pct || 5;
    const TARGET_AMOUNT = Math.round(BASE_COST * (1 + FX_BUFFER/100));
    const UPFRONT_AMOUNT = Math.round(TARGET_AMOUNT * ((details.prepayment_required_pct || 40) / 100));
    
    const CURRENT_SAVINGS = assets.liquid;
    const GAP = Math.max(0, TARGET_AMOUNT - CURRENT_SAVINGS);
    
    // Timeline Analysis
    const today = new Date();
    const targetDate = initialValues.due_date ? new Date(initialValues.due_date) : new Date(today.getFullYear() + 1, today.getMonth(), 1);
    const monthsUntil = Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth()));
    
    // Cashflow Check
    const requiredMonthlySaving = GAP > 0 ? Math.round(GAP / monthsUntil) : 0;
    const monthlySurplus = assets.surplus; 
    const isAffordable = requiredMonthlySaving <= monthlySurplus;

    // Upfront Check
    // Can they pay for flights NOW?
    const canPayUpfront = CURRENT_SAVINGS >= UPFRONT_AMOUNT;

    return (
        <div className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-teal-50 to-emerald-100/50 rounded-3xl p-6 border border-teal-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-teal-600">
                        <Calculator size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Trip Feasibility Check</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            We analyze two risks: <strong>Liquidity</strong> (Can you book flights?) and <strong>Cashflow</strong> (Can you save the rest?).
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. LIQUIDITY CHECK (Upfront Costs) */}
                <div className={`p-6 rounded-3xl border-2 transition-all ${
                    canPayUpfront ? 'border-emerald-100 bg-emerald-50/30' : 'border-amber-100 bg-amber-50/30'
                }`}>
                    <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold uppercase tracking-wider text-sm">
                        <Banknote size={18} className="text-teal-500" /> Booking Readiness
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-bold">Needed for Flights/Hotels</span>
                            <span className="text-lg font-black text-slate-900">${(UPFRONT_AMOUNT/1000).toFixed(1)}k</span>
                        </div>
                        <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-100">
                            <div style={{ width: `${Math.min(100, (CURRENT_SAVINGS / UPFRONT_AMOUNT) * 100)}%` }} className={`h-full ${canPayUpfront ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>
                        {!canPayUpfront && (
                            <div className="text-xs text-amber-700 bg-white p-2 rounded-lg border border-amber-100">
                                ⚠️ You have ${Math.round(CURRENT_SAVINGS/1000)}k cash. You may need to delay booking flights until you save more.
                            </div>
                        )}
                        {canPayUpfront && (
                            <div className="text-xs text-emerald-700 bg-white p-2 rounded-lg border border-emerald-100">
                                ✅ You have enough cash to book your main travel components today.
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. CASHFLOW CHECK (Monthly Saving) */}
                <div className={`p-6 rounded-3xl border-2 transition-all ${
                    isAffordable ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'
                }`}>
                     <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold uppercase tracking-wider text-sm">
                        <TrendingUp size={18} className="text-teal-500" /> Monthly Saving Plan
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-bold">Target Saving / Month</span>
                            <span className="text-lg font-black text-slate-900">${requiredMonthlySaving.toLocaleString()}</span>
                        </div>
                        
                        {/* Visualization */}
                        {monthlySurplus > 0 ? (
                            <div className="relative pt-4">
                                <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-400">Monthly Surplus: ${monthlySurplus}</div>
                                <div className="h-2 w-full bg-white rounded-full mt-1 border border-slate-100 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all ${isAffordable ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                        style={{ width: `${Math.min(100, (requiredMonthlySaving / monthlySurplus) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                             <div className="text-xs text-slate-400 italic">No surplus data available.</div>
                        )}

                        {isAffordable ? (
                            <div className="text-xs text-emerald-700 bg-white p-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                                <CheckCircle2 size={14}/> Affordable. Uses {Math.round((requiredMonthlySaving/monthlySurplus)*100)}% of surplus.
                            </div>
                        ) : (
                            <div className="text-xs text-rose-700 bg-white p-2 rounded-lg border border-rose-100 flex items-center gap-2">
                                <AlertCircle size={14}/> Unaffordable. Exceeds surplus by ${(requiredMonthlySaving - monthlySurplus).toLocaleString()}.
                            </div>
                        )}
                    </div>
                </div>
            </div>

             {/* AI Recommendation */}
             {initialValues.ai_decision?.rationale && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-3xl p-6 border border-indigo-100/50 relative overflow-hidden">
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm shrink-0">
                            <Brain size={20} className="text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">AI Analysis</div>
                            <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed text-xs">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {initialValues.ai_decision.rationale}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit({ target_amount: TARGET_AMOUNT, confirmed: true })}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Generate Strategy
                </button>
            </div>
        </div>
    );
};

const TravelGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery', substageData = {}, onSubstageSubmit, needsRecompute = false }) => {
    if (activeSubstage === 'goal_discovery') {
        return <TravelVisionForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} needsRecompute={needsRecompute} />;
    }
    if (activeSubstage === 'assumptions') {
        return <TravelPlanningParametersForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} />;
    }
    if (activeSubstage === 'gap_analysis') {
        return <TravelGapFeasibilityForm initialValues={initialValues} onSubstageSubmit={onSubstageSubmit} />;
    }
    return <div>Unknown Substage</div>;
};

export default TravelGoalForm;
