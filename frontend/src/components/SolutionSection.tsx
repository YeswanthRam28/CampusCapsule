import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { CoreMesh } from './3d/CoreMesh';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import * as THREE from 'three';

function InteractiveMesh() {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Rotate based on mouse position
      const x = (state.mouse.x * Math.PI) / 10;
      const y = (state.mouse.y * Math.PI) / 10;
      
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, y, 0.1);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, x, 0.1);
    }
  });

  return (
    <group ref={meshRef}>
      <CoreMesh color="#00f0ff" />
    </group>
  );
}

export function SolutionSection() {
  return (
    <section className="relative h-screen w-full bg-obsidian flex items-center justify-center overflow-hidden z-20">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#00f0ff" />
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <InteractiveMesh />
          </Float>
          <Environment preset="city" />
        </Canvas>
      </div>

      <div className="relative z-10 container mx-auto px-4 pointer-events-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Real-time Aggregation", desc: "Ingest millions of data points instantly." },
            { title: "AI Classification", desc: "Neural networks identify threats before they escalate." },
            { title: "Resource Allocation", desc: "Algorithmic dispatching for optimal response." }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="pointer-events-auto p-6 rounded-xl border border-cyan/20 bg-black/40 backdrop-blur-md hover:bg-cyan/10 transition-colors"
            >
              <h3 className="text-cyan font-mono text-sm mb-2">0{i + 1} // SYSTEM</h3>
              <h4 className="text-2xl font-bold mb-2">{item.title}</h4>
              <p className="text-white/60 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
