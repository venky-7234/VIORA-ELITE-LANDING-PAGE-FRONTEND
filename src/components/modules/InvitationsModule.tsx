import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Download, Send, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { fetchInvitations, resendInvitation, downloadInvitationPdfBlob } from '../../services/api';

interface InvitationsModuleProps {
  token: string;
  eventId?: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  SENT:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  DECLINED: 'bg-red-500/10 text-red-400 border-red-500/20',
  PENDING:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const InvitationsModuleBase: React.FC<InvitationsModuleProps> = ({ token, eventId }) => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [searchQuery, setSearch]      = useState('');
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId]   = useState<number | null>(null);
  const [sort, setSort] = useState<'createdAt' | 'guestName' | 'status'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInvitations(token, page, 20, eventId);
      if (res.data) {
        setInvitations(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch { setError('Unable to load invitations. Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token, page, eventId]);

  const handleResend = async (id: number) => {
    setResendingId(id);
    try {
      await resendInvitation(id, token);
      load();
    } catch { alert('Failed to resend invitation.'); }
    finally { setResendingId(null); }
  };

  const handleDownload = async (id: number) => {
    try {
      const blob = await downloadInvitationPdfBlob(id, token);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `invitation-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download PDF.'); }
  };

  const handlePreview = (tokenStr: string) => {
    window.open(`/invitation/${tokenStr}`, '_blank');
  };

  const filtered = invitations.filter(inv =>
    (inv.guestName  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.guestEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.invitationNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayInvitations = [...filtered].sort((a, b) => {
    const left = String(a[sort] || '').toLowerCase();
    const right = String(b[sort] || '').toLowerCase();
    return (left < right ? -1 : left > right ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
  });

  return (
    <div className="space-y-5 max-w-7xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">Invitations</h2>
          <p className="text-xs text-[#555] mt-0.5">Manage, resend, and download guest invitations.</p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={14} />
          <input
            type="text"
            placeholder="Search guest or invitation…"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#0d0d0d] border border-[#1a1a1a] text-sm text-[#DDD] px-4 py-2 pl-9 rounded-lg focus:outline-none focus:border-[#C5A059]/40 transition-colors w-64"
          />
        </div>
        <select value={`${sort}:${sortDir}`} onChange={e => { const [field, direction] = e.target.value.split(':') as ['createdAt' | 'guestName' | 'status', 'asc' | 'desc']; setSort(field); setSortDir(direction); }} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#888]">
          <option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="guestName:asc">Guest A-Z</option><option value="status:asc">Status A-Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Number</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Guest</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Event</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Generated</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Status</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-[#555] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111]">
            {loading ? (
              <tr><td colSpan={6} className="py-16 text-center text-[#555] text-sm">Loading…</td></tr>
            ) : displayInvitations.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-sm">{error ? <button onClick={load} className="text-red-300 hover:text-red-100">{error} Retry</button> : <span className="text-[#555]">No invitations found.</span>}</td></tr>
            ) : displayInvitations.map(inv => (
              <motion.tr
                key={inv.id ?? inv.publicId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-[#111]/50 transition-colors group"
              >
                <td className="px-5 py-3.5">
                  <span className="font-mono text-xs text-[#C5A059]">
                    {inv.invitationNumber || '—'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-semibold text-[#DDD]">{inv.guestName}</p>
                  <p className="text-[11px] text-[#555]">{inv.guestEmail}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-[#888]">{inv.eventTitle || '—'}</td>
                <td className="px-5 py-3.5 text-xs text-[#666]">
                  {inv.createdAt
                    ? new Date(inv.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })
                    : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_STYLE[inv.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right relative">
                  <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === inv.id ? null : inv.id); }}
                      className="p-1.5 rounded-lg text-[#555] hover:text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {openMenuId === inv.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-4 top-full mt-1 w-44 bg-[#111] border border-[#222] rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        <button
                          onClick={() => { setOpenMenuId(null); handlePreview(inv.token); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <Eye size={13} className="text-blue-400" /> Preview
                        </button>
                        <button
                          onClick={() => { setOpenMenuId(null); handleDownload(inv.id); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <Download size={13} className="text-emerald-400" /> Download PDF
                        </button>
                        <div className="border-t border-[#1a1a1a] mx-3 my-1" />
                        <button
                          onClick={() => { setOpenMenuId(null); handleResend(inv.id); }}
                          disabled={resendingId === inv.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                        >
                          <Send size={13} className="text-[#C5A059]" /> 
                          {resendingId === inv.id ? 'Resending...' : 'Resend Email'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          <span className="text-xs text-[#555]">Page {page + 1} of {Math.max(1, totalPages)}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const InvitationsModule = React.memo(InvitationsModuleBase);

