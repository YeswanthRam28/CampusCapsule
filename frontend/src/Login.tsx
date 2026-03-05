import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, Lock, ArrowRight, Fingerprint, Camera, RefreshCcw } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFaceLogin, setIsFaceLogin] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            localStorage.setItem('user_role', data.role);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('username', data.username);

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Connection refused.');
        } finally {
            setIsLoading(false);
        }
    };

    const startFaceLogin = async () => {
        if (!username) {
            setError("Enter OPERATOR_ID first");
            return;
        }
        setIsFaceLogin(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setError("Camera access denied");
            setIsFaceLogin(false);
        }
    };

    const performFaceAuth = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsLoading(true);

        const canvas = canvasRef.current;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageB64 = canvas.toDataURL('image/jpeg');

        try {
            const response = await fetch('http://localhost:8000/auth/login_face', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, image_b64: imageB64 })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Face verification failed');
            }

            localStorage.setItem('user_role', data.role);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('username', data.username);

            // Stop camera
            const stream = videoRef.current.srcObject as MediaStream;
            stream?.getTracks().forEach(t => t.stop());

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
            setIsFaceLogin(false);
            const stream = videoRef.current.srcObject as MediaStream;
            stream?.getTracks().forEach(t => t.stop());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-obsidian flex items-center justify-center p-4 font-mono">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-cyan/10 rounded-full flex items-center justify-center mb-4 border border-cyan/20">
                        <Shield className="text-cyan" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tighter text-white">SYSTEM_ACCESS</h1>
                    <p className="text-white/40 text-[10px] mt-2 uppercase tracking-[0.3em]">
                        {isFaceLogin ? "Scanning biometrics..." : "Verify credentials to proceed"}
                    </p>
                </div>

                {isFaceLogin ? (
                    <div className="space-y-6">
                        <div className="relative aspect-square bg-black rounded-xl overflow-hidden border border-cyan/30">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale" />
                            <div className="absolute inset-0 border-2 border-cyan/20 pointer-events-none animate-pulse" />
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-cyan/50 shadow-[0_0_20px_rgba(0,240,255,0.8)] animate-scan" />
                        </div>
                        <canvas ref={canvasRef} width={400} height={400} className="hidden" />
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => {
                                    setIsFaceLogin(false);
                                    const stream = videoRef.current?.srcObject as MediaStream;
                                    stream?.getTracks().forEach(t => t.stop());
                                }}
                                className="py-3 bg-white/5 border border-white/10 text-white/40 text-[10px] uppercase font-bold rounded-lg"
                            >
                                Back
                            </button>
                            <button
                                onClick={performFaceAuth}
                                className="py-3 bg-cyan text-black text-[10px] uppercase font-bold rounded-lg flex items-center justify-center gap-2"
                            >
                                {isLoading ? <RefreshCcw size={14} className="animate-spin" /> : <Fingerprint size={14} />}
                                Confirm
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-crimson/10 border border-crimson/30 text-crimson text-[10px] p-3 rounded italic animate-shake">
                                ERROR: {error.toUpperCase()}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    type="text"
                                    placeholder="OPERATOR_ID"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan/50 transition-colors placeholder:text-white/10"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    type="password"
                                    placeholder="PASSPHRASE"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan/50 transition-colors placeholder:text-white/10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-black py-4 rounded-lg font-bold flex items-center justify-center gap-2 group hover:bg-cyan transition-colors disabled:opacity-50"
                            >
                                {isLoading ? "AUTHENTICATING..." : "INITIATE_SESSION"}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="flex items-center gap-4 py-2">
                                <div className="h-[1px] flex-1 bg-white/5" />
                                <span className="text-[8px] text-white/20 font-bold tracking-widest">OR</span>
                                <div className="h-[1px] flex-1 bg-white/5" />
                            </div>

                            <button
                                type="button"
                                onClick={startFaceLogin}
                                className="w-full bg-white/5 border border-white/10 text-white/60 py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all"
                            >
                                <Fingerprint size={18} />
                                BIOMETRIC_SCAN
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] text-white/20 uppercase tracking-widest">
                    <span>Encrypted Connection</span>
                    <span>Auth_v3.2.0</span>
                </div>
            </motion.div>
        </div>
    );
}
