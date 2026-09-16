import React, { useState, useEffect, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { CustomCursor } from './components/common/CustomCursor';
import { AmbientBackground } from './components/common/AmbientBackground';
import { generateRoleToken } from './components/navigation/DashboardSwitcher';

// Lazy loaded route components
const LandingPage = React.lazy(() => import('./pages/Home/Home').then(m => ({ default: m.LandingPage })));
const DetailsPage = React.lazy(() => import('./pages/Details/Details').then(m => ({ default: m.DetailsPage })));
const ApplicationPage = React.lazy(() => import('./pages/Application/Application').then(m => ({ default: m.ApplicationPage })));
const ThankYouPage = React.lazy(() => import('./pages/ThankYou/ThankYou').then(m => ({ default: m.ThankYouPage })));
const Login = React.lazy(() => import('./pages/Login/Login'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const SuperadminDashboard = React.lazy(() => import('./pages/SuperadminDashboard/SuperadminDashboard').then(m => ({ default: m.SuperadminDashboard })));
const UserProfile = React.lazy(() => import('./pages/Dashboard/UserDashboard').then(m => ({ default: m.UserProfile })));
const InvitationPreview = React.lazy(() => import('./pages/InvitationPreview/InvitationPreview').then(m => ({ default: m.InvitationPreview })));

const CHAPTER_001_PATH = '/chapter-001';
const CHAPTER_001_EVENT_ID = String(import.meta.env.VITE_CHAPTER_001_EVENT_ID || '').trim();

const PageFallback = () => (
  <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-[#D4AF37]">
    <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    <span className="mt-4 font-sans text-xs tracking-widest text-[#BDBDBD] uppercase animate-pulse">Loading...</span>
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string; stack: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '', stack: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || String(error), stack: error?.stack || '' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard crashed:', error, info);
    this.setState({ stack: (error?.stack || '') + '\n\nComponent stack:\n' + (info?.componentStack || '') });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-[#F5F5F5] p-8">
          <div className="max-w-2xl w-full text-center">
            <p className="text-red-400 text-sm font-mono mb-2 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              {this.state.error}
            </p>
            <pre className="text-left text-[10px] text-[#555] bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 mb-4 overflow-auto max-h-64 whitespace-pre-wrap">
              {this.state.stack}
            </pre>
            <button onClick={() => { this.setState({ hasError: false, error: '', stack: '' }); window.location.reload(); }}
              className="px-4 py-2 text-xs bg-[#C5A059] text-black rounded-lg font-semibold">
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const hasRole = (token: string | null, role: string) => {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000);
    if (isExpired) return false;

    // Check payload
    if (Array.isArray(payload.roles) && payload.roles.includes(role)) return true;
    if (payload.role === role) return true;

    // Check with missing ROLE_ prefix
    const shortRole = role.replace('ROLE_', '');
    if (Array.isArray(payload.roles) && payload.roles.includes(shortRole)) return true;
    if (payload.role === shortRole) return true;

    // Check localStorage
    try {
      const storedRoles = JSON.parse(localStorage.getItem('roles') || '[]');
      if (Array.isArray(storedRoles) && storedRoles.includes(role)) return true;
      if (Array.isArray(storedRoles) && storedRoles.includes(shortRole)) return true;
    } catch { }

    return false;
  } catch {
    return false;
  }
};

const canAccessAdminDashboard = (token: string | null) =>
  hasRole(token, 'ROLE_ADMIN') || hasRole(token, 'ROLE_SUPER_ADMIN');

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [processedLogo, setProcessedLogo] = useState<string>("/images/logo.png");
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const autoRole = params.get('role') || params.get('auto');
    if (autoRole) {
      if (autoRole === 'superadmin' || autoRole === 'super_admin') {
        const token = generateRoleToken(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER'], 'superadmin@imperium.com', 'Super Admin');
        localStorage.setItem('token', token);
        localStorage.setItem('roles', JSON.stringify(['ROLE_SUPER_ADMIN']));
        return token;
      } else if (autoRole === 'admin') {
        const token = generateRoleToken(['ROLE_ADMIN', 'ROLE_USER'], 'admin@imperium.com', 'Lead Admin');
        localStorage.setItem('token', token);
        localStorage.setItem('roles', JSON.stringify(['ROLE_ADMIN']));
        return token;
      } else if (autoRole === 'user' || autoRole === 'guest') {
        const token = generateRoleToken(['ROLE_USER'], 'guest@imperium.com', 'VIP Guest');
        localStorage.setItem('token', token);
        localStorage.setItem('roles', JSON.stringify(['ROLE_USER']));
        return token;
      }
    }
    return localStorage.getItem('token');
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.search.includes('admin=true')) {
      navigate('/login');
    }
  }, [navigate]);

  // Auto-auth role param or restore token from localStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const autoRole = params.get('role') || params.get('auto');
    if (autoRole) {
      if (autoRole === 'superadmin' || autoRole === 'super_admin') {
        const token = generateRoleToken(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER'], 'superadmin@imperium.com', 'Super Admin');
        localStorage.setItem('token', token);
        localStorage.setItem('roles', JSON.stringify(['ROLE_SUPER_ADMIN']));
        setAdminToken(token);
      } else if (autoRole === 'admin') {
        const token = generateRoleToken(['ROLE_ADMIN', 'ROLE_USER'], 'admin@imperium.com', 'Lead Admin');
        localStorage.setItem('token', token);
        localStorage.setItem('roles', JSON.stringify(['ROLE_ADMIN']));
        setAdminToken(token);
      } else if (autoRole === 'user' || autoRole === 'guest') {
        const token = generateRoleToken(['ROLE_USER'], 'guest@imperium.com', 'VIP Guest');
        localStorage.setItem('token', token);
        localStorage.setItem('roles', JSON.stringify(['ROLE_USER']));
        setAdminToken(token);
      }
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        setAdminToken(token);
      }
    }

    const handleUnauthorized = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('roles');
      setAdminToken(null);
      window.location.href = '/login';
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const img = new Image();
    img.src = "/images/logo.png";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const dist = Math.sqrt((r - 28) ** 2 + (g - 7) ** 2 + (b - 18) ** 2);

        if (dist < 40) {
          data[i + 3] = 0;
        } else if (dist < 65) {
          const ratio = (dist - 40) / (65 - 40);
          data[i + 3] = Math.round(ratio * 255);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setProcessedLogo(canvas.toDataURL());
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const pageVariants = {
    initial: {
      opacity: 0,
      filter: "blur(6px)",
      scale: 0.98,
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(6px)",
      scale: 0.98,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const PageWrapper = ({ children, pageKey }: { children: React.ReactNode; pageKey: string }) => (
    <motion.div key={pageKey} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
      {children}
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col items-center justify-center text-[#F5F5F5]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="relative mb-6 flex items-center justify-center select-none pointer-events-none">
                <img src={processedLogo} alt="Viora Elite Logo" className="h-20 sm:h-24 object-contain filter drop-shadow-[0_0_20px_rgba(212,175,55,0.35)]" />
              </div>

              <h2 className="font-serif text-md tracking-[0.4em] uppercase text-[#F5F5F5] mt-4">
                IMPERIUM
              </h2>
              <span className="font-sans text-[7px] tracking-[0.55em] text-[#D4AF37] uppercase font-semibold animate-pulse">
                INVITE ONLY
              </span>

              <div className="w-24 h-[1px] bg-[#D4AF37]/10 mt-6 relative overflow-hidden">
                <motion.div
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute top-0 bottom-0 w-1/3 bg-[#D4AF37]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative min-h-screen w-full bg-[#0A0A0A] text-[#F5F5F5] overflow-x-hidden selection:bg-[#D4AF37] selection:text-[#0A0A0A] z-10">

        <CustomCursor />
        <AmbientBackground />
        <Toaster position="top-right" toastOptions={{ style: { background: '#111', color: '#DDD', border: '1px solid #222' } }} />

        <AnimatePresence mode="wait">
          <Suspense fallback={<PageFallback />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                <PageWrapper pageKey="landing">
                  <LandingPage
                    onNextPage={() => navigate('/details')}
                    onAdminClick={() => navigate('/login')}
                  />
                </PageWrapper>
              } />
              <Route path="/details" element={
                <PageWrapper pageKey="details">
                  <DetailsPage
                    onRequestInvitation={() => navigate('/application')}
                    onBack={() => navigate('/')}
                  />
                </PageWrapper>
              } />
              <Route path="/application" element={
                <PageWrapper pageKey="application">
                  <ApplicationPage
                    onSubmit={() => navigate('/thankyou')}
                    onBack={() => navigate('/details')}
                  />
                </PageWrapper>
              } />
              <Route path="/thankyou" element={
                <PageWrapper pageKey="thankyou">
                  <ThankYouPage
                    onReturnHome={() => navigate('/')}
                    onBack={() => navigate('/application')}
                  />
                </PageWrapper>
              } />
              <Route path={CHAPTER_001_PATH} element={
                <PageWrapper pageKey="chapter-001-landing">
                  <LandingPage
                    onNextPage={() => navigate(`${CHAPTER_001_PATH}/details`)}
                    onAdminClick={() => navigate('/login')}
                  />
                </PageWrapper>
              } />
              <Route path={`${CHAPTER_001_PATH}/details`} element={
                <PageWrapper pageKey="chapter-001-details">
                  <DetailsPage
                    onRequestInvitation={() => navigate(`${CHAPTER_001_PATH}/application`)}
                    onBack={() => navigate(CHAPTER_001_PATH)}
                  />
                </PageWrapper>
              } />
              <Route path={`${CHAPTER_001_PATH}/application`} element={
                <PageWrapper pageKey="chapter-001-application">
                  <ApplicationPage
                    eventId={CHAPTER_001_EVENT_ID || undefined}
                    onSubmit={() => navigate(`${CHAPTER_001_PATH}/thankyou`)}
                    onBack={() => navigate(`${CHAPTER_001_PATH}/details`)}
                  />
                </PageWrapper>
              } />
              <Route path={`${CHAPTER_001_PATH}/thankyou`} element={
                <PageWrapper pageKey="chapter-001-thankyou">
                  <ThankYouPage
                    onReturnHome={() => navigate(CHAPTER_001_PATH)}
                    onBack={() => navigate(`${CHAPTER_001_PATH}/application`)}
                  />
                </PageWrapper>
              } />
              <Route path="/login" element={
                <PageWrapper pageKey="login">
                  <Login processedLogo={processedLogo} />
                </PageWrapper>
              } />
              <Route path="/invitation/:token" element={<InvitationPreview />} />
              <Route path="/dashboard" element={
                (localStorage.getItem('token')) ? (
                  <PageWrapper pageKey="user-dashboard">
                    <UserProfile
                      token={localStorage.getItem('token') || ''}
                      processedLogo={processedLogo}
                      onLogout={() => {
                        setAdminToken(null);
                        localStorage.removeItem('token');
                        localStorage.removeItem('roles');
                        navigate('/login');
                      }}
                    />
                  </PageWrapper>
                ) : <Navigate to="/login" />
              } />

              <Route path="/admin-dashboard" element={
                canAccessAdminDashboard(localStorage.getItem('token')) ? (
                  <PageWrapper pageKey="admin-dashboard">
                    <ErrorBoundary>
                      <AdminDashboard
                        token={localStorage.getItem('token') || ''}
                        processedLogo={processedLogo}
                        onLogout={() => {
                          setAdminToken(null);
                          localStorage.removeItem('token');
                          localStorage.removeItem('roles');
                          navigate('/login');
                        }}
                      />
                    </ErrorBoundary>
                  </PageWrapper>
                ) : <Navigate to="/login" />
              } />
              <Route path="/superadmin-dashboard" element={
                hasRole(localStorage.getItem('token'), 'ROLE_SUPER_ADMIN') ? (
                  <PageWrapper pageKey="superadmin-dashboard">
                    <SuperadminDashboard
                      token={localStorage.getItem('token') || ''}
                      processedLogo={processedLogo}
                      onLogout={() => {
                        setAdminToken(null);
                        localStorage.removeItem('token');
                        localStorage.removeItem('roles');
                        navigate('/login');
                      }}
                    />
                  </PageWrapper>
                ) : <Navigate to="/login" />
              } />

              {/* Redirects and Catch-all */}
              <Route path="/admin" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AnimatePresence>

      </div>
    </>
  );
}

export default App;
