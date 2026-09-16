import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Building, MapPin, Briefcase, FileText, CheckCircle2, XCircle, Clock, Send, Mail, AlertCircle, Fingerprint } from 'lucide-react';
import { getMyApplication } from '../../services/api';

interface UserApplicationPanelProps {
  token: string;
}

const LIFECYCLE_STAGES = [
  { id: 'NOT_SUBMITTED', label: 'Not Submitted', icon: FileText },
  { id: 'PENDING', label: 'Submitted', icon: Send },
  { id: 'UNDER_REVIEW', label: 'Under Review', icon: Clock },
  { id: 'SHORTLISTED', label: 'Shortlisted', icon: CheckCircle2 },
  { id: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { id: 'INVITATION_GENERATED', label: 'Invitation Generated', icon: Mail }
];

export const UserApplicationPanel: React.FC<UserApplicationPanelProps> = ({ token }) => {
  const [application, setApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMyApplication(token)
      .then(data => {
        setApplication(data.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch user application', err);
        setError(true);
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) {
    return (
      <div className="p-8 h-full space-y-6">
        <div className="h-10 w-48 bg-[#222] rounded-md animate-pulse" />
        <div className="h-64 bg-[#111] border border-[#333] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[#111] border border-[#333] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 space-y-6">
        <div className="w-24 h-24 rounded-full bg-[#111] border border-[#333] flex items-center justify-center">
          <FileText className="text-[#555]" size={40} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-serif text-[#F5F5F5] tracking-wide">No Application Found</h2>
          <p className="text-[#888] max-w-md mx-auto">
            You have not submitted an application yet. Head over to the events page to apply for upcoming exclusive events.
          </p>
        </div>
        <button className="px-8 py-3 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-semibold rounded-full shadow-[0_0_20px_rgba(197,160,89,0.3)] hover:shadow-[0_0_30px_rgba(197,160,89,0.5)] transition-all duration-300">
          Apply Now
        </button>
      </div>
    );
  }

  const currentStageIndex = LIFECYCLE_STAGES.findIndex(s => s.id === application.status) > -1 
    ? LIFECYCLE_STAGES.findIndex(s => s.id === application.status) 
    : 1; // Default to pending if unknown

  const isRejected = application.status === 'REJECTED';

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#F5F5F5] tracking-wide">My Application</h1>
          <p className="text-[#888] text-sm mt-1">
            Application ID: <span className="font-mono text-[#AAA]">{application.publicId}</span>
          </p>
        </div>
        <div className="px-5 py-2 rounded-full border border-[#333] bg-[#111] text-sm text-[#AAA]">
          Last updated: {new Date(application.updatedAt || application.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Lifecycle Timeline */}
      <div className="bg-[#111]/50 backdrop-blur-md border border-[#333] rounded-2xl p-8 shadow-xl">
        <h3 className="text-[#C5A059] font-serif text-lg tracking-widest uppercase mb-8">Application Lifecycle</h3>
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#333] -translate-y-1/2 rounded-full z-0 hidden md:block" />
          <div 
            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] -translate-y-1/2 rounded-full z-0 hidden md:block transition-all duration-1000"
            style={{ width: `${isRejected ? 0 : (currentStageIndex / (LIFECYCLE_STAGES.length - 1)) * 100}%` }}
          />

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isCompleted = idx <= currentStageIndex && !isRejected;
              const isCurrent = idx === currentStageIndex && !isRejected;
              
              return (
                <div key={stage.id} className="flex flex-col items-center gap-3 text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                    isRejected ? 'bg-[#111] border-[#333] text-[#555]' :
                    isCurrent ? 'bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059] shadow-[0_0_20px_rgba(197,160,89,0.4)]' :
                    isCompleted ? 'bg-[#C5A059] border-[#C5A059] text-black' :
                    'bg-[#111] border-[#333] text-[#555]'
                  }`}>
                    <stage.icon size={20} />
                  </div>
                  <div className={`text-xs font-semibold uppercase tracking-wider ${
                    isCurrent ? 'text-[#C5A059]' :
                    isCompleted ? 'text-[#CCC]' : 'text-[#555]'
                  }`}>
                    {stage.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rejected State Override */}
          {isRejected && (
            <div className="mt-8 p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center justify-center gap-3 text-red-400">
              <XCircle size={24} />
              <span>This application was not approved. Thank you for your interest.</span>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div className="bg-[#111]/30 border border-[#222] rounded-xl p-6 group">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-[#888] group-hover:text-[#C5A059] transition-colors" size={18} />
            <h4 className="text-sm text-[#888] font-medium">Applied On</h4>
          </div>
          <p className="text-[#F5F5F5] font-serif text-lg">
            {new Date(application.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </motion.div>

        <motion.div className="bg-[#111]/30 border border-[#222] rounded-xl p-6 group">
          <div className="flex items-center gap-3 mb-2">
            <Building className="text-[#888] group-hover:text-[#C5A059] transition-colors" size={18} />
            <h4 className="text-sm text-[#888] font-medium">Company</h4>
          </div>
          <p className="text-[#F5F5F5] font-serif text-lg">{application.company}</p>
        </motion.div>

        <motion.div className="bg-[#111]/30 border border-[#222] rounded-xl p-6 group">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="text-[#888] group-hover:text-[#C5A059] transition-colors" size={18} />
            <h4 className="text-sm text-[#888] font-medium">Industry</h4>
          </div>
          <p className="text-[#F5F5F5] font-serif text-lg">{application.industry}</p>
        </motion.div>

        <motion.div className="bg-[#111]/30 border border-[#222] rounded-xl p-6 group">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-[#888] group-hover:text-[#C5A059] transition-colors" size={18} />
            <h4 className="text-sm text-[#888] font-medium">City</h4>
          </div>
          <p className="text-[#F5F5F5] font-serif text-lg">{application.city}</p>
        </motion.div>
      </div>

      {/* Editing Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-xl text-[#AAA] text-sm">
        <AlertCircle className="text-[#C5A059] shrink-0 mt-0.5" size={18} />
        <p>
          Your application is currently locked for review. You may not edit your details after submission unless expressly enabled by an administrator.
        </p>
      </div>
    </div>
  );
};
