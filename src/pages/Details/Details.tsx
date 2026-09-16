import React, { useEffect } from "react";
import { motion as motionFramer } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface DetailsPageProps {
  onRequestInvitation: () => void;
  onBack: () => void;
}

export const DetailsPage: React.FC<DetailsPageProps> = ({ onRequestInvitation, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full bg-[#0A0A0A] text-[#F5F5F5] font-sans overflow-x-hidden selection:bg-[#D4AF37] selection:text-[#0A0A0A] min-h-screen">
      
      {/* ────────────────────────────────────────────────
          SECTION: THE EXPERIENCE
          ──────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 px-6 md:px-12 bg-[#0A0A0A] overflow-hidden min-h-screen flex flex-col justify-center">
        
        {/* Subtle backdrop glowing flares */}
        <div className="absolute top-[20%] right-[0%] w-[350px] h-[350px] rounded-full bg-[#D4AF37]/2 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[-10%] w-[350px] h-[350px] rounded-full bg-[#D4AF37]/3 blur-[120px] pointer-events-none" />

        {/* ── Luxury corner decorations ───────────────────────────────── */}
        {(["tl","tr","bl","br"] as const).map((pos, i) => (
          <svg
            key={pos}
            className={`hero-corner hero-corner--${pos}`}
            viewBox="0 0 70 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ '--shimmer-delay': `${i * 1.8}s` } as React.CSSProperties}
          >
            <defs>
              <linearGradient id={`goldGrad-exp-${pos}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#D4AF37" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#F6D365" stopOpacity="0.6" />
              </linearGradient>
              <filter id={`glow-exp-${pos}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Base L-shaped lines */}
            <g filter={`url(#glow-exp-${pos})`} className="corner-line-group" style={{ '--shimmer-delay': `${i * 1.8}s` } as React.CSSProperties}>
              <line x1="8" y1="8" x2="58" y2="8" stroke={`url(#goldGrad-exp-${pos})`} strokeWidth="1" strokeLinecap="round" />
              <line x1="8" y1="8" x2="8"  y2="58" stroke={`url(#goldGrad-exp-${pos})`} strokeWidth="1" strokeLinecap="round" />

              <line className="corner-shimmer-h" x1="8" y1="8" x2="58" y2="8" stroke="#F6D365" strokeWidth="1.5" strokeLinecap="round" style={{ '--shimmer-delay': `${i * 1.8}s` } as React.CSSProperties} />
              <line className="corner-shimmer-v" x1="8" y1="8" x2="8" y2="58" stroke="#F6D365" strokeWidth="1.5" strokeLinecap="round" style={{ '--shimmer-delay': `${i * 1.8}s` } as React.CSSProperties} />

              <line x1="14" y1="14" x2="44" y2="14" stroke="#D4AF37" strokeWidth="0.4" strokeLinecap="round" opacity="0.5" />
              <line x1="14" y1="14" x2="14" y2="44" stroke="#D4AF37" strokeWidth="0.4" strokeLinecap="round" opacity="0.5" />
            </g>

            <g filter={`url(#glow-exp-${pos})`}>
              <circle cx="8" cy="8" r="2.2" fill="#F6D365" opacity="0.95" />
              <circle cx="8" cy="8" r="1"   fill="#fff"    opacity="0.8" />
            </g>

            <circle className="corner-particle" cx="28" cy="6"  r="0.9" fill="#D4AF37" style={{ '--pdur':'4.2s','--pdelay':'0s','--dx':'3px','--dy':'-5px','--dx2':'6px','--dy2':'-10px' } as React.CSSProperties} />
            <circle className="corner-particle" cx="6"  cy="30" r="0.7" fill="#F6D365" style={{ '--pdur':'5.5s','--pdelay':'1.1s','--dx':'-4px','--dy':'-4px','--dx2':'-7px','--dy2':'-9px' } as React.CSSProperties} />
            <circle className="corner-particle" cx="40" cy="10" r="0.6" fill="#D4AF37" style={{ '--pdur':'3.8s','--pdelay':'2.3s','--dx':'2px','--dy':'-7px','--dx2':'4px','--dy2':'-13px' } as React.CSSProperties} />
            <circle className="corner-particle" cx="10" cy="42" r="0.8" fill="#F6D365" style={{ '--pdur':'6.1s','--pdelay':'0.7s','--dx':'-3px','--dy':'-6px','--dx2':'-5px','--dy2':'-11px' } as React.CSSProperties} />
          </svg>
        ))}
        {/* ── End corner decorations ───────────────────────────────────── */}

        {/* Floating Back Navigation */}
        <motionFramer.button
          onClick={onBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="fixed bottom-6 left-6 sm:bottom-10 sm:left-10 z-50 group flex items-center justify-center p-3 sm:p-4 rounded-full border border-[#D4AF37]/20 bg-[#0A0A0A]/80 backdrop-blur-sm hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 active:border-[#D4AF37] active:bg-[#D4AF37]/15 active:scale-95 transition-all duration-300"
        >
          <ArrowLeft size={18} className="text-[#D4AF37]/80 group-hover:text-[#F6D365] group-hover:-translate-x-1 group-active:text-[#F6D365] group-active:-translate-x-1 transition-all duration-300" />
        </motionFramer.button>

        <div className="max-w-4xl mx-auto space-y-16 relative z-10 w-full pt-8">
          
          {/* Header */}
          <div className="text-center space-y-3 -mt-8 sm:-mt-16 mb-8">
            <motionFramer.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="font-serif text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.1em] leading-tight"
              style={{
                background: "linear-gradient(135deg, #D4AF37 0%, #F6D365 40%, #fff8dc 60%, #D4AF37 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 15px rgba(212,175,55,0.3))",
                textShadow: "none",
              }}
            >
              The Experience
            </motionFramer.h2>

            <motionFramer.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="font-serif text-[#D4AF37]/90 text-base sm:text-lg md:text-xl italic tracking-wide mt-8 max-w-3xl mx-auto space-y-4 leading-relaxed"
            >
              <p>&ldquo;The most impactful insights rarely happen on stages. They happen in the quiet corners of extraordinary rooms, shared between people who have nothing left to prove, but everything left to discover.</p>
              <p>We do not host audiences. We bring together a circle.&rdquo;</p>
            </motionFramer.div>
          </div>

          {/* Elegant Image Gallery */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mt-12 w-full max-w-5xl mx-auto px-2">
            {[
              { src: "/images/event_img_1.jpg", delay: 0.1, y: 0 },
              { src: "/images/event_img_2.jpg", delay: 0.3, y: 0 },
              { src: "/images/event_img_3.jpg", delay: 0.5, y: 0 },
            ].map((img, idx) => (
              <motionFramer.div
                key={idx}
                initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                whileInView={{ opacity: 1, y: img.y, filter: "blur(0px)" }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 1.4, delay: img.delay, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-xl border border-[#D4AF37]/15 group h-auto sm:h-[400px] w-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-black flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-[#D4AF37]/10 group-hover:bg-transparent transition-colors duration-700 z-10 mix-blend-overlay pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60 z-10 pointer-events-none" />
                <img
                  src={img.src}
                  alt={`Viora Elite Experience ${idx + 1}`}
                  className="w-full h-auto max-h-[70vh] sm:h-full object-contain sm:object-cover filter brightness-[0.7] contrast-[1.15] sepia-[0.2] transition-all duration-[2.5s] ease-out group-hover:scale-110 group-hover:brightness-95 group-hover:sepia-0"
                />
              </motionFramer.div>
            ))}
          </div>

          {/* New Footer Section */}
          <motionFramer.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center text-center pt-16 sm:pt-24 mt-8 border-t border-[#D4AF37]/10"
          >
            <div className="flex items-center justify-center gap-4 w-full max-w-[200px] sm:max-w-[280px] mx-auto mb-10">
              <div className="h-[1px] bg-gradient-to-r from-transparent to-[#D4AF37]/80 grow" />
              <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
              <div className="h-[1px] bg-gradient-to-l from-transparent to-[#D4AF37]/80 grow" />
            </div>

            <p className="font-serif text-lg sm:text-2xl text-[#D4AF37] italic tracking-[0.05em] leading-relaxed max-w-3xl drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              &ldquo;An intentionally curated evening where meaningful conversations naturally become partnerships, friendships and further opportunity.&rdquo;
            </p>

            <div className="mt-16 pb-12 flex justify-center">
              <button
                onClick={onRequestInvitation}
                className="group relative px-12 py-4 sm:px-16 sm:py-5 bg-transparent overflow-hidden rounded-sm transition-all duration-500 ease-out border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:-translate-y-1 active:border-[#D4AF37] active:shadow-[0_0_20px_rgba(212,175,55,0.2)] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-[#D4AF37]/5 group-hover:bg-[#D4AF37]/10 group-active:bg-[#D4AF37]/15 transition-colors duration-500" />
                <span className="relative z-10 font-sans text-xs sm:text-sm tracking-[0.3em] text-[#D4AF37] uppercase font-semibold group-hover:text-[#F6D365] group-active:text-[#F6D365] transition-colors duration-300">
                  Proceed
                </span>
              </button>
            </div>
          </motionFramer.div>

        </div>
      </section>

    </div>
  );
};
