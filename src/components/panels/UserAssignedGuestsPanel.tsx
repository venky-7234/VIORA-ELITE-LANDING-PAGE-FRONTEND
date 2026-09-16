import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle2, XCircle, Eye, Search,
  ChevronLeft, ChevronRight, MoreVertical, Clock,
  AlertCircle, UserCheck, FileText, Save
} from 'lucide-react';
import { searchApplications, approveApplication, rejectApplication } from '../../services/api';
import { GuestProfileModal } from '../common/GuestProfileModal';

interface UserAssignedGuestsPanelProps {
  token: string;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  APPROVED:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED:  'bg-red-500/10 text-red-400 border-red-500/20',
  WAITLISTED:'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export const UserAssignedGuestsPanel: React.FC<UserAssignedGuestsPanelProps> = ({ token }) => {
  const [guests, setGuests]           = useState<any[]>([]);
  const [totalElements, setTotal]     = useState(0);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(0);
  const [searchQuery, setSearch]      = useState('');
  const [activeStatus, setStatus]     = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [openMenuId, setOpenMenu]     = useState<string | null>(null);
  const [selectedGuestId, setGuest]   = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setReason]     = useState('');
  const [actionLoading, setActing]    = useState<string | null>(null);
  
  const [notesModalGuest, setNotesModalGuest] = useState<any | null>(null);
  const [guestNote, setGuestNote]             = useState('');
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const req: any = {
        assignedToMe: true,                        // only guests assigned to this user
        query: searchQuery || null,
        status: activeStatus === 'ALL' ? null : activeStatus,
      };
      const res = await searchApplications(req, page, 20, 'createdAt', 'DESC', token);
      setGuests(res.data?.content || []);
      setTotal(res.data?.totalElements || 0);
    } catch {
      setGuests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, activeStatus, searchQuery, token]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleApprove = async (publicId: string) => {
    setOpenMenu(null);
    setActing(publicId);
    try {
      await approveApplication(publicId, token);
      load();
    } catch {
      alert('Failed to approve. Please try again.');
    } finally {
      setActing(null);
    }
  };

  const openRejectModal = (publicId: string) => {
    setOpenMenu(null);
    setReason('');
    setRejectModal({ id: publicId });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    setActing(rejectModal.id);
    try {
      await rejectApplication(rejectModal.id, rejectReason || 'Rejected by reviewer.', token);
      setRejectModal(null);
      load();
    } catch {
      alert('Failed to reject. Please try again.');
    } finally {
      setActing(null);
    }
  };

  const openNotesModal = (guest: any) => {
    setOpenMenu(null);
    setNotesModalGuest(guest);
    const saved = localStorage.getItem(`viora_verification_notes_${guest.publicId}`);
    setGuestNote(saved || '');
  };

  const saveNotes = () => {
    if (!notesModalGuest) return;
    localStorage.setItem(`viora_verification_notes_${notesModalGuest.publicId}`, guestNote);
    toast?.success?.('Notes saved successfully.') || alert('Notes saved successfully.');
    setNotesModalGuest(null);
  };


  const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;

  const pendingCount = guests.filter(g => g.status === 'PENDING').length;

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">My Guests</h2>
          <p className="text-xs text-[#555] mt-0.5">
            Guests assigned to you by your administrator. Review and action each guest's application.
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <Clock size={13} />
            {pendingCount} pending review
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
        <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-400/80 leading-relaxed">
          The Super Admin has assigned these guests to you for review. You can <strong>Approve</strong> or <strong>Reject</strong> each application. Approved guests will automatically receive their invitation.
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setStatus(tab); setPage(0); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                activeStatus === tab
                  ? 'bg-[#C5A059] text-black'
                  : 'text-[#666] hover:text-[#CCC] hover:bg-[#111]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or email…"
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] text-sm text-[#DDD] px-4 py-2 pl-9 rounded-lg focus:outline-none focus:border-[#C5A059]/40 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Guest</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Company</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Event</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Status</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Applied</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-[#555] uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="w-7 h-7 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[#555]">Loading guests…</p>
                </td>
              </tr>
            ) : guests.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <UserCheck size={36} className="text-[#2a2a2a] mx-auto mb-3" />
                  <p className="text-sm text-[#555]">
                    {activeStatus !== 'ALL'
                      ? `No ${activeStatus.toLowerCase()} guests found.`
                      : 'No guests have been assigned to you yet.'}
                  </p>
                  <p className="text-xs text-[#444] mt-1">
                    Contact your Super Admin if you believe this is incorrect.
                  </p>
                </td>
              </tr>
            ) : guests.map(guest => (
              <motion.tr
                key={guest.publicId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-[#111]/50 transition-colors group"
              >
                {/* Guest */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[11px] text-[#C5A059] font-bold shrink-0">
                      {((guest.full_name || guest.firstName || '') as string).split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <button 
                        onClick={() => setGuest(guest.publicId)}
                        className="text-sm font-semibold text-[#DDD] group-hover:text-[#C5A059] hover:underline transition-colors text-left"
                      >
                        {guest.full_name || guest.firstName || [guest.first_name, guest.last_name].filter(Boolean).join(' ')}
                      </button>
                      <p className="text-[11px] text-[#555]">{guest.email}</p>
                    </div>
                  </div>
                </td>

                {/* Company */}
                <td className="px-5 py-3.5">
                  <p className="text-xs text-[#888]">{guest.organization || guest.company || '—'}</p>
                  <p className="text-[11px] text-[#555]">{guest.industry}</p>
                </td>

                {/* Event */}
                <td className="px-5 py-3.5 text-xs text-[#888] max-w-[160px]">
                  <p className="truncate">{guest.eventTitle || '—'}</p>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_STYLE[guest.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {guest.status}
                  </span>
                </td>

                {/* Date */}
                <td className="px-5 py-3.5 text-xs text-[#666]">
                  {guest.createdAt
                    ? new Date(guest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5 text-right relative" ref={openMenuId === guest.publicId ? (menuRef as any) : undefined}>
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Quick approve / reject for PENDING */}
                    {guest.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(guest.publicId)}
                          disabled={actionLoading === guest.publicId}
                          title="Approve"
                          className="p-1.5 rounded-lg text-[#555] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                        >
                          {actionLoading === guest.publicId
                            ? <div className="w-3.5 h-3.5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                            : <CheckCircle2 size={15} />}
                        </button>
                        <button
                          onClick={() => openRejectModal(guest.publicId)}
                          title="Reject"
                          className="p-1.5 rounded-lg text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <XCircle size={15} />
                        </button>
                      </>
                    )}

                    {/* Three-dot overflow for View */}
                    <button
                      onClick={() => setOpenMenu(openMenuId === guest.publicId ? null : guest.publicId)}
                      className="p-1.5 rounded-lg text-[#555] hover:text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {openMenuId === guest.publicId && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-4 top-full mt-1 w-44 bg-[#111] border border-[#222] rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        <button
                          onClick={() => { setOpenMenu(null); setGuest(guest.publicId); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <Eye size={13} className="text-blue-400" /> View Profile
                        </button>
                        <button
                          onClick={() => openNotesModal(guest)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <FileText size={13} className="text-[#C5A059]" /> Notes & Verification
                        </button>
                        {guest.status === 'PENDING' && (
                          <>
                            <div className="border-t border-[#1a1a1a] mx-3 my-1" />
                            <button
                              onClick={() => { setOpenMenu(null); handleApprove(guest.publicId); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                            >
                              <CheckCircle2 size={13} className="text-emerald-400" /> Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(guest.publicId)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
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
          <span className="text-xs text-[#555]">
            {totalElements > 0
              ? `${page * 20 + 1}–${Math.min((page + 1) * 20, totalElements)} of ${totalElements}`
              : '0 guests'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * 20 >= totalElements}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Reject reason modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#0d0d0d] border border-[#222] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[#1a1a1a] flex items-center gap-3">
                <XCircle size={18} className="text-red-400" />
                <h3 className="text-sm font-semibold text-[#DDD]">Reject Application</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-[#888]">
                  Provide a reason for rejection. This will be recorded and may be shared with the guest.
                </p>
                <div>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">
                    Reason (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Incomplete profile information, not eligible for this event…"
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-red-400/40 outline-none transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#1a1a1a] flex justify-end gap-3 bg-[#0a0a0a]">
                <button
                  onClick={() => setRejectModal(null)}
                  className="px-5 py-2 text-sm text-[#888] hover:text-[#CCC] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={actionLoading === rejectModal.id}
                  className="px-5 py-2 bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === rejectModal.id && (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Notes / Verification Drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {notesModalGuest && (
          <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="w-full max-w-md h-full bg-[#0d0d0d] border-l border-[#222] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-[#1a1a1a] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-[#DDD]">
                    Verification Notes
                  </h3>
                  <p className="text-[11px] text-[#555]">
                    {notesModalGuest.full_name || notesModalGuest.firstName || notesModalGuest.email}
                  </p>
                </div>
                <button
                  onClick={() => setNotesModalGuest(null)}
                  className="text-[#555] hover:text-[#CCC] transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-start gap-2 bg-[#C5A059]/5 border border-[#C5A059]/20 rounded-xl p-3.5">
                  <AlertCircle size={14} className="text-[#C5A059] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#C5A059]/80 leading-relaxed">
                    Track the background verification progress and keep internal notes here. These notes are visible only to you.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">
                    Progress & Notes
                  </label>
                  <textarea
                    rows={12}
                    value={guestNote}
                    onChange={e => setGuestNote(e.target.value)}
                    placeholder="e.g. Identity verified via LinkedIn. Spoke with their reference..."
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-sm text-[#DDD] focus:border-[#C5A059]/40 outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-4 border-t border-[#1a1a1a] flex justify-end items-center bg-[#0a0a0a] gap-3 shrink-0">
                <button
                  onClick={() => setNotesModalGuest(null)}
                  className="text-sm text-[#666] hover:text-[#CCC] transition-colors px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNotes}
                  className="px-5 py-2 bg-[#C5A059] text-black text-sm font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors flex items-center gap-2"
                >
                  <Save size={14} /> Save Notes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Guest Profile Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedGuestId && (
          <GuestProfileModal
            publicId={selectedGuestId}
            token={token}
            onClose={() => setGuest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
