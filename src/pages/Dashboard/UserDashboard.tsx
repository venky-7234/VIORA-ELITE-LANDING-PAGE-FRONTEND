import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, LayoutDashboard, Menu, X, UserCircle,
  Bell, Calendar, User, Users, BarChart3
} from "lucide-react";
import { AdminOverviewPanel } from '../../components/panels/AdminOverviewPanel';
import { AdminAssignedEventsModule } from '../../components/modules/AdminAssignedEventsModule';
import { MemberAnalyticsPanel } from '../../components/panels/MemberAnalyticsPanel';
import { UserNotificationPanel } from '../../components/panels/UserNotificationPanel';
import { UserProfilePanel }      from '../../components/panels/UserProfilePanel';
import { UserAssignedGuestsPanel } from '../../components/panels/UserAssignedGuestsPanel';
import { ApplicationsModule } from '../../components/modules/ApplicationsModule';
import { LogoutModal } from '../../components/common/LogoutModal';
import { fetchNotifications, getUserProfile } from '../../services/api';
import { FileText } from 'lucide-react';

interface UserDashboardProps {
  token?: string;
  onLogout?: () => void;
  processedLogo?: string;
}

type TabType = "dashboard" | "events" | "guests" | "applications" | "analytics" | "notifications" | "profile";

export const UserProfile: React.FC<UserDashboardProps> = ({ token = "", onLogout, processedLogo }) => {
  const [activeTab, setActiveTab]     = useState<TabType>("dashboard");
  const [visitedTabs, setVisited]     = useState<Set<TabType>>(new Set(["dashboard"]));
  const [mobileMenuOpen, setMobile]   = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLogoutOpen, setLogoutOpen] = useState(false);
  const [unreadCount, setUnread]      = useState(0);

  // Profile
  useEffect(() => {
    if (!token) return;
    getUserProfile(token)
      .then(d => setCurrentUser(d.data))
      .catch(() => {});
  }, [token]);

  // Unread notifications
  useEffect(() => {
    if (!token) return;
    fetchNotifications(token)
      .then(d => setUnread((d.data?.content || []).filter((n: any) => !n.isRead).length))
      .catch(() => {});
  }, [token]);

  const navigate = React.useCallback((tabId: string) => {
    setVisited(prev => new Set(prev).add(tabId as TabType));
    setActiveTab(tabId as TabType);
    setMobile(false);
    if (tabId === "notifications") setUnread(0);
  }, []);

  const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "dashboard",     label: "Work Overview",    icon: LayoutDashboard },
    { id: "events",        label: "Assigned Events",  icon: Calendar        },
    { id: "guests",        label: "Assigned Guests",  icon: Users           },
    { id: "applications",  label: "Applications",     icon: FileText        },
    { id: "analytics",     label: "Event Analytics",  icon: BarChart3       },
    { id: "notifications", label: "Notifications",    icon: Bell            },
    { id: "profile",       label: "Profile",          icon: User            },
  ];

  const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? activeTab;

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <>
      <div className="h-20 flex items-center justify-center px-6 border-b border-[#1a1a1a] shrink-0 relative bg-[#050505]">
        <img src={processedLogo || "/images/logo.png"} alt="Viora Elite" className="h-20 w-full scale-110 object-contain filter drop-shadow-[0_0_8px_rgba(212,175,55,0.15)]" />
        <button
          className="md:hidden absolute right-4 text-[#666] hover:text-[#C5A059] transition-colors"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-bold text-[#555] uppercase tracking-[0.25em] mb-4 px-3">
          Internal Operations
        </p>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
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
              <span className="text-sm font-medium tracking-wide flex-1 text-left">{tab.label}</span>
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
          <LogOut size={15} /> Logout
        </button>
      </div>
    </>
  );

  // ── Tab renderer ─────────────────────────────────────────────────────────
  const renderTab = (tabId: TabType) => {
    if (!visitedTabs.has(tabId)) return null;
    const cls = activeTab === tabId ? "block" : "hidden";

    switch (tabId) {
      case "dashboard":    return <div className={cls} key="dashboard"><AdminOverviewPanel token={token} memberMode={true} onNavigate={(tab) => navigate(tab === 'applications' ? 'applications' : tab === 'invitations' ? 'guests' : tab)} /></div>;
      case "events":       return <div className={cls} key="events"><AdminAssignedEventsModule token={token} canAssignMembers={false} /></div>;
      case "guests":       return <div className={cls} key="guests"><UserAssignedGuestsPanel token={token} /></div>;
      case "applications": return <div className={cls} key="applications"><ApplicationsModule token={token} adminMode={true} onOpenGuestProfile={() => {}} /></div>;
      case "analytics":    return <div className={cls} key="analytics"><MemberAnalyticsPanel token={token} /></div>;
      case "notifications":return <div className={cls} key="notifications"><UserNotificationPanel token={token} /></div>;
      case "profile":      return <div className={cls} key="profile"><UserProfilePanel token={token} /></div>;
      default: return null;
    }
  };

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
              onClick={() => setMobile(false)}
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
              className="md:hidden text-[#666] hover:text-[#C5A059] transition-colors"
              onClick={() => setMobile(true)}
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

            {/* Avatar chip */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate("profile")}
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-[#DDD] group-hover:text-[#C5A059] transition-colors">
                  {currentUser?.firstName
                    ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim()
                    : "My Account"}
                </p>
                <p className="text-[10px] text-[#C5A059] uppercase tracking-widest font-semibold">
                  Member
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

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {TABS.map(tab => renderTab(tab.id))}
        </div>
      </main>

      {/* Logout Modal */}
      <AnimatePresence>
        {isLogoutOpen && (
          <LogoutModal
            isOpen={isLogoutOpen}
            onClose={() => setLogoutOpen(false)}
            onConfirm={() => { setLogoutOpen(false); if (onLogout) onLogout(); }}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
