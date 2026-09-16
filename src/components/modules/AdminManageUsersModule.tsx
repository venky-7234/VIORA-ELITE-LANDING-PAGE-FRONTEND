import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, UserPlus, X, Check, ChevronDown, CalendarDays,
  UserCircle, Mail, Phone, Shield, Loader2, AlertCircle, RefreshCw, Trash2
} from 'lucide-react';
import {
  fetchAllUsers, fetchEvents, searchApplications,
  adminAssignEventsToUser, assignGuestToUser, deleteUser
} from '../../services/api';
import { toast, Toaster } from 'react-hot-toast';

interface AdminManageUsersModuleProps {
  token: string;
}

const ROLE_COLORS: Record<string, string> = {
  USER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ADMIN: 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20',
  SUPER_ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  INACTIVE: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  SUSPENDED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const AdminManageUsersModule: React.FC<AdminManageUsersModuleProps> = ({ token }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modal, setModal] = useState<'events' | 'guests' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);

  // For event assignment modal
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [eventSearch, setEventSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  // For guest assignment modal
  const [guestSearch, setGuestSearch] = useState('');
  const [guestPage, setGuestPage] = useState(0);
  const [guestTotal, setGuestTotal] = useState(0);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // ── Load users & events ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, eventsRes] = await Promise.all([
        fetchAllUsers(token, 0, 100),
        fetchEvents(token, 0, 200),
      ]);
      setUsers(usersRes.data?.content || usersRes.content || []);
      const evtData = eventsRes.data;
      setEvents(Array.isArray(evtData) ? evtData : (evtData?.content || []));
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load guests (approved applications) for assignment ───────────────────
  const loadGuests = useCallback(async (q = '', page = 0) => {
    setLoadingGuests(true);
    try {
      const res = await searchApplications({ query: q || null, status: 'APPROVED' }, page, 20, 'createdAt', 'DESC', token);
      setGuests(res.data?.content || []);
      setGuestTotal(res.data?.totalElements || 0);
    } catch {
      toast.error('Failed to load guests');
    } finally {
      setLoadingGuests(false);
    }
  }, [token]);

  useEffect(() => {
    if (modal === 'guests') loadGuests(guestSearch, guestPage);
  }, [modal, guestSearch, guestPage, loadGuests]);

  // ── Filtered users ───────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  // ── Open modals ──────────────────────────────────────────────────────────
  const openEventModal = (user: any) => {
    setSelectedUser(user);
    setSelectedEventIds(user.assignedEventIds || []);
    setEventSearch('');
    setModal('events');
  };

  const openGuestModal = (user: any) => {
    setSelectedUser(user);
    setGuestSearch('');
    setGuestPage(0);
    setModal('guests');
  };

  const closeModal = () => {
    setModal(null);
    setSelectedUser(null);
    setAssigning(false);
  };

  // ── Assign events ────────────────────────────────────────────────────────
  const handleAssignEvents = async () => {
    if (!selectedUser) return;
    setAssigning(true);
    try {
      await adminAssignEventsToUser(selectedUser.id, selectedEventIds, token);
      toast.success(`Events assigned to ${selectedUser.firstName || selectedUser.email}`);
      await loadData();
      closeModal();
    } catch (e: any) {
      toast.error(e.message || 'Failed to assign events');
    } finally {
      setAssigning(false);
    }
  };

  // ── Assign guest ─────────────────────────────────────────────────────────
  const handleAssignGuest = async (guestPublicId: string, guestName: string) => {
    if (!selectedUser) return;
    setAssigning(true);
    try {
      await assignGuestToUser(guestPublicId, selectedUser.email, token);
      toast.success(`${guestName} assigned to ${selectedUser.firstName || selectedUser.email}`);
      await loadGuests(guestSearch, guestPage);
    } catch (e: any) {
      toast.error(e.message || 'Failed to assign guest');
    } finally {
      setAssigning(false);
    }
  };

  // ── Delete user ──────────────────────────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      await deleteUser(selectedUser.id, token);
      toast.success(`${selectedUser.firstName || selectedUser.email} deleted successfully`);
      await loadData();
      closeModal();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const toggleEvent = (publicId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(publicId) ? prev.filter(id => id !== publicId) : [...prev, publicId]
    );
  };

  const filteredEvents = events.filter(ev =>
    (ev.title || ev.name || '').toLowerCase().includes(eventSearch.toLowerCase())
  );

  // ── Role badge ───────────────────────────────────────────────────────────
  const roleName = (user: any) => user.roles?.[0]?.name || 'USER';
  const canReviewApplications = (user: any) => ['ADMIN', 'MANAGER'].includes(roleName(user));

  return (
    <div className="w-full space-y-5 p-6">
      <Toaster position="top-right" toastOptions={{ style: { background: '#111', color: '#DDD', border: '1px solid #222' } }} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">Manage Users</h2>
          <p className="text-xs text-[#555] mt-0.5">Assign events and guests to registered users</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-[#1a1a1a] hover:border-[#C5A059]/40 rounded-lg text-xs text-[#888] hover:text-[#C5A059] transition-all"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl text-sm text-[#DDD] placeholder-[#444] focus:outline-none focus:border-[#C5A059]/40 transition-colors"
        />
      </div>

      {/* Users grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="text-[#C5A059] animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#444]">
          <Users size={36} />
          <p className="text-sm">No users found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 flex flex-col gap-3 hover:border-[#C5A059]/20 transition-colors"
            >
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#141414] border border-[#222] overflow-hidden flex items-center justify-center shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={22} className="text-[#444]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#DDD] truncate">
                    {user.firstName || ''} {user.lastName || ''}
                  </p>
                  <p className="text-xs text-[#555] truncate">{user.email}</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${ROLE_COLORS[roleName(user)] || ROLE_COLORS['USER']}`}>
                  {roleName(user)}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${STATUS_COLORS[user.status] || STATUS_COLORS['INACTIVE']}`}>
                  {user.status || 'UNKNOWN'}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 text-xs text-[#555]">
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={11} className="text-[#C5A059]" />
                  <span>{user.assignedEventIds?.length || 0} events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={11} className="text-blue-400" />
                  <span className="text-[#555]">guests assignable</span>
                </div>
              </div>

              {/* Super Admin assignments are deliberately not editable from Admin. */}
              {roleName(user) === 'SUPER_ADMIN' ? (
                <div className="pt-2 border-t border-[#1a1a1a] flex flex-col gap-2">
                  <p className="text-center text-[10px] text-[#555]">Managed by Super Admin</p>
                  <button onClick={() => { setSelectedUser(user); setModal('delete'); }} className="flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg text-xs font-medium transition-all w-full">
                    <Trash2 size={12} /> Delete Admin
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-2 border-t border-[#1a1a1a]">
                  <div className="flex gap-2">
                    <button onClick={() => openEventModal(user)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 border border-[#C5A059]/20 hover:border-[#C5A059]/40 text-[#C5A059] rounded-lg text-xs font-medium transition-all">
                      <CalendarDays size={12} /> Assign Events
                    </button>
                    {canReviewApplications(user) && (
                      <button onClick={() => openGuestModal(user)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-400/40 text-blue-400 rounded-lg text-xs font-medium transition-all">
                        <UserPlus size={12} /> Assign Guests
                      </button>
                    )}
                  </div>
                  <button onClick={() => { setSelectedUser(user); setModal('delete'); }} className="flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg text-xs font-medium transition-all w-full">
                    <Trash2 size={12} /> Delete User
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Event Assignment Modal ── */}
      <AnimatePresence>
        {modal === 'events' && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
                <div>
                  <h3 className="text-base font-semibold text-[#F5F5F5]">Assign Events</h3>
                  <p className="text-xs text-[#555] mt-0.5">
                    Assigning to <span className="text-[#C5A059]">{selectedUser.firstName || selectedUser.email}</span>
                  </p>
                </div>
                <button onClick={closeModal} className="text-[#555] hover:text-[#DDD] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Event search */}
              <div className="p-4 border-b border-[#1a1a1a]">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input
                    value={eventSearch}
                    onChange={e => setEventSearch(e.target.value)}
                    placeholder="Search events…"
                    className="w-full pl-8 pr-3 py-2 bg-[#111] border border-[#1a1a1a] rounded-lg text-xs text-[#DDD] placeholder-[#444] focus:outline-none focus:border-[#C5A059]/40"
                  />
                </div>
                <p className="text-xs text-[#555] mt-2">{selectedEventIds.length} event(s) selected</p>
              </div>

              {/* Events list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-[#444] gap-2">
                    <AlertCircle size={24} />
                    <p className="text-xs">No events found</p>
                  </div>
                ) : (
                  filteredEvents.map(ev => {
                    const checked = selectedEventIds.includes(ev.publicId);
                    return (
                      <button
                        key={ev.publicId}
                        onClick={() => toggleEvent(ev.publicId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          checked
                            ? 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#DDD]'
                            : 'bg-[#111] border-[#1a1a1a] text-[#888] hover:border-[#2a2a2a]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          checked ? 'bg-[#C5A059] border-[#C5A059]' : 'border-[#333]'
                        }`}>
                          {checked && <Check size={11} className="text-black" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{ev.title || ev.name}</p>
                          <p className="text-[10px] text-[#555] mt-0.5 truncate">{ev.status} • {ev.location || 'No location'}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-[#1a1a1a]">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2 bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] text-[#888] rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignEvents}
                  disabled={assigning}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#C5A059] hover:bg-[#D4B86A] disabled:opacity-50 text-black rounded-xl text-sm font-semibold transition-all"
                >
                  {assigning ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {assigning ? 'Assigning…' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Guest Assignment Modal ── */}
      <AnimatePresence>
        {modal === 'guests' && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
                <div>
                  <h3 className="text-base font-semibold text-[#F5F5F5]">Assign Guests</h3>
                  <p className="text-xs text-[#555] mt-0.5">
                    Assigning approved guests to <span className="text-blue-400">{selectedUser.firstName || selectedUser.email}</span>
                  </p>
                </div>
                <button onClick={closeModal} className="text-[#555] hover:text-[#DDD] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Guest search */}
              <div className="p-4 border-b border-[#1a1a1a]">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input
                    value={guestSearch}
                    onChange={e => { setGuestSearch(e.target.value); setGuestPage(0); }}
                    placeholder="Search guests by name or email…"
                    className="w-full pl-8 pr-3 py-2 bg-[#111] border border-[#1a1a1a] rounded-lg text-xs text-[#DDD] placeholder-[#444] focus:outline-none focus:border-blue-500/40"
                  />
                </div>
                <p className="text-xs text-[#555] mt-2">{guestTotal} approved guest(s) found</p>
              </div>

              {/* Guests list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingGuests ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={24} className="text-[#C5A059] animate-spin" />
                  </div>
                ) : guests.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-[#444] gap-2">
                    <AlertCircle size={24} />
                    <p className="text-xs">No approved guests found</p>
                  </div>
                ) : (
                  guests.map(guest => (
                    <div
                      key={guest.publicId}
                      className="flex items-center gap-3 p-3 bg-[#111] border border-[#1a1a1a] rounded-xl hover:border-blue-500/20 transition-all"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#141414] border border-[#222] flex items-center justify-center shrink-0">
                        <UserCircle size={18} className="text-[#444]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#DDD] truncate">
                          {guest.firstName} {guest.lastName}
                        </p>
                        <p className="text-[10px] text-[#555] truncate">{guest.email}</p>
                        {guest.assignedAdminEmail && (
                          <p className="text-[10px] text-[#C5A059]/70 truncate mt-0.5">
                            Currently: {guest.assignedAdminEmail}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAssignGuest(guest.publicId, `${guest.firstName} ${guest.lastName}`)}
                        disabled={assigning}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-400/40 text-blue-400 rounded-lg text-[10px] font-medium transition-all disabled:opacity-50 shrink-0"
                      >
                        {assigning ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                        Assign
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {guestTotal > 20 && (
                <div className="flex items-center justify-between p-4 border-t border-[#1a1a1a]">
                  <button
                    onClick={() => setGuestPage(p => Math.max(0, p - 1))}
                    disabled={guestPage === 0}
                    className="px-3 py-1.5 text-xs text-[#888] bg-[#111] border border-[#1a1a1a] rounded-lg disabled:opacity-40 hover:border-[#2a2a2a] transition-all"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[#555]">
                    Page {guestPage + 1} of {Math.ceil(guestTotal / 20)}
                  </span>
                  <button
                    onClick={() => setGuestPage(p => p + 1)}
                    disabled={(guestPage + 1) * 20 >= guestTotal}
                    className="px-3 py-1.5 text-xs text-[#888] bg-[#111] border border-[#1a1a1a] rounded-lg disabled:opacity-40 hover:border-[#2a2a2a] transition-all"
                  >
                    Next
                  </button>
                </div>
              )}

              <div className="p-4 border-t border-[#1a1a1a]">
                <button
                  onClick={closeModal}
                  className="w-full py-2 bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] text-[#888] rounded-xl text-sm transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {modal === 'delete' && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-sm flex flex-col p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#F5F5F5]">Delete User</h3>
                  <p className="text-sm text-[#888]">{selectedUser.firstName || selectedUser.email}</p>
                </div>
              </div>
              <p className="text-sm text-[#AAA] mb-6">
                Are you sure you want to delete this user? This action cannot be undone and will remove all their access and data.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={closeModal}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-[#888] hover:text-[#DDD] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

