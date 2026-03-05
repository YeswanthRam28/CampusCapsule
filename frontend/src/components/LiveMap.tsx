import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in React Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Incident {
    id: string;
    classification: {
        incident_type: string;
        severity: string;
        lat?: number;
        lng?: number;
        location_extracted: string;
    };
    raw_data: {
        text: string;
    };
}

function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], map.getZoom(), { animate: true });
        }
    }, [lat, lng, map]);
    return null;
}

export default function LiveMap({ incidents, userLocation }: { incidents: Incident[], userLocation: { lat: number, lng: number } | null }) {
    const latestIncident = incidents[0];

    // Priority: userLocation > latestIncident > default
    const center: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : latestIncident?.classification.lat && latestIncident?.classification.lng
            ? [latestIncident.classification.lat, latestIncident.classification.lng]
            : [12.9716, 77.5946]; // Default center

    return (
        <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl relative group font-mono">
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                <div className="bg-black/80 backdrop-blur-md border border-cyan/50 p-2 rounded text-[8px] font-bold text-cyan uppercase tracking-widest animate-pulse">
                    Live_Satellite_Uplink: ACTIVE
                </div>
                {userLocation && (
                    <div className="bg-black/80 backdrop-blur-md border border-emerald-500/50 p-2 rounded text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                        User_Telemetry: LOCKED
                    </div>
                )}
            </div>

            <MapContainer
                center={center}
                zoom={17}
                style={{ height: '100%', width: '100%', background: '#050505' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* User's Live Position Marker */}
                {userLocation && (
                    <Marker
                        position={[userLocation.lat, userLocation.lng]}
                        icon={L.divIcon({
                            className: 'user-location-marker',
                            html: `<div class="relative w-8 h-8">
                                <div class="absolute inset-0 bg-cyan rounded-full animate-ping opacity-20"></div>
                                <div class="absolute inset-2 bg-cyan rounded-full shadow-[0_0_15px_rgba(0,240,255,0.8)] border-2 border-white"></div>
                            </div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        })}
                    >
                        <Popup>
                            <div className="font-mono text-[10px] p-1 bg-black text-cyan">
                                <div className="font-bold border-b border-cyan/20 mb-1">OPERATOR_CURRENT_LOC</div>
                                <div>ENCRYPTED_SIGNAL_UPLINK</div>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {incidents.map((incident) => {
                    if (!incident.classification.lat || !incident.classification.lng) return null;

                    const icon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div class="w-6 h-6 rounded-full border-2 ${incident.classification.severity === 'CRITICAL' ? 'bg-crimson border-white animate-ping' :
                            incident.classification.severity === 'HIGH' ? 'bg-orange-500 border-white' :
                                incident.classification.severity === 'MEDIUM' ? 'bg-cyan border-white' : 'bg-emerald-500 border-white'
                            } shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });

                    return (
                        <Marker
                            key={incident.id}
                            position={[incident.classification.lat, incident.classification.lng]}
                            icon={icon}
                        >
                            <Popup>
                                <div className="font-mono text-[10px] p-1 bg-black text-white rounded bg-obsidian">
                                    <div className="font-bold text-cyan mb-1">{incident.classification.incident_type}</div>
                                    <div className="text-white/60 mb-2 italic">"{incident.raw_data.text.slice(0, 40)}..."</div>
                                    <div className="text-[8px] opacity-70">LOC: {incident.classification.location_extracted}</div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                <RecenterMap lat={center[0]} lng={center[1]} />
            </MapContainer>

            <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1 text-right">
                <div className="text-[8px] text-white/20 font-mono">GRID_COORD: {center[0].toFixed(4)}, {center[1].toFixed(4)}</div>
                <div className="text-[8px] text-white/20 font-mono italic">TARGET_LOCK: {latestIncident?.id.slice(0, 8) || 'N/A'}</div>
            </div>
        </div>
    );
}
