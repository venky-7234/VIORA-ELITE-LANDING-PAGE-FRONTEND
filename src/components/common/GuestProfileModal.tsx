import React, { useState, useEffect } from 'react';
import {
  XCircle, MapPin, Building, Briefcase, Mail, Phone, ExternalLink,
  Calendar, CheckCircle, Clock, X, Activity, User, FileText, Award,
  AlertTriangle, Link, Hash, Layers
} from 'lucide-react';
import { getGuestProfile } from '../../services/api';
import { motion } from 'framer-motion';

interface GuestProfileModalProps {
  publicId: string;
  token: string;
  onClose: () => void;
}

export const GuestProfileModal: React.FC<GuestProfileModalProps> = ({ publicId, token, onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'history' | 'audit'>('overview');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getGuestProfile(publicId, token);
        if (res.data) {
          setProfile(res.data);
        } else {
          setError('Failed to load profile');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [publicId, token]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading guest profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-8 max-w-sm w-full relative text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">Failed to Load Profile</h3>
          <p className="text-sm text-[#888] mb-6">
            {error?.includes('expired') || error?.includes('Failed to fetch') 
              ? 'Your session may have expired. Please refresh the page or login again.' 
              : error || 'An unknown error occurred.'}
          </p>
          <button 
            onClick={onClose} 
            className="w-full py-2.5 bg-[#1a1a1a] hover:bg-[#222] text-[#CCC] border border-[#333] rounded-xl text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs border border-emerald-500/30 flex items-center gap-1.5 w-max font-medium"><CheckCircle className="w-3 h-3" />Approved</span>;
      case 'PENDING': return <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs border border-yellow-500/30 flex items-center gap-1.5 w-max font-medium"><Clock className="w-3 h-3" />Pending</span>;
      case 'REJECTED': return <span className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full text-xs border border-red-500/30 flex items-center gap-1.5 w-max font-medium"><X className="w-3 h-3" />Rejected</span>;
      case 'WAITLISTED': return <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs border border-purple-500/30 flex items-center gap-1.5 w-max font-medium"><Clock className="w-3 h-3" />Waitlisted</span>;
      case 'SENT': return <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs border border-blue-500/30 flex items-center gap-1.5 w-max font-medium"><Mail className="w-3 h-3" />Sent</span>;
      default: return <span className="px-2.5 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs border border-gray-500/30 w-max font-medium">{status || 'Unknown'}</span>;
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'APPLICATION_SUBMITTED': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'APPROVED': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'REJECTED': return <X className="w-4 h-4 text-red-400" />;
      case 'INVITATION_GENERATED': return <Award className="w-4 h-4 text-[#D4AF37]" />;
      case 'EMAIL_SENT': return <Mail className="w-4 h-4 text-[#D4AF37]" />;
      case 'WHATSAPP_SENT': return <Phone className="w-4 h-4 text-green-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) => (
    <div className="flex justify-between items-start border-b border-gray-800/50 pb-2.5 last:border-0 last:pb-0">
      <span className="text-gray-500 text-sm flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className="text-white text-sm font-medium text-right max-w-[55%] break-words">{value || <span className="text-gray-600 font-normal">—</span>}</span>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'history', label: 'Applications & Invitations', icon: FileText },
    { id: 'audit', label: 'Approval / Rejection', icon: Award },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0f0f0f] border border-gray-800 rounded-2xl w-full max-w-6xl flex flex-col h-full max-h-[92vh] shadow-2xl overflow-hidden"
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div className="p-6 border-b border-gray-800 bg-black/50 flex justify-between items-start shrink-0">
          <div className="flex gap-5 items-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-black border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-serif font-bold text-3xl shadow-inner">
              {((profile.full_name || profile.firstName || '') as string).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">{profile.full_name || profile.firstName || [profile.first_name, profile.last_name].filter(Boolean).join(' ')}</h2>
              <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-400">
                {(profile.profession || profile.designation) && <span className="text-[#D4AF37] text-sm font-medium">{profile.profession || profile.designation}</span>}
                {(profile.organization || profile.company) && <span className="text-gray-300">{profile.organization || profile.company}</span>}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{profile.email}</span>
                {profile.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{profile.phone}</span>}
                {profile.city && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{profile.city}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile.linkedin && (
              <a href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm border border-blue-400/30 hover:border-blue-400/60 px-3 py-1.5 rounded-lg transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />LinkedIn
              </a>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white p-2 hover:bg-gray-800 rounded-full transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ── Status Bar ─────────────────────────────────────── */}
        <div className="px-6 py-3 bg-black/30 border-b border-gray-800/50 flex flex-wrap gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Current Event</span>
            <span className="text-sm text-white font-medium">{profile.currentEventName || profile.current_event_name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Application</span>
            {renderStatusBadge(profile.currentApplicationStatus || profile.current_application_status)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Invitation</span>
            {(profile.invitationStatus || profile.invitation_status) ? renderStatusBadge(profile.invitationStatus || profile.invitation_status) : <span className="text-xs text-gray-600">Not generated</span>}
          </div>
          {(profile.invitationNumber || profile.invitation_number) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Inv. No.</span>
              <span className="text-xs font-mono text-[#D4AF37]">{profile.invitationNumber || profile.invitation_number}</span>
            </div>
          )}
        </div>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <div className="flex border-b border-gray-800 px-6 bg-black/20 overflow-x-auto shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-4 text-sm font-medium transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-t" />}
            </button>
          ))}
        </div>

        {/* ── Content ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Personal Info */}
                <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />Personal Information
                  </h3>
                  <div className="space-y-2.5">
                    <InfoRow label="Full Name" value={profile.full_name || profile.firstName || [profile.first_name, profile.last_name].filter(Boolean).join(' ')} />
                    <InfoRow label="Email" value={profile.email} icon={Mail} />
                    <InfoRow label="Phone" value={profile.phone} icon={Phone} />
                    <InfoRow label="City" value={profile.city} icon={MapPin} />
                    <InfoRow label="LinkedIn" value={profile.linkedin} icon={Link} />
                  </div>
                </div>

                {/* Professional Info */}
                <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />Professional Information
                  </h3>
                  <div className="space-y-2.5">
                    <InfoRow label="Company" value={profile.organization || profile.company} icon={Building} />
                    <InfoRow label="Designation" value={profile.profession || profile.designation} icon={Hash} />
                    <InfoRow label="Industry" value={profile.industry} icon={Layers} />
                    <InfoRow label="Annual Revenue" value={profile.annualRevenue || profile.annual_revenue} />
                    <InfoRow label="Years in Business" value={profile.yearsInBusiness || profile.years_in_business} />
                  </div>
                </div>
              </div>

              {/* Application Details */}
              <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />Application Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <InfoRow label="Referred By" value={profile.referredBy || profile.referred_by} />
                  <InfoRow label="Annual Revenue" value={profile.annualRevenue || profile.annual_revenue} />
                  <InfoRow label="Years in Business" value={profile.yearsInBusiness || profile.years_in_business} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(profile.whyAttend || profile.why_attend) && (
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Why do you want to attend?</span>
                      <p className="text-white text-sm bg-black/30 p-4 rounded-lg border border-gray-800/50 whitespace-pre-wrap leading-relaxed">{profile.whyAttend || profile.why_attend}</p>
                    </div>
                  )}
                  {(profile.whatValue || profile.what_value) && (
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wider block mb-2">What value will you bring?</span>
                      <p className="text-white text-sm bg-black/30 p-4 rounded-lg border border-gray-800/50 whitespace-pre-wrap leading-relaxed">{profile.whatValue || profile.what_value}</p>
                    </div>
                  )}
                </div>
                {profile.notes && (
                  <div className="mt-4">
                    <span className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Additional Notes</span>
                    <p className="text-white text-sm bg-black/30 p-4 rounded-lg border border-gray-800/50 whitespace-pre-wrap">{profile.notes}</p>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Applications', value: profile.applicationHistory?.length || 0, color: 'text-white' },
                  { label: 'Events Attended', value: profile.eventsAttended?.length || 0, color: 'text-[#D4AF37]' },
                  { label: 'Invitations Issued', value: profile.invitationHistory?.length || 0, color: 'text-blue-400' },
                  { label: 'Approvals', value: profile.approvalHistory?.length || 0, color: 'text-emerald-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#111] border border-gray-800 rounded-xl p-4 text-center">
                    <div className={`text-3xl font-light mb-1 ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="max-w-3xl mx-auto py-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {(!profile.timeline || profile.timeline.length === 0) ? (
                <div className="text-center text-gray-500 py-16">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No activity recorded for this guest yet.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-gray-800 ml-4 md:ml-8 space-y-6 pb-8">
                  {profile.timeline.map((item: any, i: number) => (
                    <div key={i} className="relative pl-8 md:pl-12">
                      <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-[#0f0f0f] border-2 border-gray-800 flex items-center justify-center shadow-lg">
                        {getTimelineIcon(item.type)}
                      </div>
                      <div className="bg-[#111] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-white font-medium">{item.title}</h4>
                          <span className="text-xs text-gray-500 font-mono bg-black/50 px-2 py-1 rounded whitespace-nowrap ml-4">
                            {new Date(item.timestamp).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

              {/* Application History */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />Application History
                </h3>
                <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-black/40 text-xs uppercase text-gray-500 border-b border-gray-800">
                      <tr>
                        <th className="px-5 py-3">Event</th>
                        <th className="px-5 py-3">Date Applied</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Reviewed By</th>
                        <th className="px-5 py-3">Application ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {(!profile.applicationHistory || profile.applicationHistory.length === 0) && (
                        <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-500">No applications found.</td></tr>
                      )}
                      {profile.applicationHistory?.map((app: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-800/30">
                          <td className="px-5 py-3 font-medium text-white">{app.eventName}</td>
                          <td className="px-5 py-3 text-gray-400">{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-5 py-3">{renderStatusBadge(app.status)}</td>
                          <td className="px-5 py-3 text-gray-400">{app.reviewedBy || '—'}</td>
                          <td className="px-5 py-3 text-xs font-mono text-gray-500 truncate max-w-[120px]">{app.publicId?.split('-')[0]}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invitation History */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#D4AF37]" />Invitation History
                </h3>
                <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-black/40 text-xs uppercase text-gray-500 border-b border-gray-800">
                      <tr>
                        <th className="px-5 py-3">Event</th>
                        <th className="px-5 py-3">Issued At</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Invitation Number</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {(!profile.invitationHistory || profile.invitationHistory.length === 0) && (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500">No invitations found.</td></tr>
                      )}
                      {profile.invitationHistory?.map((inv: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-800/30">
                          <td className="px-5 py-3 font-medium text-white">{inv.eventName}</td>
                          <td className="px-5 py-3 text-gray-400">{inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-5 py-3">{renderStatusBadge(inv.status)}</td>
                          <td className="px-5 py-3 font-mono text-[#D4AF37] text-xs">{inv.invitationNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* APPROVAL / REJECTION TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

              {/* Approval History */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />Approval History
                </h3>
                {(!profile.approvalHistory || profile.approvalHistory.length === 0) ? (
                  <div className="bg-[#111] border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No approvals recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.approvalHistory.map((a: any, i: number) => (
                      <div key={i} className="bg-[#111] border border-emerald-500/20 rounded-xl p-4 flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            Approved for {a.eventName}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            By {a.approvedBy || 'System'} • {a.approvedAt ? new Date(a.approvedAt).toLocaleString('en-IN') : '—'}
                          </div>
                        </div>
                        {a.invitationNumber && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Invitation</div>
                            <div className="text-xs font-mono text-[#D4AF37]">{a.invitationNumber}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rejection History */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />Rejection History
                </h3>
                {(!profile.rejectionHistory || profile.rejectionHistory.length === 0) ? (
                  <div className="bg-[#111] border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No rejections recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.rejectionHistory.map((r: any, i: number) => (
                      <div key={i} className="bg-[#111] border border-red-500/20 rounded-xl p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-white font-medium flex items-center gap-2">
                              <X className="w-4 h-4 text-red-400" />
                              Rejected for {r.eventName}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              By {r.rejectedBy || 'System'} • {r.rejectedAt ? new Date(r.rejectedAt).toLocaleString('en-IN') : '—'}
                            </div>
                          </div>
                        </div>
                        {r.reason && (
                          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                            <span className="text-xs text-red-400 uppercase tracking-wider font-semibold">Reason</span>
                            <p className="text-sm text-gray-300 mt-1">{r.reason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Logs */}
              {profile.auditHistory && profile.auditHistory.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" />Audit Logs
                  </h3>
                  <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-gray-300">
                      <thead className="bg-black/40 text-xs uppercase text-gray-500 border-b border-gray-800">
                        <tr>
                          <th className="px-5 py-3">Timestamp</th>
                          <th className="px-5 py-3">Action</th>
                          <th className="px-5 py-3">Actor</th>
                          <th className="px-5 py-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {profile.auditHistory.map((log: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-800/30">
                            <td className="px-5 py-3 whitespace-nowrap text-gray-400 text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}</td>
                            <td className="px-5 py-3 font-medium text-white text-xs">{log.action}</td>
                            <td className="px-5 py-3 text-gray-400 text-xs">{log.actor}</td>
                            <td className="px-5 py-3 text-gray-400 text-xs">{log.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
