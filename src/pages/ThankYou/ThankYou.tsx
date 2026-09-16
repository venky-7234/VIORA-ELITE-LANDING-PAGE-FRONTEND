import React from "react";
import { motion as motionFramer } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import webInvitationImg from "../../assets/web invitations.png";

interface ThankYouPageProps {
  onReturnHome: () => void;
  onBack?: () => void;
}

export const ThankYouPage: React.FC<ThankYouPageProps> = ({ onReturnHome, onBack }) => {
  return (
    <div className="relative w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center overflow-hidden select-none">

      {/* Back button */}
      {onBack && (
        <motionFramer.button
          onClick={onBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="absolute top-5 left-5 sm:top-8 sm:left-8 z-50 group flex items-center justify-center p-3 rounded-full border border-[#D4AF37]/20 bg-[#0A0A0A]/80 backdrop-blur-sm hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 active:scale-95 transition-all duration-300"
        >
          <ArrowLeft size={18} className="text-[#D4AF37]/80 group-hover:text-[#F6D365] group-hover:-translate-x-1 transition-all duration-300" />
        </motionFramer.button>
      )}

      {/* Image container */}
      <motionFramer.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative w-full h-full flex items-center justify-center px-4 sm:px-8 py-16 sm:py-14"
      >
        <img
          src={webInvitationImg}
          alt="Thank You – Web Invitation"
          className="block w-full max-w-full md:max-w-[85vw] lg:max-w-[1200px] h-auto max-h-[75vh] md:max-h-[85vh] object-contain drop-shadow-[0_0_60px_rgba(0,0,0,0.9)]"
        />
      </motionFramer.div>

      {/* Return to Home button */}
      <motionFramer.button
        onClick={onReturnHome}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.8, ease: "easeOut" }}
        whileTap={{ scale: 0.97 }}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 px-8 py-3 rounded-full border border-[#D4AF37]/30 bg-[#0A0A0A]/80 backdrop-blur-sm text-[#D4AF37] font-sans font-semibold text-[10px] uppercase tracking-[0.3em] hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/10 transition-all duration-300 whitespace-nowrap shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
      >
        Return to Home
      </motionFramer.button>

    </div>
  );
};

