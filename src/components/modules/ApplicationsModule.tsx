import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  UserPlus, Eye, MoreVertical, CheckSquare, Square, Download
} from 'lucide-react';
import {
  getImperiumApplications, getWebsiteApplications,
  getImperiumApplicationSummary, getWebsiteApplicationSummary,
  approveApplication, rejectApplication,
  bulkApproveApplications, bulkRejectApplications,
  assignAdmin, fetchAdmins, getApplicationStreamUrl
} from '../../services/api';
import toast from 'react-hot-toast';

interface ApplicationsModuleProps {
  token: string;
  onOpenGuestProfile: (publicId: string) => void;
  eventId?: string | null;
  /** When true, shows only applications assigned to the signed-in admin. */
  adminMode?: boolean;
  initialTab?: StatusTab;
  applicationType?: 'imperium' | 'website';
}

type StatusTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'WAITLISTED';

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  APPROVED:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED:  'bg-red-500/10 text-red-400 border-red-500/20',
  WAITLISTED:'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const ApplicationsModuleBase: React.FC<ApplicationsModuleProps> = ({
  token, onOpenGuestProfile, eventId, adminMode = false, initialTab = 'ALL', applicationType = 'imperium'
}) => {
  const [activeTab, setActiveTab]   = useState<StatusTab>(initialTab);
  const [applications, setApps]     = useState<any[]>([]);
  const [totalElements, setTotal]   = useState(0);
  const [page, setPage]             = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [searchQuery, setSearch]    = useState('');
  const [selectedIds, setSelected]  = useState<Set<string>>(new Set());
  const [admins, setAdmins]         = useState<any[]>([]);
  const [summary, setSummary]       = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [openMenuId, setOpenMenu]   = useState<string | null>(null);
  const [assignDropdownFor, setAssignDD] = useState<string | null>(null);
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : {};
  const rawRoles = localStorage.getItem('roles');
  const userRoles = rawRoles ? JSON.parse(rawRoles) : (user.roles || [user.role]);
  const isSuperAdmin = userRoles.includes('ROLE_SUPER_ADMIN') || userRoles.includes('SUPER_ADMIN');
  const isAdmin = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ADMIN') || userRoles.includes('ROLE_MANAGER') || userRoles.includes('MANAGER');

  const eligibleAssignees = admins.filter(adminUser => {
    const role = String(adminUser.role || '').toUpperCase();
    if (!isSuperAdmin) {
      // Admins can only assign to Members
      return ['MEMBER', 'ROLE_USER'].includes(role);
    }
    // Super Admins can assign to anyone (Admins or Members)
    return ['ADMIN', 'MEMBER', 'MANAGER', 'ROLE_ADMIN', 'ROLE_USER', 'ROLE_MANAGER'].includes(role);
  });

  useEffect(() => {
    setActiveTab(initialTab);
    setPage(0);
  }, [initialTab]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [sort, setSort] = useState<'createdAt' | 'name' | 'status'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const menuRef = useRef<HTMLTableDataCellElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setAssignDD(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);

    try {
      const req: any = {};

      if (searchQuery.trim()) req.query = searchQuery.trim();
      if (activeTab !== 'ALL') req.status = activeTab;
      if (eventId) req.event_id = eventId;
      if (adminMode) req.assignedToMe = true;

      const fetchFn = applicationType === 'website' ? getWebsiteApplications : getImperiumApplications;
      const res = await fetchFn(
        req,
        page,
        20,
        sort,
        sortDir === 'desc' ? 'DESC' : 'ASC',
        token
      );

      let apps: any[] = [];

      if (Array.isArray(res)) {
        apps = res;
      } else if (res && typeof res === 'object') {
        apps = res.data?.content || res.content || res.data || res.applications || [];
      }

      if (!Array.isArray(apps)) apps = [];

      // Frontend fallback: if adminMode is true, ensure we only display assigned applications.
      const currentUserId = user ? (user.id || user.publicId) : null;
      if (adminMode && currentUserId) {
        apps = apps.filter((app: any) =>
          String(app.assignedAdminId) === String(currentUserId) ||
          String(app.assigned_admin_id) === String(currentUserId)
        );
      }

      // Status safeguard: never show rows that do not match the selected tab,
      // even if the backend ignores the status query parameter.
      if (activeTab !== 'ALL') {
        apps = apps.filter((app: any) =>
          String(app.status || '').trim().toUpperCase() === activeTab
        );
      }

      // Search safeguard in case the backend does not apply the search query.
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();

        apps = apps.filter((app: any) => {
          const name = String(
            app.full_name ||
            app.firstName ||
            [app.first_name, app.last_name].filter(Boolean).join(' ') ||
            ''
          ).toLowerCase();
          const email = String(app.email || '').toLowerCase();
          const organization = String(app.organization || app.company || '').toLowerCase();

          return name.includes(query) || email.includes(query) || organization.includes(query);
        });
      }

      const serverTotal = res?.data?.totalElements ?? res?.totalElements ?? res?.total ?? apps.length;

      setApps(apps);
      setTotal(activeTab === 'ALL' && !searchQuery.trim() ? serverTotal : apps.length);
    } catch (err) {
      console.error('Failed to load applications:', err);
      setError('Unable to load applications. Please try again.');
      setApps([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const fetchFn = applicationType === 'website' ? getWebsiteApplicationSummary : getImperiumApplicationSummary;
      const res = await fetchFn(token);
      if (res && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch summary", err);
    }
  };

  useEffect(() => { fetchApps(); fetchSummary(); }, [page, activeTab, searchQuery, token, eventId, sort, sortDir, applicationType]);
  useEffect(() => {
    fetchAdmins(token)
      .then(r => {
        const users = r.data?.content || r.data?.users || r.data || [];
        setAdmins(Array.isArray(users) ? users : []);
      })
      .catch(() => {});
  }, [token]);

  // Sync tab when parent navigates with a filter
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // ── Real-Time Server-Sent Events (SSE) & Background Sync ───────────────────
  useEffect(() => {
    if (!token) return;

    let eventSource: EventSource | null = null;
    try {
      const streamUrl = getApplicationStreamUrl(token);
      if (!streamUrl) return;
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener("NEW_APPLICATION", (e: MessageEvent) => {
        try {
          const newApp = JSON.parse(e.data);
          if (!newApp || !newApp.publicId) return;

          // If current tab is ALL or matches the application status, prepend immediately
          if (activeTab === "ALL" || activeTab === newApp.status) {
            const currentUserId = user ? (user.id || user.publicId) : null;
            if (adminMode && currentUserId) {
              if (String(newApp.assignedAdminId) !== String(currentUserId) && String(newApp.assigned_admin_id) !== String(currentUserId)) {
                return; // Ignore new applications not assigned to this user
              }
            }
            setApps(prev => {
              if (prev.some(a => a.publicId === newApp.publicId)) return prev;
              return [newApp, ...prev];
            });
            setTotal(prev => prev + 1);
          }

          toast.success(
            `New Application: ${newApp.full_name || newApp.firstName || "Guest"} ${newApp.lastName || ""} (${newApp.organization || newApp.company || newApp.email})`,
            {
              duration: 6000,
              icon: "📩",
              style: {
                background: "#141414",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.35)",
              }
            }
          );
        } catch (err) {
          console.error("Error parsing new application event", err);
        }
      });

      eventSource.onerror = () => {
        // SSE error or reconnecting; fallback polling ensures sync
      };
    } catch (e) {
      console.warn("Failed to initialize SSE stream", e);
    }

    // Polling fallback every 15s
    const pollTimer = setInterval(() => {
      fetchApps();
    }, 15000);

    // Sync on tab focus
    const onFocus = () => {
      fetchApps();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollTimer);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, activeTab, eventId, adminMode]);

  // Selection helpers
  const toggle = (id: string) => {
    if (applications.find(application => application.publicId === id)?.status !== 'PENDING') return;
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    const pendingIds = applications.filter(application => application.status === 'PENDING').map(application => application.publicId);
    if (selectedIds.size === pendingIds.length) setSelected(new Set());
    else setSelected(new Set(pendingIds));
  };

  // Actions
  const handleApprove = async (id: string) => {
    if (busyAction) return;
    setOpenMenu(null);
    setBusyAction(`approve:${id}`);
    try { await approveApplication(id, token); } catch { toast.error('Approval failed'); }
    finally { setBusyAction(null); fetchApps(); fetchSummary(); }
  };
  const handleReject = async (id: string) => {
    if (busyAction) return;
    setOpenMenu(null);
    setRejectionReason('');
    setRejectTarget(id);
  };
  const handleConfirmReject = async () => {
    if (!rejectTarget || !rejectionReason.trim() || busyAction) return;
    const target = rejectTarget;
    setBusyAction(`reject:${target}`);
    try {
      await rejectApplication(target, rejectionReason.trim(), token);
      setRejectTarget(null);
      setRejectionReason('');
    } catch { toast.error('Rejection failed'); }
    finally { setBusyAction(null); fetchApps(); fetchSummary(); }
  };
  const handleAssign = async (appId: string, adminId: string) => {
    if (busyAction) return;
    setAssignDD(null);
    setOpenMenu(null);
    setBusyAction(`assign:${appId}`);
    try { await assignAdmin(appId, adminId, token); toast.success('Guest assigned successfully'); } catch (e: any) { toast.error(e.message || 'Assign failed'); }
    finally { setBusyAction(null); fetchApps(); }
  };
  const handleBulkApprove = async () => {
    if (!selectedIds.size || busyAction) return;
    setBusyAction('bulk-approve');
    try { await bulkApproveApplications(Array.from(selectedIds), token); setSelected(new Set()); } catch { toast.error('Bulk approve failed'); }
    finally { setBusyAction(null); fetchApps(); fetchSummary(); }
  };
  const handleBulkReject = async () => {
    if (!selectedIds.size || busyAction) return;
    setRejectionReason('');
    setRejectTarget('bulk');
  };
  const handleConfirmBulkReject = async () => {
    if (rejectTarget !== 'bulk' || !rejectionReason.trim() || busyAction) return;
    setBusyAction('bulk-reject');
    try {
      await bulkRejectApplications(Array.from(selectedIds), rejectionReason.trim(), token);
      setSelected(new Set());
      setRejectTarget(null);
      setRejectionReason('');
    } catch { toast.error('Bulk reject failed'); }
    finally { setBusyAction(null); fetchApps(); fetchSummary(); }
  };

  const TABS: StatusTab[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED'];

  // Second status safeguard before rendering.
  const filteredApplications = applications.filter((app: any) => {
    if (activeTab === 'ALL') return true;
    return String(app.status || '').trim().toUpperCase() === activeTab;
  });

  const displayApplications = [...filteredApplications].sort((a, b) => {
    let left = '';
    let right = '';

    if (sort === 'name') {
      left = String(
        a.full_name || a.firstName || [a.first_name, a.last_name].filter(Boolean).join(' ') || ''
      ).toLowerCase();
      right = String(
        b.full_name || b.firstName || [b.first_name, b.last_name].filter(Boolean).join(' ') || ''
      ).toLowerCase();
    } else if (sort === 'status') {
      left = String(a.status || '').toLowerCase();
      right = String(b.status || '').toLowerCase();
    } else {
      left = String(a.createdAt || a.submitted_at || a.submittedAt || '');
      right = String(b.createdAt || b.submitted_at || b.submittedAt || '');
    }

    const result = left < right ? -1 : left > right ? 1 : 0;
    return result * (sortDir === 'asc' ? 1 : -1);
  });

  return (
    <div className="space-y-5 max-w-7xl pb-64">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">{applicationType === 'website' ? 'Website Applications' : 'Imperium Applications'}</h2>
          <p className="text-xs text-[#555] mt-0.5">Review and process guest applications.</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#888]">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle2 size={12} /> Approve All
            </button>
            <button
              onClick={handleBulkReject}
              className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <XCircle size={12} /> Reject All
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-1">Total</p>
          <p className="text-2xl font-light text-blue-400">{summary.total || 0}</p>
        </div>
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-1">Pending</p>
          <p className="text-2xl font-light text-yellow-400">{summary.pending || 0}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-1">Approved</p>
          <p className="text-2xl font-light text-emerald-400">{summary.approved || 0}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-1">Rejected</p>
          <p className="text-2xl font-light text-red-400">{summary.rejected || 0}</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(0); setSelected(new Set()); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                activeTab === tab
                  ? 'bg-[#C5A059] text-black'
                  : 'text-[#666] hover:text-[#CCC] hover:bg-[#111]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <select value={`${sort}:${sortDir}`} onChange={e => { const [field, direction] = e.target.value.split(':') as ['createdAt' | 'name' | 'status', 'asc' | 'desc']; setSort(field); setSortDir(direction); }} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#888]">
          <option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="name:asc">Name A-Z</option><option value="name:desc">Name Z-A</option><option value="status:asc">Status A-Z</option>
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={14} />
          <input
            type="text"
            placeholder="Search applications…"
            value={searchQuery}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="bg-[#0d0d0d] border border-[#1a1a1a] text-sm text-[#DDD] px-4 py-2 pl-9 rounded-lg focus:outline-none focus:border-[#C5A059]/40 transition-colors w-60"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <th className="px-4 py-3 w-10">
                <button onClick={toggleAll} className="text-[#555] hover:text-[#C5A059] transition-colors">
                  {applications.some(application => application.status === 'PENDING') && selectedIds.size === applications.filter(application => application.status === 'PENDING').length
                    ? <CheckSquare size={16} className="text-[#C5A059]" />
                    : <Square size={16} />}
                </button>
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">ID</th>
              <th className="px-4 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Guest</th>
              {applicationType !== 'website' && <th className="px-4 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Event</th>}
              <th className="px-4 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Status</th>
              <th className="px-4 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Assigned To</th>
              <th className="px-4 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Current Phase</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-[#555] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111]">
            {displayApplications.length === 0 ? (
              <tr>
                <td colSpan={applicationType === 'website' ? 7 : 8} className="py-16 text-center text-sm">
                  {loading ? <span className="text-[#555]">Loading…</span> : error ? <button onClick={fetchApps} className="text-red-300 hover:text-red-100">{error} Retry</button> : <span className="text-[#555]">No applications found.</span>}
                </td>
              </tr>
            ) : displayApplications.map(app => {
              const appId = app.publicId || app.id || Math.random().toString();
              return (
              <motion.tr
                key={appId}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="hover:bg-[#111]/50 transition-colors group"
              >
                <td className="px-4 py-3.5">
                  <button onClick={() => toggle(appId)} disabled={app.status !== 'PENDING'} className="text-[#555] hover:text-[#C5A059] transition-colors disabled:cursor-not-allowed disabled:opacity-30">
                    {selectedIds.has(appId)
                      ? <CheckSquare size={15} className="text-[#C5A059]" />
                      : <Square size={15} />}
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs text-[#C5A059]">{String(appId).substring(0, 8).toUpperCase()}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] text-[#C5A059] font-semibold shrink-0">
                      {((app.full_name || app.firstName || '') as string).split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <button 
                        onClick={() => onOpenGuestProfile(appId)}
                        className="text-sm text-[#DDD] font-medium group-hover:text-[#C5A059] hover:underline transition-colors text-left"
                      >
                        {app.full_name || app.firstName || [app.first_name, app.last_name].filter(Boolean).join(' ')}
                      </button>
                      <p className="text-[11px] text-[#555]">{app.organization || app.company || app.email}</p>
                    </div>
                  </div>
                </td>
                {applicationType !== 'website' && (
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-[#DDD]">{app.eventTitle || '—'}</p>
                    <p className="text-[11px] text-[#555]">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ''}</p>
                  </td>
                )}
                <td className="px-4 py-3.5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_STYLES[app.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {app.assignedAdminName ? (
                    <div>
                      <p className="text-xs font-medium text-[#DDD]">{app.assignedAdminName}</p>
                      <p className="text-[10px] text-[#555]">{app.assignedAdminEmail}</p>
                    </div>
                  ) : (
                    <span className="text-xs italic text-[#555] opacity-60">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full border border-[#C5A059]/20 bg-[#C5A059]/5 text-[10px] font-semibold text-[#C5A059] whitespace-nowrap">
                    {String(app.currentPhase || app.status || 'PENDING').replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right relative" ref={openMenuId === appId ? menuRef : undefined}>
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {app.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(appId)}
                          className="p-1.5 rounded-lg text-[#555] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          onClick={() => handleReject(appId)}
                          className="p-1.5 rounded-lg text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Reject"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setOpenMenu(openMenuId === appId ? null : appId)}
                      className="p-1.5 rounded-lg text-[#555] hover:text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {openMenuId === appId && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-8 top-12 z-50 w-48 rounded-xl border border-[#2a2a2a] bg-[#111] shadow-2xl overflow-hidden text-left"
                      >
                        <div className="p-1">
                          <button onClick={() => window.open('/admin/guests/' + app.publicId, '_blank')} className="w-full text-left px-3 py-2 text-xs text-[#CCC] hover:bg-[#1a1a1a] hover:text-[#FFF] rounded-lg transition-colors flex items-center gap-2">
                            <Eye size={14} /> View Profile
                          </button>
                          {app.status === 'PENDING' && (
                            <>
                              <button onClick={() => { setOpenMenu(null); handleApprove(appId); }} className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-2">
                                <CheckCircle2 size={14} /> Approve
                              </button>
                              <button onClick={() => { setOpenMenu(null); handleReject(appId); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2">
                                <XCircle size={14} /> Reject
                              </button>
                            </>
                          )}
                          {(isSuperAdmin || isAdmin) && (
                            <>
                              <div className="border-t border-[#1a1a1a] mx-2 my-1" />
                              {assignDropdownFor === appId ? (
                                <div className="px-2 py-1">
                                  <div className="text-[10px] text-[#888] font-semibold uppercase tracking-widest mb-1.5 px-1">Select Assignee</div>
                                  <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1">
                                    {eligibleAssignees.length === 0 ? (
                                      <div className="text-xs text-[#555] px-1 py-1">No active assignees found</div>
                                    ) : eligibleAssignees.map(admin => (
                                      <button
                                        key={admin.id}
                                        onClick={() => handleAssign(appId, admin.id)}
                                        className="w-full text-left px-2 py-1.5 text-xs text-[#DDD] hover:bg-[#1a1a1a] rounded-md transition-colors truncate"
                                      >
                                        {admin.full_name || admin.firstName || admin.email}
                                      </button>
                                    ))}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); setAssignDD(null); }} className="mt-1 w-full text-center py-1 text-[10px] text-[#888] hover:text-[#CCC]">Cancel</button>
                                </div>
                              ) : (
                                <button onClick={(e) => { e.stopPropagation(); setAssignDD(appId); }} className="w-full text-left px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors flex items-center gap-2">
                                  <UserPlus size={14} /> Assign
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
              </motion.tr>
            )})}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          <span className="text-xs text-[#555]">
            {totalElements > 0
              ? `${page * 20 + 1}–${Math.min((page + 1) * 20, totalElements)} of ${totalElements}`
              : '0 applications'}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors">
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 20 >= totalElements}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-[#F5F5F5]">Reject Application</h3>
              
              <label className="mt-5 block text-xs font-semibold uppercase tracking-widest text-[#777]">
                Select a Preset Reason
                <select
                  className="mt-2 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-sm text-[#DDD] outline-none focus:border-[#C5A059]/50 mb-4"
                  onChange={e => setRejectionReason(e.target.value)}
                >
                  <option value="">-- Choose a reason --</option>
                  <option value="Due to strict capacity constraints, we are unable to accommodate your request at this time.">Capacity constraints</option>
                  <option value="Your profile does not currently match the specific curation requirements for this exclusive event.">Does not match curation requirements</option>
                  <option value="The event has already reached its maximum guest capacity.">Event is fully booked</option>
                </select>
              </label>
              <label className="mt-2 block text-xs font-semibold uppercase tracking-widest text-[#777]">
                Custom / Edit Reason
                <textarea
                  autoFocus
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="Type or edit the reason here..."
                  className="mt-2 w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-sm text-[#DDD] outline-none focus:border-[#C5A059]/50"
                />
              </label>

              {!rejectionReason.trim() && (
                <p className="mt-2 text-xs text-red-400">A rejection reason is required.</p>
              )}
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setRejectTarget(null); setRejectionReason(''); }}
                  disabled={Boolean(busyAction)}
                  className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#999] hover:bg-[#1a1a1a] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={rejectTarget === 'bulk' ? handleConfirmBulkReject : handleConfirmReject}
                  disabled={!rejectionReason.trim() || Boolean(busyAction)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
                >
                  {busyAction ? 'Rejecting...' : 'Reject Application'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ApplicationsModule = React.memo(ApplicationsModuleBase);

