import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { fetchEvents, getUserProfile, normalizeListResponse } from '../../services/api';
import { AnalyticsModule } from '../modules/AnalyticsModule';

interface MemberAnalyticsPanelProps {
  token: string;
}

export const MemberAnalyticsPanel: React.FC<MemberAnalyticsPanelProps> = ({ token }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getUserProfile(token), fetchEvents(token, 0, 200)])
      .then(([profile, eventResponse]) => {
        const assignedIds = new Set(
          (profile.data?.assignedEventIds || []).map((id: string | number) => String(id))
        );
        const assignedEvents = normalizeListResponse(eventResponse).filter(
          (event: any) => assignedIds.has(String(event.publicId || event.id))
        );
        setEvents(assignedEvents);
        setEventId(assignedEvents[0] ? String(assignedEvents[0].publicId || assignedEvents[0].id) : '');
      })
      .catch(() => setError('Unable to load assigned event analytics.'))
      .finally(() => setLoading(false));
  }, [token]);

  const selectedEvent = useMemo(
    () => events.find(event => String(event.publicId || event.id) === eventId),
    [events, eventId]
  );

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (error || events.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-14 text-center">
          <BarChart3 className="mx-auto mb-3 text-[#333]" size={38} />
          <p className="text-sm text-[#777]">{error || 'No events are assigned to you yet.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">Event Analytics</h2>
          <p className="text-xs text-[#555] mt-1">Analytics are limited to events assigned to you.</p>
        </div>
        <label className="text-[10px] text-[#666] uppercase tracking-widest font-semibold">
          Event
          <select value={eventId} onChange={event => setEventId(event.target.value)} className="block mt-1 min-w-64 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#DDD] outline-none focus:border-[#C5A059]/50">
            {events.map(event => (
              <option key={event.publicId || event.id} value={event.publicId || event.id}>
                {event.title || event.event_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selectedEvent && <AnalyticsModule key={eventId} token={token} eventId={eventId} />}
    </div>
  );
};
