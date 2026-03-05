import { useRef, useEffect, useState } from 'react';
import { Camera, Shield, AlertTriangle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CCTVAnalyzer() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastAnalysis, setLastAnalysis] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function startCamera() {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                setStream(s);
                if (videoRef.current) videoRef.current.srcObject = s;
            } catch (err) {
                setError("Camera access denied or unavailable.");
            }
        }
        startCamera();
        return () => stream?.getTracks().forEach(track => track.stop());
    }, []);

    const captureAndAnalyze = async () => {
        if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

        setIsAnalyzing(true);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageB64 = canvas.toDataURL('image/jpeg', 0.8);

            try {
                const response = await fetch('http://localhost:8000/cctv/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_b64: imageB64, location: 'Admin_Restricted_Zone_A' })
                });
                const data = await response.json();
                setLastAnalysis(data);
            } catch (err) {
                console.error("Analysis failed:", err);
            }
        }
        setIsAnalyzing(false);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (stream) captureAndAnalyze();
        }, 10000); // Analyze every 10 seconds for performance
        return () => clearInterval(interval);
    }, [stream, isAnalyzing]);

    return (
        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden font-mono">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera size={14} className="text-cyan animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/60">LIVE_CCTV_FEED // CAM_01</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[8px] text-emerald-500 font-bold">ANALYZER_ONLINE</span>
                    </div>
                </div>
            </div>

            <div className="relative aspect-video bg-obsidian">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-black/60">
                        <AlertTriangle className="text-crimson mb-2" size={32} />
                        <p className="text-[10px] text-white/40 uppercase">{error}</p>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover grayscale opacity-50 contrast-125"
                    />
                )}

                {/* Scan Line Animation */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent,rgba(0,240,255,0.05)_50%,transparent_51%)] bg-[length:100%_4px] animate-scan" />

                {/* Overlay HUD */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 scale-75 origin-top-right">
                    <div className="bg-black/80 backdrop-blur-md border border-cyan/30 p-2 rounded flex flex-col items-end">
                        <span className="text-[8px] text-cyan font-bold">GPS_LOCK</span>
                        <span className="text-[10px] text-white">12.9716, 77.5946</span>
                    </div>
                    <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded flex flex-col items-end">
                        <span className="text-[8px] text-white/40 font-bold">BITRATE</span>
                        <span className="text-[10px] text-white">4.2 MBPS</span>
                    </div>
                </div>

                <canvas ref={canvasRef} width={640} height={480} className="hidden" />

                <AnimatePresence>
                    {lastAnalysis?.alert && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-x-4 bottom-4 bg-crimson/90 backdrop-blur-xl border border-white/30 p-4 rounded-xl shadow-[0_0_30px_rgba(185,28,28,0.4)]"
                        >
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-2 rounded-lg">
                                    <AlertTriangle className="text-crimson" size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">AI_THREAT_DETECTION: {lastAnalysis.incident.classification.incident_type}</h4>
                                    <p className="text-xs text-white italic font-bold">"{lastAnalysis.incident.raw_data.text}"</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-4 bg-white/5 grid grid-cols-2 gap-4 border-t border-white/5">
                <div className="space-y-1">
                    <span className="text-[8px] text-white/20 uppercase font-bold block">Status_Telemetry</span>
                    <div className="flex items-center gap-2">
                        <Activity size={12} className={isAnalyzing ? "text-cyan animate-spin" : "text-white/20"} />
                        <span className="text-[10px] text-white/60 font-bold">
                            {isAnalyzing ? "PROCESSING_FRAME..." : "MONITORING_IDLE"}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[8px] text-white/20 uppercase font-bold block">Security_Protocol</span>
                    <span className="text-[10px] text-cyan font-bold italic underline">LEVEL_04_SENTINEL</span>
                </div>
            </div>
        </div>
    );
}
