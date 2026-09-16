import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, CalendarDays, Users, Activity, Calendar } from "lucide-react";
import { getAdminDashboardSummary, getUserProfile, fetchEvents } from '../../services/api';

interface AdminOverviewPanelProps {
  token: string;
  onNavigate?: (tabId: string, filter?: string) => void;
  memberMode?: boolean;
}

interface Stats {
  assignedGuests:        number;
  pendingApplications:   number;
  approvedApplications:  number;
  rejectedApplications:  number;
  generatedInvitations:  number;
  todaysApplications:    number;
  todaysApprovals:       number;
}

export const AdminOverviewPanel: React.FC<AdminOverviewPanelProps> = ({ token, onNavigate, memberMode }) => {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  
  const [assignedEventsCount, setAssignedEventsCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const fetchStats = async () => {
    setError(null);
    try {
      const data = await getAdminDashboardSummary(token);
      if (data) { setStats(data); }
      
      if (memberMode) {
        // Fetch assigned events count & upcoming events
        const profile = await getUserProfile(token);
        const assignedIds = profile.data?.assignedEventIds?.map(String) || [];
        setAssignedEventsCount(assignedIds.length);
        
        const eventsRes = await fetchEvents(token, 0, 100);
        const allEvents = eventsRes.data?.content || eventsRes.data || eventsRes || [];
        const assigned = allEvents.filter((ev: any) => assignedIds.includes(ev.id?.toString() || ev.publicId));
        
        const now = new Date().getTime();
        const upcoming = assigned.filter((ev: any) => {
          const dt = new Date(ev.startDateTime || ev.event_date).getTime();
          return dt > now && (ev.status === 'ACTIVE' || ev.event_status === 'ACTIVE');
        }).slice(0, 3); // top 3 upcoming
        setUpcomingEvents(upcoming);
      }
      
      setLastRefresh(new Date());
    } catch { setError('Unable to load dashboard data. Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [token, memberMode]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-64">
        <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
        {error && (
          <div className="text-center text-xs text-red-300">
            <p>{error}</p>
            <button onClick={fetchStats} className="mt-2 font-semibold text-[#C5A059] hover:text-[#D4B86A]">Retry</button>
          </div>
        )}
      </div>
    );
  }

  // Define KPIs based on mode
  const kpis = memberMode 
    ? [
        { label: "Assigned Events",  value: assignedEventsCount,                   icon: Calendar,     color: "text-purple-400",  bg: "bg-purple-500/5",  border: "border-purple-500/20",  tab: "events",        filter: undefined },
        { label: "Assigned Guests",  value: stats?.assignedGuests        || 0, icon: Users,        color: "text-blue-400",    bg: "bg-blue-500/5",    border: "border-blue-500/20",    tab: "guests",        filter: undefined },
        { label: "Pending Review",   value: stats?.pendingApplications   || 0, icon: Clock,        color: "text-yellow-400",  bg: "bg-yellow-500/5",  border: "border-yellow-500/20",  tab: "applications",  filter: 'PENDING' },
        { label: "Approved Guests",  value: stats?.approvedApplications  || 0, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/20", tab: "applications",  filter: 'APPROVED' },
        { label: "Rejected Guests",  value: stats?.rejectedApplications  || 0, icon: XCircle,      color: "text-red-400",     bg: "bg-red-500/5",     border: "border-red-500/20",     tab: "applications",  filter: 'REJECTED' },
      ]
    : [
        { label: "Assigned Guests",  value: stats?.assignedGuests        || 0, icon: Users,        color: "text-blue-400",    bg: "bg-blue-500/5",    border: "border-blue-500/20",    tab: "guests",        filter: undefined },
        { label: "Pending",          value: stats?.pendingApplications   || 0, icon: Clock,        color: "text-yellow-400",  bg: "bg-yellow-500/5",  border: "border-yellow-500/20",  tab: "applications",  filter: 'PENDING' },
        { label: "Approved",         value: stats?.approvedApplications  || 0, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/20", tab: "applications",  filter: 'APPROVED' },
        { label: "Rejected",         value: stats?.rejectedApplications  || 0, icon: XCircle,      color: "text-red-400",     bg: "bg-red-500/5",     border: "border-red-500/20",     tab: "applications",  filter: 'REJECTED' },
        { label: "Invitations Sent", value: stats?.generatedInvitations  || 0, icon: CalendarDays, color: "text-[#C5A059]",   bg: "bg-[#C5A059]/5",   border: "border-[#C5A059]/20",   tab: "invitations",   filter: undefined },
        { label: "Today's Tasks",    value: stats?.todaysApplications    || 0, icon: Activity,     color: "text-purple-400",  bg: "bg-purple-500/5",  border: "border-purple-500/20",  tab: "applications",  filter: undefined },
      ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl p-6"
    >
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">Dashboard</h2>
          <p className="text-xs text-[#555] mt-0.5">
            Your assigned events and guest application overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#444]">
            Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={fetchStats}
            className="text-[11px] text-[#C5A059]/70 hover:text-[#C5A059] border border-[#C5A059]/20 hover:border-[#C5A059]/50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs text-red-300">
          <span>{error}</span>
          <button onClick={fetchStats} className="font-semibold hover:text-red-100">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${memberMode ? 'lg:grid-cols-5' : 'lg:grid-cols-6'} gap-4`}>
        {kpis.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onNavigate && onNavigate(card.tab, card.filter)}
            className={`${card.bg} ${card.border} border rounded-xl p-4 cursor-pointer hover:brightness-110 transition-all`}
          >
            <div className={`w-8 h-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center mb-3`}>
              <card.icon size={15} className={card.color} />
            </div>
            <p className={`text-2xl font-light ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-[#555] uppercase tracking-widest mt-1 font-semibold leading-tight">
              {card.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Dynamic Summary Section */}
      {memberMode ? (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center gap-2">
            <CalendarDays size={15} className="text-[#C5A059]" />
            <h3 className="text-sm font-semibold text-[#DDD]">Upcoming Event Summary</h3>
          </div>
          <div className="p-4">
            {upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {upcomingEvents.map(ev => (
                  <div key={ev.publicId || ev.id} className="bg-[#111] border border-[#222] p-4 rounded-lg">
                    <p className="text-xs text-[#555] mb-1">
                      {ev.startDateTime || ev.event_date ? new Date(ev.startDateTime || ev.event_date).toLocaleDateString() : 'TBD'}
                    </p>
                    <h4 className="text-sm font-semibold text-[#DDD] truncate">{ev.title || ev.event_name}</h4>
                    <p className="text-[11px] text-[#888] truncate mt-1">{ev.venue || 'Venue TBD'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#555] p-4 text-center">No upcoming active events assigned to you.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-[#C5A059]" />
              <h3 className="text-sm font-semibold text-[#DDD]">Today's Summary</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#1a1a1a]">
            {[
              { label: "Applications Today", value: stats?.todaysApplications || 0, note: "New applications received today", color: "text-purple-400" },
              { label: "Approvals Today", value: stats?.todaysApprovals || 0, note: "Applications approved today", color: "text-emerald-400" },
            ].map(item => (
              <div key={item.label} className="px-6 py-5">
                <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">
                  {item.label}
                </p>
                <p className={`text-4xl font-light ${item.color}`}>{item.value}</p>
                <p className="text-xs text-[#444] mt-2">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
