import { ReactLenis } from 'lenis/react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ParticleField } from './components/3d/ParticleField';
import { HorizontalScrollSection } from './components/HorizontalScrollSection';
import { SolutionSection } from './components/SolutionSection';
import { DashboardPreview } from './components/DashboardPreview';
import { GlitchText } from './components/GlitchText';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';
import * as THREE from 'three';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Login from './Login';

function CameraRig({ scrollYProgress }: { scrollYProgress: any }) {
  const { camera } = useThree();

  useFrame(() => {
    const progress = scrollYProgress.get(); // 0 to 1

    // Zoom from z=5 to z=-2
    const targetZ = 5 - (progress * 15);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);

    camera.lookAt(0, 0, -10);
  });
  return null;
}

function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });

  const scale = useTransform(smoothProgress, [0, 0.5], [1, 15]);
  const opacity = useTransform(smoothProgress, [0, 0.4], [1, 0]);
  const blur = useTransform(smoothProgress, [0, 0.4], ["0px", "20px"]);

  return (
    <div ref={containerRef} className="h-[250vh] relative z-0">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ antialias: false }}>
            <color attach="background" args={['#050505']} />
            <ambientLight intensity={0.5} />
            <CameraRig scrollYProgress={smoothProgress} />
            <ParticleField count={2000} />
          </Canvas>
        </div>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <motion.h1
            style={{ scale, opacity, filter: blur }}
            className="text-[12vw] font-display font-bold leading-none tracking-tighter text-center mix-blend-difference will-change-transform"
          >
            WHEN THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
              GRID <GlitchText text="FAILS" className="text-white" />
            </span>
          </motion.h1>

          <motion.p
            style={{ opacity }}
            className="absolute bottom-12 font-mono text-sm text-white/60 tracking-[0.5em] animate-pulse"
          >
            SCROLL TO INITIATE
          </motion.p>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  return (
    <main className="bg-obsidian min-h-screen text-white selection:bg-cyan selection:text-black relative">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full p-6 z-50 flex justify-between items-center mix-blend-difference pointer-events-none">
        <Link to="/" className="text-2xl font-bold tracking-tighter pointer-events-auto">CAMPUSCAPSULE</Link>
        <button
          onClick={() => navigate('/login')}
          className="pointer-events-auto px-6 py-2 border border-white/20 rounded-full text-xs font-mono hover:bg-white hover:text-black transition-all"
        >
          REQUEST ACCESS
        </button>
      </nav>

      <HeroScene />

      <HorizontalScrollSection />

      <SolutionSection />

      <DashboardPreview />

      {/* Footer / CTA */}
      <section className="h-[80vh] flex flex-col items-center justify-center relative overflow-hidden bg-obsidian z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)]" />

        <h2 className="text-6xl md:text-9xl font-bold text-center tracking-tighter mb-12 relative z-10 font-display">
          TAKE <br /> COMMAND
        </h2>

        <button
          onClick={() => navigate('/login')}
          className="group relative px-12 py-6 bg-white text-black rounded-full font-bold text-xl overflow-hidden transition-transform hover:scale-105"
        >
          <span className="relative z-10 group-hover:text-white transition-colors uppercase">SECURE YOUR GRID</span>
          <div className="absolute inset-0 bg-cyan transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
        </button>

        <div className="absolute bottom-12 text-white/20 font-mono text-xs">
          CAMPUSCAPSULE SYSTEMS © 2026
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ReactLenis root>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </ReactLenis>
    </BrowserRouter>
  );
}
