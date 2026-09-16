import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Archive, Trash2, PowerOff, CheckCircle2,
  ChevronLeft, ChevronRight, MoreVertical, Copy, Eye, UserPlus, X
} from 'lucide-react';
import { fetchEvents, createEvent, updateEvent, changeEventStatus, deleteEvent, assignEventToAdmin, fetchAdmins, normalizeListResponse } from '../../services/api';
import toast from 'react-hot-toast';

interface EventsModuleProps {
  token: string;
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ARCHIVED: 'bg-gray-500/10   text-gray-400   border-gray-500/20',
  INACTIVE: 'bg-red-500/10    text-red-400    border-red-500/20',
  DRAFT:    'bg-yellow-500/10 text-yellow-400  border-yellow-500/20',
};

const EMPTY_FORM = {
  title: '', description: '', venue: '', venueAddress: '', city: '', country: '',
  startDateTime: '', endDateTime: '', maxGuests: 0, rsvpDeadline: '',
  eventType: 'CORPORATE', isPublic: false, theme: '', landingPageUrl: '',
  applicationFormUrl: '', registrationStart: '', registrationEnd: '',
  logoUrl: '', bannerUrl: '', invitationTemplate: '', emailTemplate: '', whatsappTemplate: ''
};

const toDateTimeLocal = (value?: string) => value ? value.slice(0, 16) : '';

