import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Building, Phone, Shirt, Info, Star, CalendarDays, Clock, EyeOff } from 'lucide-react';
import { getEvent, getMyApplication } from '../../services/api';

interface UserEventPanelProps {
  token: string;
}

export const UserEventPanel: React.FC<UserEventPanelProps> = ({ token }) => {
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch application to get the event ID
    getMyApplication(token)
      .then(appData => {
        const eventId = appData.data?.eventId;
        if (!eventId) throw new Error('No event assigned');
        
        // 2. Fetch event details using the ID
        return getEvent(eventId, token);
      })
      .then(eventRes => {
        setEventData(eventRes.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch event details', err);
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) {
    return (
      <div className="p-8 h-full space-y-6 flex flex-col">
        <div className="h-20 w-1/3 bg-[#111] border border-[#333] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-[#111] border border-[#333] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 space-y-6">
        <div className="w-24 h-24 rounded-full bg-[#111] border border-[#333] flex items-center justify-center">
          <EyeOff className="text-[#555]" size={40} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-serif text-[#F5F5F5] tracking-wide">No Event Assigned</h2>
          <p className="text-[#888] max-w-md mx-auto">
            You do not have an active event assignment. Event details will appear here once your application is processed and approved.
          </p>
        </div>
      </div>
    );
  }

  const startDate = new Date(eventData.startDateTime);
  const timeString = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateString = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-[#111] border border-[#333] shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#C5A059]/20 to-transparent opacity-20" />
        
        {eventData.bannerUrl ? (
          <img src={eventData.bannerUrl} alt="Event Banner" className="w-full h-48 object-cover opacity-60" />
        ) : (
          <div className="w-full h-32 bg-[#0A0A0A]" />
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#111] to-transparent">
          <h1 className="text-4xl md:text-5xl font-serif text-[#F5F5F5] tracking-wide mb-2">
            {eventData.title}
          </h1>
          <p className="text-[#C5A059] font-medium tracking-widest uppercase text-sm">
            {eventData.theme || 'Exclusive Gathering'}
          </p>
        </div>
      </motion.div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#111]/30 backdrop-blur-sm border border-[#222] rounded-xl p-6 group hover:border-[#C5A059]/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
              <CalendarDays className="text-[#C5A059]" size={20} />
            </div>
            <div>
              <h4 className="text-xs text-[#888] font-semibold uppercase tracking-wider">Date</h4>
              <p className="text-[#F5F5F5] font-serif">{dateString}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#111]/30 backdrop-blur-sm border border-[#222] rounded-xl p-6 group hover:border-[#C5A059]/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
              <Clock className="text-[#C5A059]" size={20} />
            </div>
            <div>
              <h4 className="text-xs text-[#888] font-semibold uppercase tracking-wider">Time</h4>
              <p className="text-[#F5F5F5] font-serif">{timeString}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#111]/30 backdrop-blur-sm border border-[#222] rounded-xl p-6 group hover:border-[#C5A059]/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
              <MapPin className="text-[#C5A059]" size={20} />
            </div>
            <div>
              <h4 className="text-xs text-[#888] font-semibold uppercase tracking-wider">Location</h4>
              <p className="text-[#F5F5F5] font-serif">{eventData.venue}</p>
              <p className="text-[#888] text-sm mt-0.5">{eventData.venueAddress}, {eventData.city}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[#111]/30 backdrop-blur-sm border border-[#222] rounded-xl p-6 group hover:border-[#C5A059]/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
              <Building className="text-[#C5A059]" size={20} />
            </div>
            <div>
              <h4 className="text-xs text-[#888] font-semibold uppercase tracking-wider">Organizer</h4>
              <p className="text-[#F5F5F5] font-serif">{eventData.organizerName || 'Viora Events Team'}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[#111]/30 backdrop-blur-sm border border-[#222] rounded-xl p-6 group hover:border-[#C5A059]/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
              <Shirt className="text-[#C5A059]" size={20} />
            </div>
            <div>
              <h4 className="text-xs text-[#888] font-semibold uppercase tracking-wider">Dress Code</h4>
              <p className="text-[#F5F5F5] font-serif">{eventData.dressCode || 'Black Tie Required'}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-[#111]/30 backdrop-blur-sm border border-[#222] rounded-xl p-6 group hover:border-[#C5A059]/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
              <Phone className="text-[#C5A059]" size={20} />
            </div>
            <div>
              <h4 className="text-xs text-[#888] font-semibold uppercase tracking-wider">Contact</h4>
              <p className="text-[#F5F5F5] font-serif">{eventData.contactNumber || 'vip@vioraelite.com'}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Guest Instructions */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.7 }}
        className="bg-[#111]/30 border border-[#222] rounded-2xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex shrink-0 items-center justify-center">
            <Info className="text-[#C5A059]" size={24} />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-serif text-[#F5F5F5]">Guest Instructions</h3>
            <p className="text-[#AAA] leading-relaxed text-sm">
              {eventData.guestInstructions || 'Please present your digital invitation QR code upon arrival. Valet parking is available at the main entrance. For security purposes, government-issued ID matching your application must be shown.'}
            </p>
          </div>
        </div>
      </motion.div>

    </div>
  );
};
