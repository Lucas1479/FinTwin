import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Check, Loader2, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issues with Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Map controller to automatically fly to new positions
const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
            map.flyTo(center, zoom || 16, {
                duration: 1.5
            });
        }
    }, [center, zoom, map]);
    return null;
};

// Inline, compact location picker (with optional modal wrapper)
const LocationPickerModal = ({ onSelect, initialLocation, isOpen = true, onClose, height = 240, width = '100%', searchAddress }) => {
    const [position, setPosition] = useState(
        initialLocation?.lat ? [initialLocation.lat, initialLocation.lng] : [-36.8485, 174.7633]
    );
    const [addressName, setAddressName] = useState(initialLocation?.name || '');
    const [loading, setLoading] = useState(false);

    // Update position when initialLocation changes
    useEffect(() => {
        if (initialLocation?.lat && initialLocation?.lng) {
            const newPos = [initialLocation.lat, initialLocation.lng];
            setPosition(newPos);
            if (initialLocation.name) {
                setAddressName(initialLocation.name);
            } else {
                // If no name provided, fetch it
                reverseGeocode(initialLocation.lat, initialLocation.lng);
            }
        }
    }, [initialLocation?.lat, initialLocation?.lng]);

    // Internal component to handle clicks
    const MapEvents = () => {
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;
                setPosition([lat, lng]);
                reverseGeocode(lat, lng);
            },
        });
        return position ? <Marker position={position} /> : null;
    };

    const formatAddress = (data, lat, lng) => {
        const a = data?.address || {};
        const parts = [
            [a.house_number, a.road].filter(Boolean).join(' ').trim(),
            a.suburb || a.city_district || a.village || a.town || a.city,
            a.state,
            a.country
        ].filter(Boolean);
        if (parts.length) return parts.join(', ');
        return data?.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    };

    const reverseGeocode = async (lat, lng) => {
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            setAddressName(formatAddress(data, lat, lng));
        } catch (error) {
            console.error("Geocoding failed", error);
            setAddressName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
            setLoading(false);
        }
    };

    // Forward geocoding - search location by name
    const forwardGeocode = async (address) => {
        if (!address || address.trim().length < 2) return;
        
        setLoading(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address)}&countrycodes=nz&limit=1`,
                {
                    headers: {
                        'User-Agent': 'MoneyMindsFintechApp/1.0'
                    }
                }
            );
            const data = await res.json();
            if (data && data.length > 0) {
                const location = data[0];
                const newPos = [parseFloat(location.lat), parseFloat(location.lon)];
                setPosition(newPos);
                setAddressName(location.display_name);
            }
        } catch (error) {
            console.error("Forward geocoding failed", error);
        } finally {
            setLoading(false);
        }
    };

    // Ensure we have a readable address when已有坐标 (only run on mount)
    useEffect(() => {
        if (position && !addressName && position.length === 2) {
            reverseGeocode(position[0], position[1]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Trigger forward geocoding when searchAddress changes
    useEffect(() => {
        if (searchAddress && searchAddress.trim().length > 0) {
            forwardGeocode(searchAddress);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchAddress]);

    // Don't render if not open (when used as modal)
    if (!isOpen) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                    <MapPin size={16} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800">Select Location</div>
                    <div className="text-xs text-slate-500">Click on the map to pin your exact address</div>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                    {loading ? 'Locating...' : 'Adjustable'}
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200">
                <MapContainer 
                    center={position} 
                    zoom={16} 
                    style={{ height: typeof height === 'number' ? `${height}px` : height, width }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController center={position} zoom={16} />
                    <MapEvents />
                </MapContainer>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    </div>
                    <div className="truncate font-semibold text-slate-800">
                        {addressName || 'Click map to select location'}
                    </div>
                </div>
                <button 
                    type="button"
                    onClick={() => onSelect({ name: addressName, lat: position[0], lng: position[1] })}
                    disabled={!addressName || loading}
                    className="btn-primary-rounded flex items-center justify-center gap-2 px-6 py-2 min-w-[140px]"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    Confirm
                </button>
            </div>
        </div>
    );
};

export default LocationPickerModal;

