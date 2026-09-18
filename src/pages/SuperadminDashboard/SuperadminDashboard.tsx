import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Users, FileText, Activity, LayoutDashboard,
  CalendarDays, Mail, Shield, BarChart3, Settings,
  Bell, Menu, X, UserCircle, UserPlus, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Globe
} from "lucide-react";
import { fetchDashboardStats, fetchAuditLogs, fetchEvents, fetchUnreadNotificationCount, getUserProfile } from '../../services/api';
import { ApplicationsModule } from '../../components/modules/ApplicationsModule';
import { GuestProfileModal } from '../../components/common/GuestProfileModal';
import { AnalyticsModule } from '../../components/modules/AnalyticsModule';
import { InvitationsModule } from '../../components/modules/InvitationsModule';
import { AdminProfileModule } from '../../components/modules/AdminProfileModule';
import { SettingsModule } from '../../components/modules/SettingsModule';
import { EventsModule } from '../../components/modules/EventsModule';
import { UserManagementPanel } from '../../components/panels/UserManagementPanel';
import { UserNotificationPanel } from '../../components/panels/UserNotificationPanel';
import { LogoutModal } from '../../components/common/LogoutModal';
import { SuperAdminTasksPanel } from '../../components/panels/SuperAdminTasksPanel';
import { WebsiteApplicationsModule } from '../../components/modules/WebsiteApplicationsModule';

interface SuperadminDashboardProps {
  token: string;
  onLogout: () => void;
  processedLogo?: string;
}

type TabType =
  | "overview"
  | "events"
  | "applications"
  | "imperium-applications"
  | "website-applications"
  | "invitations"
  | "admins"
  | "users"
  | "analytics"
  | "notifications"
  | "tasks"
  | "settings";

