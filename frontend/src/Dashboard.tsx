import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Shield, Activity, MapPin, Clock, CheckCircle2, Users, Send, LogOut, ChevronRight, Globe } from 'lucide-react';
import { cn } from './lib/utils';
import LiveMap from './components/LiveMap';
import CCTVAnalyzer from './components/CCTVAnalyzer';
import BiometricEnrollment from './components/BiometricEnrollment';

interface Incident {
  id: string;
  timestamp: string;
  raw_data: {
    text: string;
    location: string;
    source: string;
    reporter_id: string;
  };
  classification: {
    incident_type: string;
    severity: string;
    location_extracted: string;
    entities: string[];
    lat?: number;
    lng?: number;
  };
  playbook: {
    priority: number;
    recommendations: string[];
    teams_to_notify: string[];
  };
  status: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-crimson border-crimson/50 bg-crimson/10',
  HIGH: 'text-orange-500 border-orange-500/50 bg-orange-500/10',
  MEDIUM: 'text-cyan border-cyan/50 bg-cyan/10',
  LOW: 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10',
};

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [dispatchIncident, setDispatchIncident] = useState<Incident | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Get Live User Location
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    if (!userRole) {
      navigate('/login');
      return;
    }
    setRole(userRole);

    // Initial Fetch
    fetch('http://localhost:8000/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data))
      .catch(err => console.error("Fetch error:", err));

    // SSE Stream
    const eventSource = new EventSource('http://localhost:8000/incidents/stream');
    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);
    eventSource.onmessage = (event) => {
      const newIncident = JSON.parse(event.data);
      setIncidents(prev => [newIncident, ...prev]);
      if (['CRITICAL', 'HIGH'].includes(newIncident.classification.severity)) {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play().catch(() => { });
      }
    };

    return () => eventSource.close();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText) return;
    setIsReporting(true);
    try {
      await fetch('http://localhost:8000/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: reportText,
          location: reportLocation || (userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "Unknown"),
          reporter_id: `student_${role}`,
          source: 'user',
          lat: userLocation?.lat,
          lng: userLocation?.lng
        })
      });
      setReportText('');
      setReportLocation('');
      alert("INCIDENT_REPORTED: System is processing your request.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsReporting(false);
    }
  };

  const updateStatus = async (incidentId: string, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        // Update local state immediately
        setIncidents(prev => prev.map(inc =>
          inc.id === incidentId ? { ...inc, status: newStatus } : inc
        ));

        // Trigger Dispatch HUD if status is RESOLVING
        if (newStatus === 'RESOLVING') {
          const inc = incidents.find(i => i.id === incidentId);
          if (inc) setDispatchIncident(inc);
        }
      }
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  if (!role) return null;

  return (
    <div className="min-h-screen bg-obsidian text-white font-mono selection:bg-cyan selection:text-black">
      {/* Full Screen Dispatch HUD */}
      {dispatchIncident && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-obsidian flex flex-col"
        >
          <div className="absolute top-8 left-8 z-[110] flex flex-col gap-4">
            <button
              onClick={() => setDispatchIncident(null)}
              className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded text-[10px] font-bold text-white/60 hover:text-white transition-colors flex items-center gap-2"
            >
              <ChevronRight className="rotate-180" size={14} /> ABORT_DISPATCH
            </button>

            <div className="bg-black/80 backdrop-blur-xl border border-cyan/30 p-6 rounded-2xl max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-cyan animate-ping" />
                <span className="text-[10px] text-cyan font-bold tracking-[0.3em]">MISSION_ACTIVE: DISPATCHING_UNIT</span>
              </div>
              <h2 className="text-xl font-bold italic mb-2">{dispatchIncident.classification.incident_type}</h2>
              <p className="text-xs text-white/40 mb-4">{dispatchIncident.classification.location_extracted}</p>
              <div className="space-y-4 pt-4 border-t border-white/10">
                {dispatchIncident.playbook.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-2 text-[10px] text-white/80 italic">
                    <span className="text-cyan">â€¢</span> {rec}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  updateStatus(dispatchIncident.id, 'RESOLVED');
                  setDispatchIncident(null);
                }}
                className="w-full mt-6 bg-cyan text-black py-3 rounded-lg font-bold text-xs hover:bg-white transition-colors"
              >
                COMPLETE_INTERVENTION
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <LiveMap incidents={[dispatchIncident]} userLocation={userLocation} />
          </div>
        </motion.div>
      )}

      {/* Dashboard Header */}
      <header className="fixed top-0 left-0 w-full h-16 border-b border-white/10 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold tracking-tighter text-cyan">SENTINEL_{role.toUpperCase()}</div>
          <div className="hidden md:flex items-center gap-6 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-crimson")} />
              <span className="text-[10px] uppercase tracking-widest text-white/40">{isConnected ? "Link Active" : "Link Lost"}</span>
            </div>
            {userLocation && (
              <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                <Globe size={12} className="text-cyan animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-cyan/70">GPS_LOCKED: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="p-2 text-white/40 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block leading-none">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Session_Active</div>
              <div className="text-xs font-bold text-white italic">{role.toUpperCase()}_MODE</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-cyan/20 border border-cyan/40 flex items-center justify-center">
              <Shield size={16} className="text-cyan" />
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Workspace */}
          <div className="lg:col-span-8 space-y-8">

            {/* Live Map Visualization */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-[400px] w-full"
            >
              <LiveMap incidents={incidents} userLocation={userLocation} />
            </motion.div>

            {/* STUDENT VIEW: Panic / Report Form */}
            {role === 'student' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-crimson/5 border border-crimson/20 p-8 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold tracking-tighter mb-2 italic">IMMEDIATE_ASSISTANCE?</h2>
                    <p className="text-white/40 text-sm mb-8 tracking-tighter">Your location and report will be processed by Gemini AI and dispatched instantly.</p>

                    <form onSubmit={submitReport} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          value={reportLocation}
                          onChange={(e) => setReportLocation(e.target.value)}
                          placeholder="SPECIFY_LOCATION (e.g. Block C, 3rd Floor)"
                          className="bg-black/60 border border-white/10 rounded-lg p-3 text-sm focus:border-cyan/50 focus:outline-none placeholder:text-white/20"
                        />
                        <div className="relative">
                          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                          <div className="bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] text-white/40 h-full flex items-center italic">
                            ENCRYPTED_GPS_UPLINK_ACTIVE
                          </div>
                        </div>
                      </div>
                      <textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder="INPUT_SITUATION_DETAILS..."
                        rows={4}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-4 text-sm focus:border-cyan/50 focus:outline-none placeholder:text-white/20 italic"
                      />
                      <button
                        disabled={isReporting || !reportText}
                        className="w-full bg-crimson hover:bg-red-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_30px_rgba(185,28,28,0.2)]"
                      >
                        {isReporting ? "PROCESSING_..." : "TRANSMIT_ALERT_NOW"}
                        <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </button>
                    </form>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                    <Activity size={12} className="text-cyan" /> Your Recent Reports
                  </h3>
                  {incidents.filter(i => i.raw_data.reporter_id.includes(role)).length === 0 ? (
                    <div className="p-12 border border-dashed border-white/5 rounded-xl text-center text-white/20 text-xs italic">
                      No active transmissions detected in your current session.
                    </div>
                  ) : (
                    incidents.filter(i => i.raw_data.reporter_id.includes(role)).map(inc => (
                      <div key={inc.id} className="bg-white/5 border border-white/10 p-4 rounded-lg flex justify-between items-center group">
                        <div>
                          <p className="text-xs text-white/80 italic">"{inc.raw_data.text.slice(0, 50)}..."</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border", SEVERITY_COLORS[inc.classification.severity])}>
                              {inc.classification.severity}
                            </span>
                            <span className="text-[8px] text-white/30">{new Date(inc.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-cyan/10 border border-cyan/20 rounded text-[10px] text-cyan font-bold italic">
                          {inc.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* VOLUNTEER & ADMIN: Live Feeds */}
            {(role === 'volunteer' || role === 'admin') && (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Activity className="text-cyan" /> {role === 'admin' ? 'GLOBAL_SYSTEM_STREAM' : 'SECTOR_RESPONSE_FEED'}
                  </h2>
                  <div className="flex gap-2">
                    <span className="text-[10px] text-white/40 uppercase bg-white/5 px-2 py-1 rounded border border-white/10">Auto_Sort: Priority</span>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {incidents.length === 0 ? (
                    <div className="h-64 border border-white/5 bg-white/2 dashed rounded-xl flex flex-col items-center justify-center text-white/20">
                      <Shield size={48} className="mb-4 opacity-10" />
                      <p>Initializing secure data sync...</p>
                    </div>
                  ) : (
                    incidents.map((incident) => (
                      <motion.div
                        key={incident.id}
                        layout
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        className="group border border-white/10 bg-black/40 rounded-xl overflow-hidden hover:border-cyan/50 transition-all duration-300 shadow-lg mb-6"
                      >
                        <div className="p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "px-3 py-1 rounded text-[10px] font-bold border",
                                  SEVERITY_COLORS[incident.classification.severity] || SEVERITY_COLORS.MEDIUM
                                )}>
                                  {incident.classification.severity}
                                </span>
                                <span className="text-white/40 text-[10px] font-mono">{incident.id.slice(0, 8)}</span>
                              </div>
                              <h3 className="text-xl font-bold text-white group-hover:text-cyan transition-colors italic">
                                {incident.classification.incident_type} // {incident.classification.location_extracted}
                              </h3>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 text-white/30 text-[10px]">
                                <Clock size={12} />
                                {new Date(incident.timestamp).toLocaleTimeString()}
                              </div>
                              <div className="flex items-center gap-3 mt-3">
                                {incident.status !== 'ACTIVE' && (
                                  <span className="text-[10px] font-bold px-2 py-1 bg-white/5 rounded border border-white/10 text-white/40 italic">
                                    {incident.status}
                                  </span>
                                )}
                                {role === 'admin' && incident.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => updateStatus(incident.id, 'ABORTED')}
                                    className="text-[10px] font-bold text-crimson hover:underline"
                                  >
                                    ABORT
                                  </button>
                                )}
                                {incident.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => updateStatus(incident.id, 'RESOLVING')}
                                    className="px-4 py-1.5 bg-cyan text-black text-[10px] font-bold rounded flex items-center gap-2 hover:scale-105 transition-transform"
                                  >
                                    RESPOND <ChevronRight size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-white/80 text-sm bg-white/5 p-4 rounded-lg border border-white/5 mb-6 leading-relaxed italic border-l-2 border-l-cyan">
                            "{incident.raw_data.text}"
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h4 className="text-[10px] uppercase tracking-widest text-cyan flex items-center gap-2 font-bold">
                                <Shield size={14} /> PLAYBOOK_EXECUTION
                              </h4>
                              <ul className="space-y-2">
                                {incident.playbook.recommendations.map((rec, i) => (
                                  <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                                    <span className="text-cyan mt-1">â–¶</span> {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-[10px] uppercase tracking-widest text-emerald-500 flex items-center gap-2 font-bold font-mono">
                                <Users size={14} /> DEPLOYMENT_LOG
                              </h4>
                              <div className="flex flex-wrap gap-2 text-[10px]">
                                {incident.playbook.teams_to_notify.map((team, i) => (
                                  <span key={i} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded font-bold">
                                    {team}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* RIGHT SIDEBAR: Stats & Network */}
          <div className="lg:col-span-4 space-y-8">

            {/* ADMIN ONLY: Live CCTV AI Analysis */}
            {role === 'admin' && (
              <div className="space-y-8">
                <CCTVAnalyzer />
                <BiometricEnrollment username={localStorage.getItem('username') || 'admin'} />
              </div>
            )}

            {/* ADMIN ONLY: Network Stats */}
            {role === 'admin' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="border border-white/10 bg-black/60 rounded-xl p-6">
                <h3 className="text-xs font-bold mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <Users size={16} className="text-cyan" /> Network_Deployment
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="text-[10px] text-white/40 mb-1">Volunteers</div>
                    <div className="text-2xl font-bold text-cyan">42</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="text-[10px] text-white/40 mb-1">Students</div>
                    <div className="text-2xl font-bold text-white">1,204</div>
                  </div>
                </div>
                <div className="mt-4 p-4 border border-cyan/20 bg-cyan/5 rounded-lg">
                  <div className="text-[8px] text-cyan uppercase font-bold mb-2">SYSTEM_HEALTH_CHECK</div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan w-[98%] animate-pulse" />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="border border-white/10 bg-black/60 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-3xl -z-10" />
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                <Activity size={16} className="text-cyan" /> SYSTEM_VITALITY
              </h3>
              <div className="space-y-6">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
                  const count = incidents.filter(i => i.classification.severity === sev).length;
                  const total = incidents.length || 1;
                  return (
                    <div key={sev}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-white/60">{sev} RISK</span>
                        <span className="font-bold">{count}</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(count / total) * 100}%` }} className={cn(
                          "h-full transition-all duration-1000",
                          sev === 'CRITICAL' ? 'bg-crimson shadow-[0_0_10px_rgba(185,28,28,0.5)]' :
                            sev === 'HIGH' ? 'bg-orange-500' :
                              sev === 'MEDIUM' ? 'bg-cyan' : 'bg-emerald-500'
                        )} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ADMIN & VOLUNTEER: Assignments Section */}
            {(role === 'admin' || role === 'volunteer') && (
              <div className="border border-white/10 bg-black/60 rounded-xl p-6">
                <h3 className="text-sm font-bold mb-4 uppercase tracking-[0.2em] font-mono text-[10px] text-white/40 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-cyan" /> Active_Assignments
                </h3>
                <div className="space-y-3">
                  {[
                    { id: 'ASGN-01', task: 'Check Sector B Fire Alarms', status: 'IN_PROGRESS' },
                    { id: 'ASGN-02', task: 'Escort Medical Team to Block C', status: 'PENDING' },
                    { id: 'ASGN-03', task: 'Verify CCTV blindspot in Zone 4', status: 'COMPLETED' },
                  ].map((asgn) => (
                    <div key={asgn.id} className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-white/40 font-bold">{asgn.id}</span>
                        <span className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded",
                          asgn.status === 'IN_PROGRESS' ? 'bg-cyan/10 text-cyan' :
                            asgn.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/10 text-white/40'
                        )}>{asgn.status}</span>
                      </div>
                      <p className="text-xs text-white/80 italic">{asgn.task}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-white/10 bg-black/60 rounded-xl p-6">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-[0.2em] font-mono text-[10px] text-white/40">Resource_Topology</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center text-xs">
                  <span className="text-white/60">MAIN_FIRE_GRID</span>
                  <span className="text-emerald-500 font-bold italic underline">NOMINAL</span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center text-xs">
                  <span className="text-white/60">MED_UNITS_SEC_B</span>
                  <span className="text-orange-500 font-bold italic animate-pulse">DEPLOYED</span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center text-xs">
                  <span className="text-white/60">CCTV_AI_OVERLAY</span>
                  <span className="text-cyan font-bold italic">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
