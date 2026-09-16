import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, MapPin, Users, Clock, Eye, X,
  ChevronLeft, ChevronRight, Info
} from "lucide-react";
import { fetchEvents, getUserProfile, updateEvent, searchApplications, fetchAdmins, assignEventToAdmin } from '../../services/api';
import toast from 'react-hot-toast';

interface AdminAssignedEventsModuleProps {
  token: string;
  canAssignMembers?: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ARCHIVED: "bg-gray-500/10   text-gray-400   border-gray-500/20",
  INACTIVE: "bg-red-500/10    text-red-400    border-red-500/20",
  DRAFT:    "bg-yellow-500/10 text-yellow-400  border-yellow-500/20",
};

export const AdminAssignedEventsModule: React.FC<AdminAssignedEventsModuleProps> = ({ token, canAssignMembers = false }) => {
  const [allEvents, setAllEvents]   = useState<any[]>([]);
  const [assignedIds, setAssigned]  = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedEvent, setSelected]= useState<any | null>(null);
  const [editMode, setEditMode]     = useState(false);
  const [editForm, setEditForm]     = useState<any>({});
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(0);
  const PAGE_SIZE = 12;

  const [eventGuests, setEventGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [assigningMember, setAssigningMember] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, eventsRes] = await Promise.all([
        getUserProfile(token),
        fetchEvents(token, 0, 200),
      ]);
      const ids: string[] = profileRes.data?.assignedEventIds?.map(String) || [];
      setAssigned(ids);
      const all: any[] = eventsRes.data?.content || eventsRes.data || eventsRes || [];
      setAllEvents(all.filter(ev => ids.includes(ev.id?.toString() || ev.publicId)));
    } catch { setError('Unable to load assigned events. Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  useEffect(() => {
    if (!canAssignMembers) return;
    fetchAdmins(token)
      .then(res => {
        const users = res.data?.content || res.data?.users || res.data || [];
        setMembers(Array.isArray(users)
          ? users.filter((user: any) => ['MEMBER', 'ROLE_USER'].includes(String(user.role || '').toUpperCase()))
          : []);
      })
      .catch(() => setMembers([]));
  }, [token, canAssignMembers]);

  const handleAssignMember = async (memberId: string) => {
    if (!selectedEvent || !memberId) return;
    setAssigningMember(true);
    try {
      await assignEventToAdmin(selectedEvent.publicId || selectedEvent.id, memberId, token);
      toast.success('Event assigned to member successfully.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to assign event to member.');
    } finally {
      setAssigningMember(false);
    }
  };

  const assignedEvents = allEvents;
  const paged = assignedEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(assignedEvents.length / PAGE_SIZE);

  const openDetail = async (ev: any) => {
    setSelected(ev);
    setEditMode(false);
    setEventGuests([]);
    setEditForm({
      venue:        ev.venue        || "",
      venueAddress: ev.venueAddress || ev.venue_address || "",
      city:         ev.city         || "",
      maxGuests:    ev.maxGuests    || ev.max_guests    || 0,
    });

    setLoadingGuests(true);
    try {
      const res = await searchApplications({ eventId: ev.publicId || ev.id, assignedToMe: true }, 0, 100, 'createdAt', 'DESC', token);
      if (res.success) {
        setEventGuests(res.data.content);
      }
    } catch (e) {
      console.error("Failed to load guests", e);
    } finally {
      setLoadingGuests(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEvent) return;
    if (!Number.isInteger(editForm.maxGuests) || editForm.maxGuests < 0) {
      alert("Capacity must be a whole number of zero or more.");
      return;
    }
    setSaving(true);
    try {
      await updateEvent(selectedEvent.publicId || selectedEvent.id, editForm, token);
      setEditMode(false);
      await load();
      // Refresh selected
      setSelected((prev: any) => prev ? { ...prev, ...editForm } : null);
    } catch { alert("Failed to save changes."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-7xl p-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[#F5F5F5]">Assigned Events</h2>
        <p className="text-xs text-[#555] mt-0.5">
          Events you are responsible for managing.
          {!loading && ` ${assignedEvents.length} event${assignedEvents.length !== 1 ? "s" : ""} assigned.`}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-10 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={load} className="mt-3 text-xs text-[#C5A059] hover:text-[#D4B86A]">Retry</button>
        </div>
      ) : assignedEvents.length === 0 ? (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-16 text-center">
          <CalendarDays size={40} className="text-[#333] mx-auto mb-4" />
          <p className="text-[#555] text-sm">No events assigned to you yet.</p>
          <p className="text-[#444] text-xs mt-1">Contact your Super Admin to get assigned to events.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((ev, i) => (
              <motion.div
                key={ev.publicId || ev.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 hover:border-[#2a2a2a] hover:bg-[#111] transition-all group"
              >
                {/* Status + Date */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_STYLE[ev.status || ev.event_status] || STATUS_STYLE.DRAFT}`}>
                    {ev.status || ev.event_status}
                  </span>
                  <span className="text-[11px] text-[#555]">
                    {ev.startDateTime || ev.event_date
                      ? new Date(ev.startDateTime || ev.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "TBD"}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-[#DDD] mb-1 group-hover:text-[#C5A059] transition-colors leading-snug">
                  {ev.title || ev.event_name}
                </h3>
                <p className="text-xs text-[#555] mb-4">{ev.eventType || ev.event_type || 'Event'}</p>

                {/* Venue + Capacity */}
                <div className="space-y-1.5 mb-5">
                  {ev.venue && (
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <MapPin size={12} className="text-[#444] shrink-0" />
                      <span className="truncate">{ev.venue}{ev.city ? `, ${ev.city}` : ""}</span>
                    </div>
                  )}
                  {(ev.maxGuests || ev.max_guests) > 0 && (
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <Users size={12} className="text-[#444] shrink-0" />
                      <span>{(ev.maxGuests || ev.max_guests).toLocaleString()} capacity</span>
                    </div>
                  )}
                  {(ev.startDateTime || ev.event_date) && (
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <Clock size={12} className="text-[#444] shrink-0" />
                      <span>{new Date(ev.startDateTime || ev.event_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                </div>

                {/* View button */}
                <button
                  onClick={() => openDetail(ev)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#1a1a1a] text-xs text-[#888] hover:text-[#C5A059] hover:border-[#C5A059]/30 hover:bg-[#C5A059]/5 transition-all"
                >
                  <Eye size={13} /> View Details
                </button>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#555]">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail / Edit Drawer */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="w-full max-w-md h-full bg-[#0d0d0d] border-l border-[#222] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-[#1a1a1a] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-[#DDD]">{selectedEvent.title || selectedEvent.event_name}</h3>
                  <p className="text-[11px] text-[#555]">{selectedEvent.eventType || selectedEvent.event_type || 'Event'}</p>
                </div>
                <button
                  onClick={() => { setSelected(null); setEditMode(false); }}
                  className="text-[#555] hover:text-[#CCC] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!editMode ? (
                  /* View mode */
                  <>
                    <Section title="Event Info">
                      <InfoRow label="Status">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_STYLE[selectedEvent.status || selectedEvent.event_status] || STATUS_STYLE.DRAFT}`}>
                          {selectedEvent.status || selectedEvent.event_status}
                        </span>
                      </InfoRow>
                      <InfoRow label="Type">{selectedEvent.eventType || selectedEvent.event_type || 'Event'}</InfoRow>
                      <InfoRow label="Theme">{selectedEvent.theme || "—"}</InfoRow>
                    </Section>

                    <Section title="Schedule">
                      <InfoRow label="Start">
                        {selectedEvent.startDateTime || selectedEvent.event_date
                          ? new Date(selectedEvent.startDateTime || selectedEvent.event_date).toLocaleString()
                          : "—"}
                      </InfoRow>
                      <InfoRow label="End">
                        {selectedEvent.endDateTime || selectedEvent.end_time
                          ? new Date(selectedEvent.endDateTime || selectedEvent.end_time).toLocaleString()
                          : "—"}
                      </InfoRow>
                      <InfoRow label="RSVP Deadline">
                        {selectedEvent.rsvpDeadline
                          ? new Date(selectedEvent.rsvpDeadline).toLocaleDateString()
                          : "—"}
                      </InfoRow>
                    </Section>

                    <Section title="Venue">
                      <InfoRow label="Venue">{selectedEvent.venue || "—"}</InfoRow>
                      <InfoRow label="Address">{selectedEvent.venueAddress || selectedEvent.venue_address || "—"}</InfoRow>
                      <InfoRow label="City">{selectedEvent.city || "—"}</InfoRow>
                      <InfoRow label="Country">{selectedEvent.country || "—"}</InfoRow>
                    </Section>

                    <Section title="Capacity">
                      <InfoRow label="Max Guests">
                        {selectedEvent.maxGuests || selectedEvent.max_guests
                          ? (selectedEvent.maxGuests || selectedEvent.max_guests).toLocaleString()
                          : "—"}
                      </InfoRow>
                    </Section>

                    <Section title="Assigned Guests">
                      {loadingGuests ? (
                        <div className="text-xs text-[#555] py-2">Loading guests...</div>
                      ) : eventGuests.length === 0 ? (
                        <div className="text-xs text-[#555] py-2">No guests assigned to you for this event.</div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {eventGuests.map((guest: any) => (
                            <div key={guest.application_id || guest.publicId} className="bg-[#111] border border-[#222] rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm text-[#DDD] font-medium">{guest.full_name || guest.firstName || [guest.first_name, guest.last_name].filter(Boolean).join(' ')}</p>
                                <p className="text-[10px] text-[#888] mt-0.5">{guest.organization || guest.company || guest.email}</p>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${STATUS_STYLE[guest.status] || STATUS_STYLE.DRAFT}`}>
                                {guest.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>

                    {canAssignMembers && (
                      <Section title="Assign Event to Member">
                        <select
                          defaultValue=""
                          disabled={assigningMember}
                          onChange={event => {
                            const memberId = event.target.value;
                            event.target.value = '';
                            void handleAssignMember(memberId);
                          }}
                          className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-[#DDD] outline-none focus:border-[#C5A059]/50 disabled:opacity-50"
                        >
                          <option value="">{assigningMember ? 'Assigning...' : 'Select a member'}</option>
                          {members.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.full_name || member.fullName || member.email}
                            </option>
                          ))}
                        </select>
                        {members.length === 0 && (
                          <p className="text-[11px] text-[#555] mt-2">No active members are available.</p>
                        )}
                      </Section>
                    )}

                    <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5">
                      <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-400/80">
                        You can update venue details and capacity. Contact your Super Admin for schedule or status changes.
                      </p>
                    </div>
                  </>
                ) : (
                  /* Edit mode */
                  <div className="space-y-4">
                    <p className="text-xs text-[#555]">You may update venue information and capacity.</p>

                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Venue Name</label>
                      <input
                        value={editForm.venue}
                        onChange={e => setEditForm({ ...editForm, venue: e.target.value })}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Venue Address</label>
                      <input
                        value={editForm.venueAddress}
                        onChange={e => setEditForm({ ...editForm, venueAddress: e.target.value })}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">City</label>
                      <input
                        value={editForm.city}
                        onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Max Guests (Capacity)</label>
                      <input
                        type="number"
                        value={editForm.maxGuests}
                        onChange={e => setEditForm({ ...editForm, maxGuests: Number(e.target.value) })}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-4 border-t border-[#1a1a1a] flex justify-between items-center bg-[#0a0a0a] shrink-0">
                {!editMode ? (
                  <>
                    <button
                      onClick={() => { setSelected(null); setEditMode(false); }}
                      className="text-sm text-[#666] hover:text-[#CCC] transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-5 py-2 bg-[#C5A059] text-black text-sm font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors"
                    >
                      Edit Venue / Capacity
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="text-sm text-[#666] hover:text-[#CCC] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-5 py-2 bg-[#C5A059] text-black text-sm font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving && <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />}
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Local sub-components ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-[#555] shrink-0">{label}</span>
      <span className="text-xs text-[#CCC] text-right">{children || "—"}</span>
    </div>
  );
}
