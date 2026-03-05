import { motion } from 'framer-motion';

export function DashboardPreview() {
  return (
    <section className="min-h-screen w-full bg-obsidian py-24 px-4 perspective-1000">
      <div className="container mx-auto">
        <div className="mb-20 text-center">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
            CLARITY IN <span className="text-cyan">ACTION</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Turn chaos into command. The Sentinel dashboard provides a single pane of glass for all emergency operations.
          </p>
        </div>

        <motion.div 
          initial={{ rotateX: 45, opacity: 0, scale: 0.8 }}
          whileInView={{ rotateX: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative w-full aspect-video bg-black/50 rounded-lg border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,240,255,0.1)]"
        >
          {/* Mock Dashboard UI */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 gap-4 p-4">
            {/* Sidebar */}
            <div className="col-span-1 row-span-6 border-r border-white/10 flex flex-col items-center py-4 gap-6">
              <div className="w-8 h-8 rounded-full bg-cyan/20" />
              <div className="w-6 h-6 rounded bg-white/10" />
              <div className="w-6 h-6 rounded bg-white/10" />
              <div className="w-6 h-6 rounded bg-white/10" />
            </div>

            {/* Top Bar */}
            <div className="col-span-11 row-span-1 border-b border-white/10 flex items-center justify-between px-6">
              <div className="flex gap-4">
                <span className="text-cyan font-mono text-xs">STATUS: ONLINE</span>
                <span className="text-white/40 font-mono text-xs">LATENCY: 12ms</span>
              </div>
              <div className="h-8 w-32 bg-white/5 rounded" />
            </div>

            {/* Map Area */}
            <div className="col-span-8 row-span-3 bg-white/5 rounded relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan/10 to-transparent opacity-50" />
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-cyan rounded-full animate-ping" />
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-crimson rounded-full animate-ping" />
              
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            {/* Stats Panel */}
            <div className="col-span-3 row-span-3 flex flex-col gap-4">
              <div className="flex-1 bg-white/5 rounded p-4 border border-white/5 hover:border-cyan/30 transition-colors">
                <div className="text-xs text-white/40 font-mono mb-2">ACTIVE INCIDENTS</div>
                <div className="text-4xl font-bold text-crimson">24</div>
              </div>
              <div className="flex-1 bg-white/5 rounded p-4 border border-white/5 hover:border-cyan/30 transition-colors">
                <div className="text-xs text-white/40 font-mono mb-2">UNITS DEPLOYED</div>
                <div className="text-4xl font-bold text-cyan">118</div>
              </div>
            </div>

            {/* Bottom Timeline */}
            <div className="col-span-11 row-span-2 bg-white/5 rounded p-4 flex items-end gap-2">
              {[...Array(40)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-cyan/50 hover:bg-cyan transition-colors"
                  style={{ height: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
