import React from "react";
import { motion } from "framer-motion";

export const AmbientBackground: React.FC = () => {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 20,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      
      {/* Cinematic light leaks */}
      <div className="absolute top-[15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-radial from-[#D8AF45]/2.5 to-transparent opacity-60 animate-float-slow" />
      <div className="absolute bottom-[25%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-radial from-[#D8AF45]/2 to-transparent opacity-50 animate-float-slower" />
      
      {/* Ambient floating bokeh dots */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-gradient-to-r from-[#D8AF45]/20 to-[#E8C96F]/10 blur-[1px]"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            animate={{
              y: [0, -90, 0],
              x: [0, 20, 0],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

    </div>
  );
};
