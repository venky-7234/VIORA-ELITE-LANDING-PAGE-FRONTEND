import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, UserCheck, Globe, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const generateRoleToken = (roles: string[], email: string, name: string) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    sub: email,
    email,
    username: name,
    firstName: name.split(' ')[0],
    lastName: name.split(' ')[1] || '',
    roles,
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
  }));
  return `${header}.${payload}.imperium-dev-sig`;
};

export const DashboardSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const currentPath = location.pathname;

  const handleSwitch = (type: 'superadmin' | 'admin' | 'user' | 'landing') => {
    if (type === 'superadmin') {
      const token = generateRoleToken(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER'], 'superadmin@imperium.com', 'Super Admin');
      localStorage.setItem('token', token);
      localStorage.setItem('roles', JSON.stringify(['ROLE_SUPER_ADMIN']));
      toast.success('Switched to Superadmin Dashboard');
      navigate('/superadmin-dashboard');
    } else if (type === 'admin') {
      const token = generateRoleToken(['ROLE_ADMIN', 'ROLE_USER'], 'admin@imperium.com', 'Lead Admin');
      localStorage.setItem('token', token);
      localStorage.setItem('roles', JSON.stringify(['ROLE_ADMIN']));
      toast.success('Switched to Admin Dashboard');
      navigate('/admin-dashboard');
    } else if (type === 'user') {
      const token = generateRoleToken(['ROLE_USER'], 'guest@imperium.com', 'VIP Guest');
      localStorage.setItem('token', token);
      localStorage.setItem('roles', JSON.stringify(['ROLE_USER']));
      toast.success('Switched to User Dashboard');
      navigate('/dashboard');
    } else {
      navigate('/');
    }
    setIsOpen(false);
  };

  const getActiveLabel = () => {
    if (currentPath.includes('superadmin')) return 'Superadmin';
    if (currentPath.includes('admin')) return 'Admin';
    if (currentPath.includes('dashboard')) return 'User Dashboard';
    if (currentPath === '/login') return 'Login Screen';
    return 'Public Showcase';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-['Montserrat',sans-serif]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-72 bg-[#0d0d0d]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] text-[#F5F5F5]"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222]">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#D4AF37]" />
                <span className="text-xs font-semibold tracking-wider uppercase text-[#D4AF37]">
                  Dashboard Switcher
                </span>
              </div>
              <span className="text-[10px] text-[#777] bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333]">
                Instant Run
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Superadmin Button */}
              <button
                onClick={() => handleSwitch('superadmin')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentPath.includes('superadmin')
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                    : 'text-[#DDD] hover:bg-[#1a1a1a] hover:text-[#D4AF37]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert size={14} className="text-[#D4AF37]" />
                  <span>Superadmin Dashboard</span>
                </div>
                {currentPath.includes('superadmin') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]" />
                )}
              </button>

              {/* Admin Button */}
              <button
                onClick={() => handleSwitch('admin')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentPath.includes('admin') && !currentPath.includes('superadmin')
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                    : 'text-[#DDD] hover:bg-[#1a1a1a] hover:text-[#D4AF37]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield size={14} className="text-blue-400" />
                  <span>Admin Dashboard</span>
                </div>
                {currentPath.includes('admin') && !currentPath.includes('superadmin') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60A5FA]" />
                )}
              </button>

              {/* User Dashboard */}
              <button
                onClick={() => handleSwitch('user')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentPath === '/dashboard'
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                    : 'text-[#DDD] hover:bg-[#1a1a1a] hover:text-[#D4AF37]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck size={14} className="text-emerald-400" />
                  <span>User Dashboard</span>
                </div>
                {currentPath === '/dashboard' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" />
                )}
              </button>

              {/* Public Landing */}
              <button
                onClick={() => handleSwitch('landing')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentPath === '/'
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                    : 'text-[#999] hover:bg-[#1a1a1a] hover:text-[#FFF]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe size={14} className="text-[#888]" />
                  <span>Landing Page</span>
                </div>
                {currentPath === '/' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#FFF]" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Pill Button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 bg-[#0d0d0d]/90 hover:bg-[#151515] border border-[#D4AF37]/40 rounded-full shadow-[0_4px_20px_rgba(212,175,55,0.15)] backdrop-blur-md transition-all group"
      >
        <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
        <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider">
          Dashboards: {getActiveLabel()}
        </span>
        {isOpen ? (
          <ChevronDown size={14} className="text-[#D4AF37] group-hover:translate-y-0.5 transition-transform" />
        ) : (
          <ChevronUp size={14} className="text-[#D4AF37] group-hover:-translate-y-0.5 transition-transform" />
        )}
      </motion.button>
    </div>
  );
};
