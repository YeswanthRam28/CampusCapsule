import { motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';

export function GlitchText({ text, className }: { text: string, className?: string }) {
  return (
    <div className={cn("relative inline-block", className)}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-crimson opacity-70 animate-glitch-1 clip-path-polygon">
        {text}
      </span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-cyan opacity-70 animate-glitch-2 clip-path-polygon">
        {text}
      </span>
    </div>
  );
}
