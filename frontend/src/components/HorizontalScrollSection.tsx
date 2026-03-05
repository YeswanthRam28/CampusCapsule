import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function HorizontalScrollSection() {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);

  const cards = [
    {
      id: 1,
      title: "GRID FAILURE DETECTED",
      desc: "Multiple substations reporting critical load imbalances. Cascade failure imminent.",
      time: "T-MINUS 00:00:00",
      status: "CRITICAL"
    },
    {
      id: 2,
      title: "COMMUNICATION BLACKOUT",
      desc: "Cellular towers offline in Sector 4. Emergency bands congested.",
      time: "T-PLUS 00:15:00",
      status: "OFFLINE"
    },
    {
      id: 3,
      title: "RESOURCE FRAGMENTATION",
      desc: "Emergency units deployed to wrong coordinates due to data latency.",
      time: "T-PLUS 00:45:00",
      status: "ERROR"
    },
    {
      id: 4,
      title: "SYSTEM COLLAPSE",
      desc: "Total loss of situational awareness. Manual override required.",
      time: "T-PLUS 01:30:00",
      status: "FATAL"
    },
  ];

  return (
    <section ref={targetRef} className="relative h-[400vh] bg-obsidian z-10">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div style={{ x }} className="flex gap-20 px-20">
          <div className="w-[80vw] shrink-0 flex flex-col justify-center">
             <h2 className="text-[12vw] font-display font-bold leading-none tracking-tighter text-white/20">
               THE CHAOS
             </h2>
             <p className="text-2xl text-crimson font-mono mt-8 animate-pulse">
               // ANOMALY DETECTED
             </p>
          </div>
          
          {cards.map((card) => (
            <div key={card.id} className="relative h-[60vh] w-[40vw] shrink-0 border border-white/10 bg-white/5 p-8 backdrop-blur-md transition-colors hover:border-crimson/50 group">
              <div className="absolute -top-4 -left-4 h-8 w-8 border-t-2 border-l-2 border-crimson opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute -bottom-4 -right-4 h-8 w-8 border-b-2 border-r-2 border-crimson opacity-0 transition-opacity group-hover:opacity-100" />
              
              <div className="flex justify-between items-start mb-12">
                <span className="font-mono text-crimson animate-pulse">{card.status}</span>
                <span className="font-mono text-white/50">{card.time}</span>
              </div>
              
              <h3 className="text-4xl font-bold mb-4 font-display">{card.title}</h3>
              <p className="text-xl text-white/70 font-light">{card.desc}</p>
              
              <div className="absolute bottom-8 left-8 right-8">
                <div className="h-1 w-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-crimson w-2/3 animate-[shimmer_2s_infinite]" />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
