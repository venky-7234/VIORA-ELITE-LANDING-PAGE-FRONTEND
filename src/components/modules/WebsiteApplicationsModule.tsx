import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Eye, ExternalLink, X
} from "lucide-react";
import {
  getWebsiteApplications,
  getWebsiteApplicationSummary,
  approveApplication,
  rejectApplication,
} from "../../services/api";
import toast from "react-hot-toast";

type StatusTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
const TABS: StatusTab[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

function safeDate(value: any): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function initials(name: string): string {
  return (name || "").split(" ").map(n => n[0] || "").join("").substring(0, 2).toUpperCase();
}

function matchesSearch(app: any, q: string): boolean {
  if (!q.trim()) return true;
  const lq = q.toLowerCase();
  return [app.full_name, app.firstName, app.first_name, app.email, app.phone,
          app.organization, app.company, app.profession, app.city]
    .some(v => String(v || "").toLowerCase().includes(lq));
}

// --- Details Modal ------------------------------------------------------------
const DetailsModal: React.FC<{
  app: any; onClose: () => void;
  onApprove: () => void; onReject: () => void; busy: boolean;
}> = ({ app, onClose, onApprove, onReject, busy }) => {
  const fullName = app.full_name || app.firstName || [app.first_name, app.last_name].filter(Boolean).join(" ") || "—";
  const appId = String(app.publicId || app.id || "—");
  const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
      <p className="text-[9px] font-bold text-[#555] uppercase tracking-widest mb-0.5">{label}</p>
      <div className="text-sm text-[#DDD] break-words">{value || "—"}</div>
    </div>
  );
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#0d0d0d] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Application Details</h3>
            <p className="text-[10px] text-[#555] font-mono mt-0.5">{appId.substring(0, 12).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#CCC] transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <span className={`inline-flex px-3 py-1 text-[11px] font-semibold rounded-full border ${STATUS_STYLES[app.status] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
            {app.status || "UNKNOWN"}
          </span>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name" value={fullName} />
            <Field label="Submitted" value={safeDate(app.submitted_at || app.createdAt || app.created_at)} />
            <Field label="Email" value={app.email} />
            <Field label="Phone" value={app.phone} />
            <Field label="City" value={app.city} />
            <Field label="Profession" value={app.profession} />
            <div className="col-span-2"><Field label="Organization" value={app.organization || app.company} /></div>
          </div>
          {app.application_message && (
            <div>
              <p className="text-[9px] font-bold text-[#555] uppercase tracking-widest mb-1">Application Message</p>
              <p className="text-sm text-[#AAA] bg-[#111] rounded-lg px-4 py-3 border border-[#1a1a1a] leading-relaxed">{app.application_message}</p>
            </div>
          )}
          {(app.linkedin_url || app.instagram_url) && (
            <div className="flex gap-3">
              {app.linkedin_url && (
                <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink size={12} /> LinkedIn
                </a>
              )}
              {app.instagram_url && (
                <a href={app.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 transition-colors">
                  <ExternalLink size={12} /> Instagram
                </a>
              )}
            </div>
          )}
        </div>
        {app.status === "PENDING" && (
          <div className="px-6 py-4 border-t border-[#1a1a1a] flex justify-end gap-3">
            <button onClick={onReject} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50">
              <XCircle size={14} /> Reject
            </button>
            <button onClick={onApprove} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50">
              <CheckCircle2 size={14} /> Approve
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// --- Reject Modal -------------------------------------------------------------
const RejectModal: React.FC<{ onConfirm: (r: string) => void; onCancel: () => void; busy: boolean; }> = ({ onConfirm, onCancel, busy }) => {
  const [reason, setReason] = useState("");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-[#F5F5F5]">Reject Application</h3>
        <label className="mt-5 block text-xs font-semibold uppercase tracking-widest text-[#777]">
          Select a Preset Reason
          <select className="mt-2 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-sm text-[#DDD] outline-none focus:border-[#C5A059]/50 mb-4"
            onChange={e => setReason(e.target.value)}>
            <option value="">-- Choose a reason --</option>
            <option value="Your profile does not currently match the specific curation requirements for this exclusive event.">Does not match curation requirements</option>
            <option value="Due to strict capacity constraints, we are unable to accommodate your request at this time.">Capacity constraints</option>
          </select>
        </label>
        <label className="mt-2 block text-xs font-semibold uppercase tracking-widest text-[#777]">
          Custom / Edit Reason
          <textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} rows={4}
            placeholder="Type or edit the reason here..."
            className="mt-2 w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-sm text-[#DDD] outline-none focus:border-[#C5A059]/50" />
        </label>
        {!reason.trim() && <p className="mt-2 text-xs text-red-400">A rejection reason is required.</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} disabled={busy}
            className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#999] hover:bg-[#1a1a1a] disabled:opacity-50">Cancel</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason.trim() || busy}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50">
            {busy ? "Rejecting…" : "Reject Application"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main Module --------------------------------------------------------------
const WebsiteApplicationsModuleBase: React.FC<{ token: string }> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [applications, setApps] = useState<any[]>([]);
  const [totalElements, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearch] = useState("");
  const [sort, setSort] = useState<"createdAt" | "status">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true); setError(null);
    try {
      const req: any = {};
      if (activeTab !== "ALL") req.status = activeTab;
      const res = await getWebsiteApplications(req, page, 50, sort, sortDir === "desc" ? "DESC" : "ASC", token);
      let apps: any[] = [];
      let total = 0;
      if (Array.isArray(res)) { apps = res; }
      else if (res && typeof res === "object") {
        apps = res.data?.content || res.content || res.data || res.applications || [];
        total = res.data?.totalElements ?? res.totalElements ?? res.total ?? apps.length;
      }
      setApps(apps); setTotal(total || apps.length);
    } catch { setError("Unable to load website applications. Please try again."); }
    finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try { const res = await getWebsiteApplicationSummary(token); if (res?.data) setSummary(res.data); } catch {}
  };

  useEffect(() => { fetchApps(); fetchSummary(); }, [page, activeTab, sort, sortDir, token]);

  const handleApprove = async (id: string) => {
    if (busyAction) return;
    setBusyAction(`approve:${id}`);
    try { await approveApplication(id, token); toast.success("Application approved"); setSelectedApp(null); }
    catch { toast.error("Approval failed"); }
    finally { setBusyAction(null); fetchApps(); fetchSummary(); }
  };

  const handleRejectOpen = (id: string) => { setRejectTargetId(id); setSelectedApp(null); };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectTargetId || !reason.trim() || busyAction) return;
    const id = rejectTargetId;
    setBusyAction(`reject:${id}`);
    try { await rejectApplication(id, reason.trim(), token); toast.success("Application rejected"); setRejectTargetId(null); }
    catch { toast.error("Rejection failed"); }
    finally { setBusyAction(null); fetchApps(); fetchSummary(); }
  };

  const displayApplications = applications.filter(app => matchesSearch(app, searchQuery));

  return (
    <div className="space-y-5 max-w-7xl pb-24">
      <p className="text-xs text-[#555]">Review and process website guest applications.</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",    value: summary.total,    color: "blue",    tab: null },
          { label: "Pending",  value: summary.pending,  color: "yellow",  tab: "PENDING" },
          { label: "Approved", value: summary.approved, color: "emerald", tab: "APPROVED" },
          { label: "Rejected", value: summary.rejected, color: "red",     tab: "REJECTED" },
        ].map(({ label, value, color, tab }) => (
          <div key={label}
            onClick={() => { if (tab) { setActiveTab(tab as StatusTab); setPage(0); } }}
            className={`bg-${color}-500/5 border border-${color}-500/20 rounded-xl p-4 ${tab ? "cursor-pointer hover:brightness-110 transition-all" : ""}`}>
            <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-light text-${color}-400`}>{value || 0}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setPage(0); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === tab ? "bg-[#C5A059] text-black" : "text-[#666] hover:text-[#CCC] hover:bg-[#111]"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={`${sort}:${sortDir}`}
            onChange={e => { const [f, d] = e.target.value.split(":") as [typeof sort, typeof sortDir]; setSort(f); setSortDir(d); }}
            className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#888] outline-none">
            <option value="createdAt:desc">Newest first</option>
            <option value="createdAt:asc">Oldest first</option>
            <option value="status:asc">Status A–Z</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={14} />
            <input type="text" placeholder="Search name, email, phone, org…" value={searchQuery}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="bg-[#0d0d0d] border border-[#1a1a1a] text-sm text-[#DDD] px-4 py-2 pl-9 rounded-lg focus:outline-none focus:border-[#C5A059]/40 transition-colors w-64" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
              {["ID", "Guest", "Email", "Phone", "Organization", "Status", "Submitted", "Actions"].map(h => (
                <th key={h} className={`px-4 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest${h === "Actions" ? " text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111]">
            {loading && (
              <tr><td colSpan={8} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#555]">Loading website applications…</span>
                </div>
              </td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={8} className="py-16 text-center">
                <p className="text-sm text-red-400 mb-3">{error}</p>
                <button onClick={fetchApps} className="px-4 py-2 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">Retry</button>
              </td></tr>
            )}
            {!loading && !error && displayApplications.length === 0 && (
              <tr><td colSpan={8} className="py-16 text-center text-sm text-[#555]">No website applications found.</td></tr>
            )}
            {!loading && !error && displayApplications.map(app => {
              const appId = String(app.publicId || app.id || "");
              const fullName = app.full_name || app.firstName || [app.first_name, app.last_name].filter(Boolean).join(" ") || "—";
              const sub = app.submitted_at || app.createdAt || app.created_at;
              return (
                <motion.tr key={appId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-[#111]/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-[#C5A059]">{appId.substring(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] text-[#C5A059] font-semibold shrink-0">
                        {initials(fullName)}
                      </div>
                      <div>
                        <p className="text-sm text-[#DDD] font-medium leading-tight">{fullName}</p>
                        {(app.profession || app.city) && (
                          <p className="text-[11px] text-[#555]">{[app.profession, app.city].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><span className="text-xs text-[#AAA]">{app.email || "—"}</span></td>
                  <td className="px-4 py-3.5"><span className="text-xs text-[#AAA]">{app.phone || "—"}</span></td>
                  <td className="px-4 py-3.5"><span className="text-xs text-[#AAA]">{app.organization || app.company || "—"}</span></td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_STYLES[app.status] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>{app.status || "—"}</span>
                  </td>
                  <td className="px-4 py-3.5"><span className="text-xs text-[#666]">{safeDate(sub)}</span></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setSelectedApp(app)} title="View Details"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#888] hover:text-[#CCC] bg-[#111] hover:bg-[#1a1a1a] border border-[#1a1a1a] transition-colors">
                        <Eye size={12} /> View
                      </button>
                      {app.status === "PENDING" && (
                        <>
                          <button onClick={() => handleApprove(appId)} disabled={!!busyAction} title="Approve"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors disabled:opacity-50">
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button onClick={() => handleRejectOpen(appId)} disabled={!!busyAction} title="Reject"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50">
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          <span className="text-xs text-[#555]">
            {totalElements > 0
              ? `${page * 50 + 1}–${Math.min((page + 1) * 50, totalElements)} of ${totalElements}`
              : `${displayApplications.length} application${displayApplications.length !== 1 ? "s" : ""}`}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"><ChevronLeft size={15} /></button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 50 >= totalElements}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedApp && (
          <DetailsModal app={selectedApp} onClose={() => setSelectedApp(null)}
            onApprove={() => handleApprove(selectedApp.publicId || selectedApp.id)}
            onReject={() => handleRejectOpen(selectedApp.publicId || selectedApp.id)}
            busy={!!busyAction} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectTargetId && (
          <RejectModal onConfirm={handleConfirmReject} onCancel={() => setRejectTargetId(null)} busy={!!busyAction} />
        )}
      </AnimatePresence>
    </div>
  );
};

export const WebsiteApplicationsModule = React.memo(WebsiteApplicationsModuleBase);