const EventsModuleBase: React.FC<EventsModuleProps> = ({ token }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [sort, setSort] = useState<'startDateTime' | 'title' | 'status'>('startDateTime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Details modal
  const [viewEvent, setViewEvent] = useState<any | null>(null);

  // Assign-to-Guest modal
  const [assignEvent, setAssignEvent] = useState<any | null>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchEvents(token, page, PAGE_SIZE);
      const events = normalizeListResponse(res);
      setEvents(events);
      setTotalElements(res.data?.totalElements ?? res.totalElements ?? res.total ?? events.length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    window.addEventListener('mock-state-updated', load);
    return () => window.removeEventListener('mock-state-updated', load);
  }, [page, token]);

  const openModal = (event?: any) => {
    setOpenMenuId(null);
    setFormError('');
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title || event.event_name || '', description: event.description || '',
        venue: event.venue || '', venueAddress: event.venueAddress || '',
        city: event.city || '', country: event.country || '',
        startDateTime: event.startDateTime ? new Date(event.startDateTime).toISOString().slice(0, 16) : (event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : ''),
        endDateTime: event.endDateTime ? new Date(event.endDateTime).toISOString().slice(0, 16) : (event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : ''),
        maxGuests: event.maxGuests || event.max_guests || 0, rsvpDeadline: event.rsvpDeadline ? new Date(event.rsvpDeadline).toISOString().slice(0, 16) : '',
        eventType: event.eventType || event.event_type || 'CORPORATE', isPublic: event.isPublic || false,
        theme: event.theme || '', landingPageUrl: event.landingPageUrl || '',
        applicationFormUrl: event.applicationFormUrl || '', registrationStart: event.registrationStart ? new Date(event.registrationStart).toISOString().slice(0, 16) : '',
        registrationEnd: event.registrationEnd ? new Date(event.registrationEnd).toISOString().slice(0, 16) : '', logoUrl: event.logoUrl || '',
        bannerUrl: event.bannerUrl || '', invitationTemplate: event.invitationTemplate || '',
        emailTemplate: event.emailTemplate || '', whatsappTemplate: event.whatsappTemplate || ''
      });
    } else {
      setSelectedEvent(null);
      setFormData({ ...EMPTY_FORM });
    }
    setIsModalOpen(true);
    setFormError('');
  };

  const handleDuplicate = (event: any) => {
    setOpenMenuId(null);
    setSelectedEvent(null);
    setFormData({
      title: `${event.title || event.event_name} (Copy)`, description: event.description || '',
      venue: event.venue || '', venueAddress: event.venueAddress || '',
      city: event.city || '', country: event.country || '',
      startDateTime: '', endDateTime: '',
      maxGuests: event.maxGuests || event.max_guests || 0, rsvpDeadline: '',
      eventType: event.eventType || event.event_type || 'CORPORATE', isPublic: event.isPublic || false,
      theme: event.theme || '', landingPageUrl: event.landingPageUrl || '',
      applicationFormUrl: event.applicationFormUrl || '', registrationStart: '',
      registrationEnd: '', logoUrl: event.logoUrl || '',
      bannerUrl: event.bannerUrl || '', invitationTemplate: event.invitationTemplate || '',
      emailTemplate: event.emailTemplate || '', whatsappTemplate: event.whatsappTemplate || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = formData.startDateTime ? new Date(formData.startDateTime) : null;
    const end = formData.endDateTime ? new Date(formData.endDateTime) : null;
    const urlFields = [formData.landingPageUrl, formData.applicationFormUrl, formData.logoUrl, formData.bannerUrl].filter(Boolean);
    if (!formData.title.trim() || !start || Number.isNaN(start.getTime())) return setFormError('Title and a valid start date are required.');
    if (end && (Number.isNaN(end.getTime()) || end < start)) return setFormError('End date must be after the start date.');
    if (formData.maxGuests <= 0 || !Number.isInteger(formData.maxGuests)) return setFormError('Capacity must be a whole number greater than zero.');
    if (urlFields.some(value => !/^https?:\/\//i.test(value))) return setFormError('URL fields must begin with http:// or https://.');
    if (!selectedEvent && events.some(event => event.title.trim().toLowerCase() === formData.title.trim().toLowerCase())) return setFormError('An event with this title already exists.');
    setSubmitting(true);
    const payload = {
      ...formData,
      eventName: formData.title,
      eventDate: start ? start.toISOString() : null,
      event_name: formData.title,
      event_date: start ? start.toISOString() : null,
      end_date: end ? end.toISOString() : null,
      max_guests: formData.maxGuests,
      event_type: formData.eventType,
      startDateTime: start ? start.toISOString() : null,
      endDateTime: end ? end.toISOString() : null
    };

    try {
      if (selectedEvent) await updateEvent(selectedEvent.publicId, payload, token);
      else await createEvent(payload, token);
      setIsModalOpen(false);
      load();
    } catch (err: any) { 
      setFormError(err.message || 'Failed to save event. Please try again.'); 
    }
    finally { setSubmitting(false); }
  };

  const handleStatusChange = async (publicId: string, action: 'publish' | 'cancel' | 'archive' | 'deactivate') => {
    setOpenMenuId(null);
    const key = `${publicId}:${action}`;
    if (actionKey) return;
    setActionKey(key);
    try {
      await changeEventStatus(publicId, action, token);
      load();
    } catch { alert(`Failed to ${action} event`); }
    finally { setActionKey(null); }
  };

  const handleDelete = async (publicId: string) => {
    setOpenMenuId(null);
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    if (actionKey) return;
    setActionKey(`${publicId}:delete`);
    try {
      await deleteEvent(publicId, token);
      toast.success('Event deleted successfully.');
      load();
    } catch { toast.error('Failed to delete event.'); }
    finally { setActionKey(null); }
  };

  const openAssignModal = async (ev: any) => {
    setOpenMenuId(null);
    setAssignEvent(ev);
    setAssignSearch('');
    try {
      const res = await fetchAdmins(token);
      let adminList = res.data?.content || res.data?.users || res.users || res.data || [];
      if (Array.isArray(adminList)) {
        adminList = adminList.filter((a: any) => ['ADMIN', 'MANAGER', 'ROLE_ADMIN', 'ROLE_MANAGER'].includes(a.role));
      } else {
        adminList = [];
      }
      setAdmins(adminList);
    } catch { setAdmins([]); }
  };

  const handleAssignAdmin = async (adminId: string) => {
    if (!assignEvent) return;
    setAssigning(true);
    try {
      await assignEventToAdmin(assignEvent.publicId || assignEvent.id, adminId, token);
      toast.success('Admin assigned to event successfully!');
      setAssignEvent(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign admin.');
    } finally { setAssigning(false); }
  };

  const f = (key: keyof typeof formData, val: any) => setFormData(prev => ({ ...prev, [key]: val }));
  const displayEvents = [...events].sort((a, b) => {
    const left = String(a[sort] || '').toLowerCase();
    const right = String(b[sort] || '').toLowerCase();
    return (left < right ? -1 : left > right ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
  });

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">Events</h2>
          <p className="text-xs text-[#555] mt-0.5">Create and manage platform events.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[#C5A059] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#D4B86A] transition-colors"
        >
          <Plus size={15} /> Create Event
        </button>
        <select value={`${sort}:${sortDir}`} onChange={e => { const [field, direction] = e.target.value.split(':') as ['startDateTime' | 'title' | 'status', 'asc' | 'desc']; setSort(field); setSortDir(direction); }} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#888]">
          <option value="startDateTime:asc">Date earliest</option><option value="startDateTime:desc">Date latest</option><option value="title:asc">Title A-Z</option><option value="title:desc">Title Z-A</option><option value="status:asc">Status A-Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-visible">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Event</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Date</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Venue</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Capacity</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Status</th>
              <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111]">
            {loading ? (
              <tr><td colSpan={6} className="py-16 text-center text-[#555] text-sm">Loading…</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-[#555] text-sm">No events found.</td></tr>
            ) : displayEvents.map((ev, idx) => {
              const menuId = `${(ev.publicId || ev.id)}-${idx}`;
              return (
              <tr key={menuId} className="hover:bg-[#111]/50 transition-colors group">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-semibold text-[#DDD]">{ev.title || ev.event_name}</p>
                  <p className="text-[11px] text-[#555]">{ev.eventType || ev.event_type}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-[#888]">
                  {(ev.startDateTime || ev.event_date) ? new Date(ev.startDateTime || ev.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-xs text-[#888]">{ev.venue || '—'}</p>
                  <p className="text-[11px] text-[#555]">{ev.city}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-[#888]">
                  {(ev.maxGuests || ev.max_guests) ? (ev.maxGuests || ev.max_guests).toLocaleString() : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_STYLE[ev.status] || STATUS_STYLE.DRAFT}`}>
                    {ev.status || 'DRAFT'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right relative" ref={openMenuId === menuId ? (menuRef as any) : undefined}>
                  <button
                    onClick={() => { setViewEvent(ev); setOpenMenuId(null); }}
                    aria-label={`View details for ${ev.title || ev.event_name}`}
                    className="p-1.5 rounded-lg text-[#888] hover:text-[#CCC] hover:bg-[#1a1a1a] transition-colors mr-1"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === menuId ? null : menuId)}
                    aria-label={`Actions for ${ev.title}`}
                    className="p-1.5 rounded-lg text-[#888] hover:text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                  >
                    <MoreVertical size={15} />
                  </button>
                  <AnimatePresence>
                    {openMenuId === menuId && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-4 top-full mt-1 w-48 bg-[#111] border border-[#222] rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        <button
                          onClick={() => openModal(ev)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <Edit2 size={13} className="text-[#C5A059]" /> Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(ev)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <Copy size={13} className="text-blue-400" /> Duplicate
                        </button>
                        <div className="border-t border-[#1a1a1a] mx-3 my-1" />
                        {!['ACTIVE', 'PUBLISHED'].includes(ev.status) && (
                          <button
                            onClick={() => handleStatusChange((ev.publicId || ev.id), 'publish')}
                            disabled={actionKey === `${(ev.publicId || ev.id)}:publish`}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                          >
                            <CheckCircle2 size={13} className="text-emerald-400" /> Publish
                          </button>
                        )}
                        {['ACTIVE', 'PUBLISHED'].includes(ev.status) && (
                          <button
                            onClick={() => handleStatusChange((ev.publicId || ev.id), 'deactivate')}
                            disabled={actionKey === `${(ev.publicId || ev.id)}:deactivate`}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                          >
                            <PowerOff size={13} className="text-yellow-400" /> Deactivate
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange((ev.publicId || ev.id), 'archive')}
                          disabled={actionKey === `${(ev.publicId || ev.id)}:archive`}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <Archive size={13} className="text-purple-400" /> Archive
                        </button>
                        <div className="border-t border-[#1a1a1a] mx-3 my-1" />
                        <button
                          onClick={() => openAssignModal(ev)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <UserPlus size={13} className="text-blue-400" /> Assign to Admin
                        </button>
                        <div className="border-t border-[#1a1a1a] mx-3 my-1" />
                        <button
                          onClick={() => handleDelete((ev.publicId || ev.id))}
                          disabled={actionKey === `${(ev.publicId || ev.id)}:delete`}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} /> {actionKey === `${(ev.publicId || ev.id)}:delete` ? 'Deleting…' : 'Delete'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          <span className="text-xs text-[#555]">
            {events.length > 0 ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalElements)} of ${totalElements}` : '0 events'}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors">
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalElements}
              className="p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-[#1a1a1a] flex justify-between items-center">
                <h3 className="text-base font-semibold text-[#DDD]">{selectedEvent ? 'Edit Event' : 'Create Event'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[#555] hover:text-[#CCC] transition-colors">
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {formError && <p className="mb-4 text-xs text-red-400" role="alert">{formError}</p>}
                <form id="eventForm" onSubmit={handleSubmit} className="grid grid-cols-2 gap-5 text-sm">
                  {/* Basic */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-[#555] uppercase tracking-widest border-b border-[#1a1a1a] pb-2">Basic Info</h4>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Title *</label>
                      <input required type="text" value={formData.title} onChange={e => f('title', e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Theme</label>
                      <input type="text" value={formData.theme} onChange={e => f('theme', e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Type</label>
                      <select value={formData.eventType} onChange={e => f('eventType', e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors">
                        <option value="CORPORATE">Corporate</option>
                        <option value="WEDDING">Wedding</option>
                        <option value="CONFERENCE">Conference</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Max Guests</label>
                      <input type="number" value={formData.maxGuests} onChange={e => f('maxGuests', Number(e.target.value))}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors" />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-[#555] uppercase tracking-widest border-b border-[#1a1a1a] pb-2">Dates & Venue</h4>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Start *</label>
                      <input required type="datetime-local" value={formData.startDateTime} onChange={e => f('startDateTime', e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">End</label>
                      <input type="datetime-local" value={formData.endDateTime} onChange={e => f('endDateTime', e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Venue</label>
                      <input type="text" value={formData.venue} onChange={e => f('venue', e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">City</label>
                      <input type="text" value={formData.city} onChange={e => f('city', e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors" />
                    </div>
                  </div>

                  {/* Templates — full width */}
                  <div className="col-span-2 space-y-4">
                    <h4 className="text-[10px] font-bold text-[#555] uppercase tracking-widest border-b border-[#1a1a1a] pb-2">Communication Templates</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Email Template</label>
                        <textarea rows={3} value={formData.emailTemplate} onChange={e => f('emailTemplate', e.target.value)}
                          className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors resize-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">WhatsApp Template</label>
                        <textarea rows={3} value={formData.whatsappTemplate} onChange={e => f('whatsappTemplate', e.target.value)}
                          className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors resize-none" />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-[#1a1a1a] flex justify-end gap-3 bg-[#0a0a0a]">
                <button onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm text-[#888] hover:text-[#CCC] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors">
                  Cancel
                </button>
                <button type="submit" form="eventForm"
                  className="px-6 py-2.5 bg-[#C5A059] text-black font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors text-sm">
                  {submitting ? 'Saving…' : selectedEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {viewEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-[#1a1a1a] flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold text-[#DDD]">{viewEvent.title || viewEvent.eventName || viewEvent.event_name}</h3>
                  <p className="text-[10px] text-[#555] mt-0.5 uppercase tracking-widest">{viewEvent.eventType || viewEvent.event_type}</p>
                </div>
                <button onClick={() => setViewEvent(null)} className="text-[#555] hover:text-[#CCC] transition-colors p-1">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {[
                  { label: 'Status',      value: viewEvent.status || 'DRAFT' },
                  { label: 'Start Date',  value: (viewEvent.startDateTime || viewEvent.eventDate || viewEvent.event_date) ? new Date(viewEvent.startDateTime || viewEvent.eventDate || viewEvent.event_date).toLocaleString() : '—' },
                  { label: 'End Date',    value: (viewEvent.endDateTime || viewEvent.endDate || viewEvent.end_date) ? new Date(viewEvent.endDateTime || viewEvent.endDate || viewEvent.end_date).toLocaleString() : '—' },
                  { label: 'Venue',       value: viewEvent.venue || viewEvent.venue_name || '—' },
                  { label: 'City',        value: viewEvent.city  || '—' },
                  { label: 'Country',     value: viewEvent.country || '—' },
                  { label: 'Capacity',    value: (viewEvent.maxGuests || viewEvent.max_guests || 0).toLocaleString() },
                  { label: 'Description', value: viewEvent.description || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-4">
                    <span className="text-[10px] font-bold text-[#555] uppercase tracking-widest w-24 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-[#CCC]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-[#1a1a1a] flex justify-end gap-3 bg-[#0a0a0a]">
                <button
                  onClick={() => { setViewEvent(null); openModal(viewEvent); }}
                  className="px-5 py-2 text-sm text-[#C5A059] border border-[#C5A059]/30 rounded-lg hover:bg-[#C5A059]/10 transition-colors"
                >Edit Event</button>
                <button onClick={() => setViewEvent(null)} className="px-5 py-2 text-sm text-[#888] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign to Admin Modal */}
      <AnimatePresence>
        {assignEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-[#1a1a1a] flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold text-[#DDD]">Assign Admin to Event</h3>
                  <p className="text-xs text-[#555] mt-0.5 truncate">{assignEvent.title || assignEvent.event_name}</p>
                </div>
                <button onClick={() => setAssignEvent(null)} className="text-[#555] hover:text-[#CCC] transition-colors p-1"><X size={18} /></button>
              </div>
              <div className="px-4 py-3 border-b border-[#1a1a1a]">
                <input
                  type="text"
                  placeholder="Search admins…"
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#DDD] outline-none focus:border-[#C5A059]/50"
                />
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-[#111]">
                {admins.filter(a => {
                  const name = (a.full_name || `${a.firstName || ''} ${a.lastName || ''}`).trim().toLowerCase();
                  return !assignSearch || name.includes(assignSearch.toLowerCase()) || (a.email || '').toLowerCase().includes(assignSearch.toLowerCase());
                }).map(a => {
                  const dispName = (a.full_name || `${a.firstName || ''} ${a.lastName || ''}`).trim() || 'Admin';
                  return (
                  <button
                    key={a.id}
                    disabled={assigning}
                    onClick={() => handleAssignAdmin(a.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#111] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-[#C5A059]">{(dispName[0] || a.email?.[0] || '?').toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#DDD] truncate">{dispName}</p>
                      <p className="text-[11px] text-[#555] truncate">{a.email}</p>
                    </div>
                    <UserPlus size={14} className="text-[#555] shrink-0" />
                  </button>
                  );
                })}
                {admins.length === 0 && <p className="text-center text-[#555] py-8 text-sm">No admins found.</p>}
              </div>
              <div className="px-6 py-4 border-t border-[#1a1a1a] bg-[#0a0a0a] flex justify-end">
                <button onClick={() => setAssignEvent(null)} className="px-5 py-2 text-sm text-[#888] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const EventsModule = React.memo(EventsModuleBase);
