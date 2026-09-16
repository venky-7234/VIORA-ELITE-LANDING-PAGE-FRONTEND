import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronLeft, ChevronRight,
  MoreVertical, CheckCircle, XCircle, Clock, Mail,
  Phone, MapPin, Building, Briefcase, Calendar, Info
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { searchApplications, fetchEvents } from '../../services/api';
import { GuestProfileModal } from '../common/GuestProfileModal';

interface GuestsModuleProps {
  token: string;
  onOpenProfile: (guest: any) => void;
  eventId?: string | null;
  assignedOnly?: boolean;
}

export const GuestsModule: React.FC<GuestsModuleProps> = ({ token, onOpenProfile, eventId, assignedOnly = false }) => {
  const TABS = [
    { id: 'ALL', label: assignedOnly ? 'All Assigned Guests' : 'All Guests' },
    { id: 'PENDING', label: 'Pending Guests' },
    { id: 'APPROVED', label: 'Approved Guests' },
    { id: 'REJECTED', label: 'Rejected Guests' },
    { id: 'WAITLISTED', label: 'Waitlisted Guests' }
  ];
  const [activeTab, setActiveTab] = useState('ALL');
  
  // Data State
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    city: '',
    industry: '',
    company: '',
    dateFrom: '',
    dateTo: '',
    filterEventId: ''
  });

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const request: any = {
        query: searchQuery,
        ...filters,
        eventId: eventId || filters.filterEventId || null
      };
      
      if (assignedOnly) {
        request.assignedToMe = true;
      }
      
      if (activeTab !== 'ALL') {
        request.status = activeTab;
      }
      
      const res = await searchApplications(request, page, size, 'createdAt', 'DESC', token);
      if (res && res.data) {
        setGuests(res.data.content || []);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 0);
      } else {
        setGuests([]);
        setTotalElements(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error('Error fetching guests:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!eventId) {
      try {
        const res = await fetchEvents(token, 0, 100);
        if (res.data) {
          setEvents(Array.isArray(res.data) ? res.data : (res.data.content || []));
        }
      } catch (err) {
        console.error('Failed to load events for filter', err);
      }
    }
  };

  useEffect(() => {
    fetchGuests();
    loadEvents();
  }, [activeTab, page, size, searchQuery, filters, eventId]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(0);
  };
  
  const clearFilters = () => {
    setFilters({ city: '', industry: '', company: '', dateFrom: '', dateTo: '', filterEventId: '' });
    setPage(0);
  };

  const renderStatusBadge = (status: string) => {
    switch(status) {
      case 'APPROVED': return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs border border-emerald-500/30 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Approved</span>;
      case 'PENDING': return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs border border-yellow-500/30 flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>;
      case 'REJECTED': return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30 flex items-center gap-1"><XCircle className="w-3 h-3"/> Rejected</span>;
      default: return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs border border-gray-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Guest Directory</h1>
          <p className="text-sm text-gray-400 mt-1">Manage and search all incoming applications and guests.</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors" />
            <input 
              type="text" 
              placeholder="Search Name, Email, Phone, Company, ID..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full bg-[#111] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded-lg transition-colors ${showFilters ? 'bg-brand-gold/10 border-brand-gold text-brand-gold' : 'border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 bg-[#111]'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 flex overflow-x-auto hide-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(0); }}
            className={`whitespace-nowrap px-6 py-3 text-sm font-medium transition-all relative ${
              activeTab === tab.id ? 'text-brand-gold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="bg-[#111] border border-gray-800 rounded-xl p-5 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {!eventId && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">Event</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select 
                    name="filterEventId" 
                    value={filters.filterEventId} 
                    onChange={(e: any) => handleFilterChange(e)} 
                    className="w-full bg-black/50 border border-gray-800 rounded pl-9 pr-3 py-1.5 text-sm text-white focus:border-brand-gold focus:outline-none appearance-none"
                  >
                    <option value="">All Events</option>
                    {events.map(ev => (
                      <option key={ev.publicId} value={ev.publicId}>{ev.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" name="city" value={filters.city} onChange={handleFilterChange} placeholder="e.g. London" className="w-full bg-black/50 border border-gray-800 rounded pl-9 pr-3 py-1.5 text-sm text-white focus:border-brand-gold focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">Profession</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" name="industry" value={filters.industry} onChange={handleFilterChange} placeholder="e.g. Finance" className="w-full bg-black/50 border border-gray-800 rounded pl-9 pr-3 py-1.5 text-sm text-white focus:border-brand-gold focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">Company</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" name="company" value={filters.company} onChange={handleFilterChange} placeholder="e.g. Viora" className="w-full bg-black/50 border border-gray-800 rounded pl-9 pr-3 py-1.5 text-sm text-white focus:border-brand-gold focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">Date From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="w-full bg-black/50 border border-gray-800 rounded pl-9 pr-3 py-1.5 text-sm text-white focus:border-brand-gold focus:outline-none [color-scheme:dark]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">Date To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className="w-full bg-black/50 border border-gray-800 rounded pl-9 pr-3 py-1.5 text-sm text-white focus:border-brand-gold focus:outline-none [color-scheme:dark]" />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-white transition-colors">
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Datatable */}
      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/40 text-xs uppercase text-gray-500 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Profession</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Application Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading guests...
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="bg-gray-800/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="w-6 h-6 text-gray-600" />
                    </div>
                    <p>No guests found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                guests.map(guest => (
                  <tr 
                    key={guest.publicId} 
                    onClick={() => onOpenProfile(guest.publicId)}
                    className="hover:bg-gray-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-brand-gold font-serif font-bold text-lg mr-3 shadow-inner shadow-brand-gold/20">
                          {((guest.full_name || guest.firstName || '') as string).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-brand-gold transition-colors">
                            {guest.full_name || guest.firstName || [guest.first_name, guest.last_name].filter(Boolean).join(' ')}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {guest.invitationNumber || (guest.publicId || guest.id || '').toString().substring(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center text-gray-300"><Mail className="w-3 h-3 mr-1.5 text-gray-500"/> {guest.email}</span>
                        {guest.phone && <span className="flex items-center text-gray-400"><Phone className="w-3 h-3 mr-1.5 text-gray-500"/> {guest.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-300">{guest.profession || guest.industry || '-'}</div>
                      <div className="text-xs text-gray-500 flex items-center mt-0.5">
                        <Building className="w-3 h-3 mr-1 inline" /> {guest.organization || guest.company || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(guest.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {new Date(guest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 bg-black/40 border-t border-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing <span className="text-white font-medium">{guests.length > 0 ? page * size + 1 : 0}</span> to <span className="text-white font-medium">{Math.min((page + 1) * size, totalElements)}</span> of <span className="text-white font-medium">{totalElements}</span> results
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded bg-[#222] text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded bg-[#222] text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      </div>
    );
};
