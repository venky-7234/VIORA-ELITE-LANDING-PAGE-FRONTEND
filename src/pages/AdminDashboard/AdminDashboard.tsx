import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, FileText, Users, BarChart3, Menu, X, UserCircle,
  LayoutDashboard, Mail, User, Bell, CalendarDays
} from "lucide-react";
import { ApplicationsModule } from '../../components/modules/ApplicationsModule';
import { GuestsModule } from '../../components/modules/GuestsModule';
import { GuestProfileModal } from '../../components/common/GuestProfileModal';
import { InvitationsModule } from '../../components/modules/InvitationsModule';
import { AdminProfileModule } from '../../components/modules/AdminProfileModule';
import { AdminOverviewPanel } from '../../components/panels/AdminOverviewPanel';
import { AdminAssignedEventsModule } from '../../components/modules/AdminAssignedEventsModule';
import { UserNotificationPanel } from '../../components/panels/UserNotificationPanel';
import { LogoutModal } from '../../components/common/LogoutModal';
import { fetchUnreadNotificationCount, getUserProfile } from '../../services/api';


interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  isEmbedded?: boolean;
  processedLogo?: string;
}

type TabType =
  | "dashboard"
  | "events"
  | "applications"
  | "invitations"
  | "guests"
  | "notifications"
  | "profile";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  onLogout,
  isEmbedded = false,
  processedLogo,
}) => {
  const [activeTab, setActiveTab]       = useState<TabType>("dashboard");
  const [visitedTabs, setVisitedTabs]   = useState<Set<TabType>>(new Set(["dashboard"]));
  const [mobileMenuOpen, setMobileMenu] = useState(false);
  const [selectedGuestId, setGuest]     = useState<string | null>(null);
  const [currentUser, setCurrentUser]   = useState<any>(null);
  const [isLogoutOpen, setLogoutOpen]   = useState(false);
  const [unreadCount, setUnread]        = useState(0);
  const [initialAppTab, setInitialAppTab] = useState<string>('ALL');
  
  const isAuthorized = React.useMemo(() => {
    try {
      if (!token) return false;
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = typeof payload.exp === "number" && payload.exp <= Math.floor(Date.now() / 1000);
      if (isExpired) return false;
      
      let hasAdmin = false;
      if (Array.isArray(payload.roles) && (payload.roles.includes("ROLE_ADMIN") || payload.roles.includes("ROLE_SUPER_ADMIN") || payload.roles.includes("ADMIN") || payload.roles.includes("SUPER_ADMIN"))) {
        hasAdmin = true;
      } else if (payload.role === "ROLE_ADMIN" || payload.role === "ROLE_SUPER_ADMIN" || payload.role === "ADMIN" || payload.role === "SUPER_ADMIN") {
        hasAdmin = true;
      }
      
      if (!hasAdmin) {
        try {
          const storedRoles = JSON.parse(localStorage.getItem("roles") || "[]");
          if (Array.isArray(storedRoles) && (storedRoles.includes("ROLE_ADMIN") || storedRoles.includes("ROLE_SUPER_ADMIN") || storedRoles.includes("ADMIN") || storedRoles.includes("SUPER_ADMIN"))) {
            hasAdmin = true;
          }
        } catch { }
      }
      return hasAdmin;
    } catch {
      return false;
    }
  }, [token]);

  // Profile
  const fetchProfile = async () => {
    try {
      setCurrentUser((await getUserProfile(token)).data);
    } catch { /* silent */ }
  };

  // Unread notifications count
  const fetchUnread = async () => {
    try {
      const res = await fetchUnreadNotificationCount(token);
      setUnread(res.data || 0);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchProfile();
    fetchUnread();
    window.addEventListener("profileUpdated", fetchProfile);
    window.addEventListener("mock-state-updated", fetchUnread);
    return () => {
      window.removeEventListener("profileUpdated", fetchProfile);
      window.removeEventListener("mock-state-updated", fetchUnread);
    };
  }, [token, isAuthorized]);

  const TABS = [
    { id: "dashboard",     label: "Dashboard",       icon: LayoutDashboard },
    { id: "events",        label: "Assigned Events",  icon: CalendarDays },
    { id: "guests",        label: "Assigned Guests",  icon: Users },
    { id: "applications",  label: "Applications",     icon: FileText },
    { id: "invitations",   label: "Invitations",      icon: Mail },
    { id: "notifications", label: "Notifications",    icon: Bell },
    { id: "profile",       label: "Profile",          icon: User },
  ] as const;

  const navigate = React.useCallback((tabId: string, statusFilter?: string) => {
    if (statusFilter) setInitialAppTab(statusFilter);
    setVisitedTabs(prev => new Set(prev).add(tabId as TabType));
    setActiveTab(tabId as TabType);
    setMobileMenu(false);
  }, []);

  const handleOpenGuestProfile = React.useCallback((id: string) => {
    setGuest(id);
  }, []);

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <>
      <div className="h-20 flex items-center justify-center px-6 border-b border-[#1a1a1a] shrink-0 relative bg-[#050505]">
        <img src={processedLogo || "/images/logo.png"} alt="Viora Elite" className="h-20 w-full scale-110 object-contain filter drop-shadow-[0_0_8px_rgba(212,175,55,0.15)]" />
        <button
          className="md:hidden ml-auto text-[#888] hover:text-[#C5A059] absolute right-4 transition-colors"
          onClick={() => setMobileMenu(false)}
        >
          <X size={22} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-bold text-[#555] uppercase tracking-[0.25em] mb-4 px-3">
          Admin Portal
        </p>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id as TabType)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group border-l-2 ${
                isActive
                  ? "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]"
                  : "text-[#777] hover:text-[#CCC] hover:bg-[#111] border-transparent"
              }`}
            >
              <Icon
                size={16}
                className={`shrink-0 ${isActive ? "text-[#C5A059]" : "text-[#555] group-hover:text-[#999]"}`}
              />
              <span className="text-sm font-medium tracking-wide flex-1 text-left">
                {tab.label}
              </span>
              {tab.id === "notifications" && unreadCount > 0 && (
                <span className="bg-[#C5A059] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#1a1a1a]">
        <button
          onClick={() => setLogoutOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  // ── Tab renderer ───────────────────────────────────────────────────────────
  const renderTab = (tabId: TabType) => {
    if (!visitedTabs.has(tabId)) return null;
    const visible = activeTab === tabId ? "block h-full" : "hidden";

    switch (tabId) {
      case "dashboard":
        return (
          <div className={visible} key="dashboard">
            <AdminOverviewPanel token={token} onNavigate={navigate} />
          </div>
        );
      case "events":
        return (
          <div className={visible} key="events">
            <AdminAssignedEventsModule token={token} canAssignMembers />
          </div>
        );
      case "applications":
        return (
          <div className={visible} key="applications">
            <ApplicationsModule
              token={token}
              onOpenGuestProfile={handleOpenGuestProfile}
              adminMode={true}
              initialTab={initialAppTab as any}
            />
          </div>
        );
      case "invitations":
        return (
          <div className={visible} key="invitations">
            <InvitationsModule token={token} />
          </div>
        );
      case "guests":
        return (
          <div className={visible} key="guests">
            <GuestsModule
              token={token}
              onOpenProfile={handleOpenGuestProfile}
              assignedOnly={true}
            />
          </div>
        );

      case "notifications":
        return (
          <div className={visible} key="notifications">
            <UserNotificationPanel token={token} />
          </div>
        );
      case "profile":
        return (
          <div className={visible} key="profile">
            <AdminProfileModule token={token} />
          </div>
        );
      default:
        return null;
    }
  };

  const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? activeTab;

  // The route guard handles navigation; this prevents standalone use from
  // mounting admin content or issuing admin requests before that redirect.
  if (!isAuthorized) return null;

  // ── Embedded mode (inside SuperAdmin) ──────────────────────────────────────
  if (isEmbedded) {
    return (
      <div className="w-full">
        {TABS.map(tab => renderTab(tab.id as TabType))}
      </div>
    );
  }

  // ── Full standalone layout ─────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#050505] text-[#F5F5F5] font-['Montserrat',sans-serif] flex overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="w-60 bg-[#080808] border-r border-[#1a1a1a] flex-col hidden md:flex h-full z-20">
        {renderSidebar()}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenu(false)}
              className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed inset-y-0 left-0 w-60 bg-[#080808] border-r border-[#1a1a1a] flex flex-col z-50 md:hidden"
            >
              {renderSidebar()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 h-full overflow-hidden flex flex-col bg-[#050505]">
        {/* Top Bar */}
        <header className="h-16 px-6 border-b border-[#1a1a1a] flex justify-between items-center shrink-0 bg-[#080808]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-[#888] hover:text-[#C5A059] transition-colors"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base font-semibold tracking-wide text-[#F5F5F5] hidden sm:block">
              {tabLabel}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            {/* Bell */}
            <button
              onClick={() => navigate("notifications")}
              className="relative text-[#666] hover:text-[#C5A059] transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C5A059] rounded-full text-black text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Profile chip */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate("profile")}
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-[#DDD] group-hover:text-[#C5A059] transition-colors">
                  {currentUser?.firstName
                    ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim()
                    : "Admin"}
                </p>
                <p className="text-[10px] text-[#C5A059] uppercase tracking-widest font-semibold">
                  Event Manager
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#111] border border-[#C5A059]/30 flex items-center justify-center overflow-hidden group-hover:border-[#C5A059]/60 transition-all">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle size={20} className="text-[#C5A059]" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {TABS.map(tab => renderTab(tab.id as TabType))}
        </div>
      </main>

      {/* Guest Profile Modal */}
      <AnimatePresence>
        {selectedGuestId && (
          <GuestProfileModal
            publicId={selectedGuestId}
            token={token}
            onClose={() => setGuest(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogoutOpen && (
          <LogoutModal
            isOpen={isLogoutOpen}
            onClose={() => setLogoutOpen(false)}
            onConfirm={() => { setLogoutOpen(false); onLogout(); }}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