// â”€â”€ Safe date formatter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function formatActivityDate(log: any): string {
  // Try multiple possible timestamp field names the backend might use
  const raw =
    log?.createdAt ??
    log?.created_at ??
    log?.timestamp ??
    log?.activity_at ??
    log?.updatedAt ??
    log?.updated_at ??
    null;

  if (!raw) return "â€”";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "â€”";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({ token, onLogout, processedLogo }) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(new Set(["overview"]));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardSelectedGuestId, setDashboardSelectedGuestId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [initialAppTab, setInitialAppTab] = useState<string>('ALL');
  // Tracks whether the Applications submenu is expanded in the sidebar
  const [appsExpanded, setAppsExpanded] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await getUserProfile(token);
      setCurrentUser(data.data);
    } catch (e) {
      console.error("Failed to fetch profile", e);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetchUnreadNotificationCount(token);
      setUnreadCount(res.data || 0);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchProfile();
    fetchUnreadCount();
    window.addEventListener("profileUpdated", fetchProfile);
    window.addEventListener("mock-state-updated", fetchUnreadCount);
    return () => {
      window.removeEventListener("profileUpdated", fetchProfile);
      window.removeEventListener("mock-state-updated", fetchUnreadCount);
    };
  }, [token]);

  // Security guard
  useEffect(() => {
    try {
      if (!token) { onLogout(); return; }
      
      const payload = JSON.parse(atob(token.split(".")[1]));
      let hasSuperAdmin = false;
      if (Array.isArray(payload.roles) && (payload.roles.includes("ROLE_SUPER_ADMIN") || payload.roles.includes("SUPER_ADMIN"))) {
        hasSuperAdmin = true;
      } else if (payload.role === "ROLE_SUPER_ADMIN" || payload.role === "SUPER_ADMIN") {
        hasSuperAdmin = true;
      }
      
      if (!hasSuperAdmin) {
        try {
          const storedRoles = JSON.parse(localStorage.getItem("roles") || "[]");
          if (Array.isArray(storedRoles) && (storedRoles.includes("ROLE_SUPER_ADMIN") || storedRoles.includes("SUPER_ADMIN"))) {
            hasSuperAdmin = true;
          }
        } catch { }
      }
      
      if (!hasSuperAdmin) {
        onLogout();
      }
    } catch {
      onLogout();
    }
  }, [token, onLogout]);

  // All nav items (flat) â€” used for tabLabel lookup
  const allNavItems = [
    { id: "overview",               label: "Dashboard" },
    { id: "events",                 label: "Events" },
    { id: "applications",           label: "Applications" },
    { id: "imperium-applications",  label: "Imperium Applications" },
    { id: "website-applications",   label: "Website Applications" },
    { id: "invitations",            label: "Invitations" },
    { id: "admins",                 label: "Admins" },
    { id: "users",                  label: "Users" },
    { id: "analytics",              label: "Analytics" },
    { id: "notifications",          label: "Notifications" },
    { id: "tasks",                  label: "Tasks" },
    { id: "settings",               label: "Settings" },
  ];

  // Keep Applications submenu expanded whenever an applications sub-tab is active
  useEffect(() => {
    if (activeTab === "imperium-applications" || activeTab === "website-applications") {
      setAppsExpanded(true);
    }
  }, [activeTab]);

  const handleTabClick = React.useCallback((tabId: TabType, statusFilter?: string) => {
    if (statusFilter) setInitialAppTab(statusFilter);
    setVisitedTabs(prev => new Set(prev).add(tabId));
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    if (tabId === "notifications") setUnreadCount(0);
  }, []);

  const handleOpenGuestProfile = React.useCallback((id: string) => {
    setDashboardSelectedGuestId(id);
  }, []);

  const isAppSubTab = activeTab === "imperium-applications" || activeTab === "website-applications";

  const navBtnClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
      isActive
        ? "bg-[#C5A059]/10 text-[#C5A059] border-l-2 border-[#C5A059]"
        : "text-[#777] hover:text-[#CCC] hover:bg-[#111] border-l-2 border-transparent"
    }`;

  const navIconClass = (isActive: boolean) =>
    `shrink-0 transition-colors ${isActive ? "text-[#C5A059]" : "text-[#555] group-hover:text-[#999]"}`;

  const renderSidebar = () => (
    <>
      <div className="h-20 flex items-center justify-center px-6 border-b border-[#1a1a1a] shrink-0 relative bg-[#050505]">
        <img src={processedLogo || "/images/logo.png"} alt="Viora Elite" className="h-20 w-full scale-110 object-contain filter drop-shadow-[0_0_8px_rgba(212,175,55,0.15)]" />
        <button
          className="md:hidden ml-auto text-[#888] hover:text-[#C5A059] absolute right-4 transition-colors"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X size={22} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-bold text-[#555] uppercase tracking-[0.25em] mb-4 px-3">
          Super Admin
        </p>

        {/* Dashboard */}
        <button onClick={() => handleTabClick("overview")} className={navBtnClass(activeTab === "overview")}>
          <LayoutDashboard size={16} className={navIconClass(activeTab === "overview")} />
          <span className="text-sm font-medium tracking-wide">Dashboard</span>
        </button>

        {/* Events */}
        <button onClick={() => handleTabClick("events")} className={navBtnClass(activeTab === "events")}>
          <CalendarDays size={16} className={navIconClass(activeTab === "events")} />
          <span className="text-sm font-medium tracking-wide">Events</span>
        </button>

        {/* Applications â€” Collapsible Parent */}
        <div>
          <button
            onClick={() => setAppsExpanded(prev => !prev)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative border-l-2 ${
              isAppSubTab
                ? "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]"
                : "text-[#777] hover:text-[#CCC] hover:bg-[#111] border-transparent"
            }`}
          >
            <FileText size={16} className={`shrink-0 transition-colors ${isAppSubTab ? "text-[#C5A059]" : "text-[#555] group-hover:text-[#999]"}`} />
            <span className="text-sm font-medium tracking-wide flex-1 text-left">Applications</span>
            {appsExpanded
              ? <ChevronDown size={14} className="shrink-0 text-[#555]" />
              : <ChevronRight size={14} className="shrink-0 text-[#555]" />
            }
          </button>

          <AnimatePresence initial={false}>
            {appsExpanded && (
              <motion.div
                key="apps-submenu"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-0.5 ml-4 pl-3 border-l border-[#1a1a1a] space-y-0.5">
                  <button
                    onClick={() => handleTabClick("imperium-applications")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
                      activeTab === "imperium-applications"
                        ? "bg-[#C5A059]/10 text-[#C5A059]"
                        : "text-[#666] hover:text-[#CCC] hover:bg-[#111]"
                    }`}
                  >
                    <FileText size={13} className={`shrink-0 ${activeTab === "imperium-applications" ? "text-[#C5A059]" : "text-[#444] group-hover:text-[#888]"}`} />
                    <span className="text-xs font-medium tracking-wide">Imperium Applications</span>
                  </button>
                  <button
                    onClick={() => handleTabClick("website-applications")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
                      activeTab === "website-applications"
                        ? "bg-[#C5A059]/10 text-[#C5A059]"
                        : "text-[#666] hover:text-[#CCC] hover:bg-[#111]"
                    }`}
                  >
                    <Globe size={13} className={`shrink-0 ${activeTab === "website-applications" ? "text-[#C5A059]" : "text-[#444] group-hover:text-[#888]"}`} />
                    <span className="text-xs font-medium tracking-wide">Website Applications</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Remaining top-level items */}
        {([
          { id: "invitations",   label: "Invitations",  icon: Mail },
          { id: "admins",        label: "Admins",        icon: Shield },
          { id: "users",         label: "Users",         icon: UserPlus },
          { id: "analytics",     label: "Analytics",     icon: BarChart3 },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "tasks",         label: "Tasks",         icon: CheckCircle2 },
          { id: "settings",      label: "Settings",      icon: Settings },
        ] as const).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id as TabType)}
              className={navBtnClass(isActive)}
            >
              <Icon size={16} className={navIconClass(isActive)} />
              <span className="text-sm font-medium tracking-wide">{item.label}</span>
              {item.id === "notifications" && unreadCount > 0 && (
                <span className="ml-auto bg-[#C5A059] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#1a1a1a]">
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  const renderTab = (tabId: TabType) => {
    if (!visitedTabs.has(tabId) || activeTab !== tabId) return null;
    const visible = "block h-full";

    switch (tabId) {
      case "overview":
        return (
          <div className={visible} key="overview">
            <OverviewPanel token={token} onNavigate={(tab, filter) => handleTabClick(tab as TabType, filter)} />
          </div>
        );
      case "events":
        return (
          <div className={visible} key="events">
            <EventsModule token={token} />
          </div>
        );
      case "applications":
        return (
          <div className={visible} key="applications">
            <ApplicationsModule
              token={token}
              onOpenGuestProfile={handleOpenGuestProfile}
              initialTab={initialAppTab as any}
            />
          </div>
        );
      case "imperium-applications":
        return (
          <div className={visible} key="imperium-applications">
            <ApplicationsModule
              token={token}
              onOpenGuestProfile={handleOpenGuestProfile}
              applicationType="imperium"
              initialTab={initialAppTab as any}
            />
          </div>
        );
      case "website-applications":
        return (
          <div className={visible} key="website-applications">
            <div className="p-6">
              <WebsiteApplicationsModule token={token} />
            </div>
          </div>
        );
      case "invitations":
        return (
          <div className={visible} key="invitations">
            <InvitationsModule token={token} />
          </div>
        );
      case "admins":
        return (
          <div className={visible} key="admins">
            <UserManagementPanel token={token} roleFilter="ADMIN" />
          </div>
        );
      case "users":
        return (
          <div className={visible} key="users">
            <UserManagementPanel token={token} roleFilter="USER" />
          </div>
        );
      case "analytics":
        return (
          <div className={visible} key="analytics">
            <AnalyticsModule token={token} />
          </div>
        );
      case "notifications":
        return (
          <div className={visible} key="notifications">
            <UserNotificationPanel token={token} />
          </div>
        );
      case "tasks":
        return (
          <div className={visible} key="tasks">
            <SuperAdminTasksPanel token={token} />
          </div>
        );
      case "settings":
        return (
          <div className={visible} key="settings">
            <SettingsModule token={token} />
          </div>
        );
      default:
        return null;
    }
  };

  const tabLabel = allNavItems.find(n => n.id === activeTab)?.label ?? activeTab;

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
              onClick={() => setMobileMenuOpen(false)}
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
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base font-semibold tracking-wide text-[#F5F5F5] capitalize hidden sm:block">
              {tabLabel}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <button
              onClick={() => handleTabClick("notifications")}
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
              onClick={() => handleTabClick("settings")}
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-[#DDD] group-hover:text-[#C5A059] transition-colors">
                  {currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim() : "Super Admin"}
                </p>
                <p className="text-[10px] text-[#C5A059] uppercase tracking-widest font-semibold">
                  Super Admin
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
          {(["overview", "events", "applications", "imperium-applications", "website-applications",
             "invitations", "admins", "users", "analytics", "notifications", "tasks", "settings"] as TabType[])
            .map(id => renderTab(id))}
        </div>
      </main>

      {/* Guest Profile Modal */}
      <AnimatePresence>
        {dashboardSelectedGuestId && (
          <GuestProfileModal
            publicId={dashboardSelectedGuestId}
            token={token}
            onClose={() => setDashboardSelectedGuestId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogoutModalOpen && (
          <LogoutModal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={() => { setIsLogoutModalOpen(false); onLogout(); }}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// â”€â”€â”€ Overview Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OverviewPanel = ({
  token,
  onNavigate
}: {
  token: string;
  onNavigate: (tabId: string, filter?: string) => void;
}) => {
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetchDashboardStats(token, null).catch((e) => { console.error(e); return null; }),
        fetchAuditLogs(token, 0, 6).catch((e) => { console.error(e); return null; })
      ]);
      console.log("BACKEND STATS RESPONSE:", statsRes);
      
      const defaultStats = {
        pendingApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0,
        totalGuests: 0,
        totalEvents: 0,
        activeAdmins: 0,
        totalApplications: 0
      };
      const rawData = statsRes?.data?.applications ? statsRes.data : (statsRes?.applications ? statsRes : null);
      
      const parsedStats = rawData ? {
        pendingApplications: rawData.applications?.pending_applications || 0,
        approvedApplications: rawData.applications?.approved_applications || 0,
        rejectedApplications: rawData.applications?.rejected_applications || 0,
        totalApplications: rawData.applications?.total_applications || 0,
        totalEvents: rawData.events?.total_events || 0,
        activeAdmins: rawData.users?.total_admins || 0,
        totalGuests: rawData.guests?.total_guests || 0
      } : defaultStats;
      
      setStats({ ...defaultStats, ...parsedStats });
      
      // Also fix recent logs if they are sent differently
      const parsedLogs = logsRes?.data ? logsRes.data.content : (logsRes?.content || []);
      setRecentLogs(parsedLogs || []);
    } catch (e) {
      console.error("Overview load failed", e);
      setStats({
        pendingApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0,
        totalGuests: 0,
        totalEvents: 0,
        activeAdmins: 0,
        totalApplications: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener("mock-state-updated", load);
    return () => window.removeEventListener("mock-state-updated", load);
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Apps",    value: stats.totalApplications    || 0, icon: CheckCircle2, color: "text-blue-400",    border: "border-blue-500/20",    bg: "bg-blue-500/5",    tab: "applications", filter: 'ALL' },
    { label: "Pending",       value: stats.pendingApplications  || 0, icon: Clock,        color: "text-yellow-400",  border: "border-yellow-500/20",  bg: "bg-yellow-500/5",  tab: "applications", filter: 'PENDING' },
    { label: "Approved",      value: stats.approvedApplications || 0, icon: CheckCircle2, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", tab: "applications", filter: 'APPROVED' },
    { label: "Rejected",      value: stats.rejectedApplications || 0, icon: XCircle,      color: "text-red-400",     border: "border-red-500/20",     bg: "bg-red-500/5",     tab: "applications", filter: 'REJECTED' },
    { label: "Total Guests",  value: stats.totalGuests || 0, icon: Users, color: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-500/5", tab: "applications", filter: "ALL" },
    { label: "Events",        value: stats.totalEvents          || 0, icon: CalendarDays, color: "text-purple-400",  border: "border-purple-500/20",  bg: "bg-purple-500/5",  tab: "events",       filter: undefined },
    { label: "Active Admins", value: stats.activeAdmins         || 0, icon: Shield,       color: "text-[#C5A059]",   border: "border-[#C5A059]/20",   bg: "bg-[#C5A059]/5",   tab: "admins",       filter: undefined },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-7xl p-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onNavigate(card.tab, card.filter)}
            className={`${card.bg} ${card.border} border rounded-xl p-4 cursor-pointer hover:brightness-110 transition-all group`}
          >
            <div className={`w-8 h-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center mb-3`}>
              <card.icon size={15} className={card.color} />
            </div>
            <p className={`text-2xl font-light ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-[#555] uppercase tracking-widest mt-1 font-semibold leading-tight">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#C5A059]" />
            <h3 className="text-sm font-semibold text-[#DDD] tracking-wide">Recent Activity</h3>
          </div>
          <span className="text-xs text-[#555]">Last 6 actions</span>
        </div>
        <div className="divide-y divide-[#111]">
          {recentLogs.length === 0 ? (
            <p className="text-center text-[#555] py-8 text-sm">No recent activity.</p>
          ) : (
            recentLogs.map((log, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-[#111] transition-colors">
                <span className="text-[11px] font-mono text-[#C5A059] bg-[#C5A059]/5 border border-[#C5A059]/20 px-2 py-0.5 rounded shrink-0">
                  {log.action}
                </span>
                <span className="text-xs text-[#999] flex-1 truncate">{log.description}</span>
                <span className="text-[10px] text-[#555] shrink-0">
                  {formatActivityDate(log)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
