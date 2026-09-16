import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { standardLogin, normalizeRole } from '../../services/api';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { MOCK_MODE } from '../../config/env';

interface LoginProps {
  processedLogo?: string;
}

const Login: React.FC<LoginProps> = ({ processedLogo }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    setIsLoading(true);
    try {
      const response = await standardLogin({ email, password });
      const data = response.data || response;
      const { token, user } = data;
      
      let roles: string[] = [];
      if (Array.isArray(user.roles)) {
        roles = user.roles.map((r: any) => {
          const roleName = typeof r === 'string' ? r : (r.name || r.role || '');
          return normalizeRole(roleName);
        });
      } else if (typeof user.role === 'string') {
        roles = [normalizeRole(user.role)];
      } else if (typeof user.roles === 'string') {
        roles = [normalizeRole(user.roles)];
      }
      roles = roles.filter(Boolean);

      // Fallback for mock environments just in case
      if (roles.length === 0) {
        if (user.email?.includes('superadmin')) roles = ['ROLE_SUPER_ADMIN'];
        else if (user.email?.includes('admin')) roles = ['ROLE_ADMIN'];
        else roles = ['ROLE_USER'];
      }
      
      localStorage.setItem('token', token);
      if (roles.length > 0) {
        localStorage.setItem('roles', JSON.stringify(roles));
      }
      
      toast.success(`Welcome back, ${user.full_name || user.firstName || 'User'}!`);
      
      if ((roles.includes('ROLE_SUPER_ADMIN') || roles.includes('SUPER_ADMIN'))) {
        navigate('/superadmin-dashboard');
      } else if ((roles.includes('ROLE_ADMIN') || roles.includes('ADMIN') || roles.includes('ROLE_MANAGER') || roles.includes('MANAGER'))) {
        navigate('/admin-dashboard');
      } else if ((roles.includes('ROLE_USER') || roles.includes('USER') || roles.includes('MEMBER') || roles.includes('ROLE_MEMBER'))) {
        navigate('/dashboard');
      } else {
        toast.error('Unauthorized role');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#0d0d0d]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-8 rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.05)] relative z-10 flex flex-col items-center"
      >
        <div className="flex flex-col items-center mb-8 w-full">
          <div className="w-20 h-20 flex items-center justify-center mb-6 pointer-events-none">
            <img src={processedLogo || '/images/logo.png'} alt="Imperium Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(212,175,55,0.25)]" />
          </div>
          <h1 className="font-serif text-2xl tracking-[0.35em] uppercase text-[#F5F5F5] mb-2 text-center">IMPERIUM</h1>
          <span className="font-sans text-[9px] tracking-[0.45em] text-[#D4AF37] uppercase font-semibold mb-6">INVITE ONLY</span>
          <p className="text-[#BDBDBD] text-center text-sm font-light leading-relaxed px-4">
            Sign in with your credentials to access the dashboard.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-[#D4AF37] text-sm tracking-wide">Authenticating...</span>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-4 py-2">
              <form onSubmit={handleStandardLogin} className="w-full flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] text-[#F5F5F5] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-[#888] placeholder:uppercase placeholder:tracking-widest placeholder:text-[10px] placeholder:font-semibold"
                    placeholder="Email"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] text-[#F5F5F5] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-colors pr-10 placeholder:text-[#888] placeholder:uppercase placeholder:tracking-widest placeholder:text-[10px] placeholder:font-semibold"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#D4AF37] transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded-lg text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                >
                  Sign In
                </button>
              </form>

              <button
                onClick={() => navigate('/')}
                className="mt-3 text-[11px] text-[#666] hover:text-[#999] transition-colors flex items-center gap-1.5"
              >
                <span>← Back to Public Experience</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
