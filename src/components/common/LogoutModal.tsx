import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, X, Loader2 } from 'lucide-react';
import { logout } from '../../services/api';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  token?: string;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm, token }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (token) {
        await logout(token);
      }
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setIsLoggingOut(false);
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-[#111] border border-[#333] rounded-2xl p-8 overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-900/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888] hover:text-[#C5A059] transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
          <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-900/50 flex items-center justify-center">
            <LogOut size={28} className="text-red-400" />
          </div>
          
          <div>
            <h2 className="text-2xl font-serif text-[#F5F5F5] tracking-wide mb-2">Secure Logout</h2>
            <p className="text-[#888] text-sm">
              Are you sure you want to log out of your session? You will need to re-authenticate to access your dashboard.
            </p>
          </div>

          <div className="flex w-full gap-4 pt-2">
            <button 
              onClick={onClose}
              disabled={isLoggingOut}
              className="flex-1 px-6 py-3 bg-[#222] hover:bg-[#333] border border-[#444] text-[#F5F5F5] font-semibold rounded-lg transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-900/80 hover:bg-red-800 border border-red-700/50 text-white font-semibold rounded-lg transition-all shadow-[0_0_15px_rgba(185,28,28,0.2)]"
            >
              {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
              Logout
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
