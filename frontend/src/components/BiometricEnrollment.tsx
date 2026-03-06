import { useRef, useState, useEffect } from 'react';
import { Fingerprint, Camera, ShieldCheck, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BiometricEnrollment({ username }: { username: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [success, setSuccess] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setMediaStream(stream);
            setIsCapturing(true);
        } catch (err) {
            console.error("Camera access denied:", err);
        }
    };

    useEffect(() => {
        if (videoRef.current && mediaStream) {
            videoRef.current.srcObject = mediaStream;
        }
    }, [isCapturing, mediaStream]);

    const enroll = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsEnrolling(true);

        const canvas = canvasRef.current;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageB64 = canvas.toDataURL('image/jpeg');

        try {
            const res = await fetch('http://localhost:8000/auth/register_face', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, image_b64: imageB64 })
            });
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err) {
            console.error("Enrollment failed:", err);
        } finally {
            setIsEnrolling(false);
            setIsCapturing(false);
            mediaStream?.getTracks().forEach(t => t.stop());
            setMediaStream(null);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-cyan/20 bg-black/60 rounded-xl p-6">
            <h3 className="text-xs font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-cyan">
                <Fingerprint size={16} /> Biometric_Enrollment
            </h3>

            {!isCapturing ? (
                <button
                    onClick={startCamera}
                    className="w-full py-4 border border-dashed border-white/20 rounded-xl flex flex-col items-center gap-3 hover:bg-white/5 transition-colors group"
                >
                    <Camera size={24} className="text-white/20 group-hover:text-cyan transition-colors" />
                    <span className="text-[10px] text-white/40 uppercase font-bold">Register_Face_ID</span>
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="relative aspect-square bg-obsidian rounded-xl overflow-hidden border border-cyan/50">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale" />
                        <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[1px] bg-cyan animate-scan opacity-40 shadow-[0_0_15px_rgba(0,240,255,1)]" />
                        <canvas ref={canvasRef} width={400} height={400} className="hidden" />
                    </div>
                    <button
                        disabled={isEnrolling}
                        onClick={enroll}
                        className="w-full py-3 bg-cyan text-black font-bold text-[10px] rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors"
                    >
                        {isEnrolling ? <RefreshCcw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        {isEnrolling ? "ENROLLING_IDENTITY..." : "CONFIRM_IDENTITY"}
                    </button>
                </div>
            )}

            {success && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-center">
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">BIOMETRIC_DATA_STORED</span>
                </motion.div>
            )}
        </motion.div>
    );
}
