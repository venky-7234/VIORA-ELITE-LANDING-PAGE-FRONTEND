import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Eye, ShieldCheck, Mail, ArrowRight, FileText } from 'lucide-react';
import { getMyApplication } from '../../services/api';

interface UserInvitationPanelProps {
  token: string;
}

const TIMELINE_STAGES = [
  { id: 'SUBMITTED', label: 'Application Submitted', icon: Send, description: 'Your application has been received' },
  { id: 'REVIEWED', label: 'Application Reviewed', icon: Eye, description: 'Our team is evaluating your profile' },
  { id: 'DECISION', label: 'Admin Decision', icon: ShieldCheck, description: 'Final approval process' },
  { id: 'GENERATED', label: 'Invitation Generated', icon: Mail, description: 'Your exclusive access is ready' }
];

export const UserInvitationPanel: React.FC<UserInvitationPanelProps> = ({ token }) => {
  const [application, setApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyApplication(token)
      .then(data => {
        setApplication(data.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch application', err);
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) {
    return (
      <div className="p-8 h-full space-y-6 flex flex-col justify-center">
        <div className="h-20 w-full bg-[#111] border border-[#333] rounded-2xl animate-pulse" />
        <div className="h-64 bg-[#111] border border-[#333] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 space-y-6">
        <div className="w-24 h-24 rounded-full bg-[#111] border border-[#333] flex items-center justify-center">
          <Mail className="text-[#555]" size={40} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-serif text-[#F5F5F5] tracking-wide">No Invitation Found</h2>
          <p className="text-[#888] max-w-md mx-auto">
            You do not have any pending or generated invitations. Please apply for an event first.
          </p>
        </div>
      </div>
    );
  }

  // Determine current timeline stage based on application status
  let currentStage = 0;
  if (application.status === 'PENDING') currentStage = 0;
  else if (application.status === 'UNDER_REVIEW' || application.status === 'SHORTLISTED') currentStage = 1;
  else if (application.status === 'APPROVED') currentStage = 2;
  else if (application.status === 'INVITATION_GENERATED') currentStage = 3;

  const isRejected = application.status === 'REJECTED';
  const isApprovedOrGenerated = currentStage >= 2 && !isRejected;

  return (
    <div className="p-8 space-y-12 h-full overflow-y-auto">
      <div>
        <h1 className="text-3xl font-serif text-[#F5F5F5] tracking-wide">Invitation Status</h1>
        <p className="text-[#888] mt-2">Track the generation progress of your exclusive event access.</p>
      </div>

      {/* Vertical Timeline Container */}
      <div className="relative max-w-3xl mx-auto py-8">
        {/* Connecting Vertical Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#222] -translate-x-1/2 rounded-full hidden md:block" />

        <div className="space-y-12 relative z-10">
          {TIMELINE_STAGES.map((stage, idx) => {
            const isCompleted = idx <= currentStage && !isRejected;
            const isCurrent = idx === currentStage && !isRejected;
            const isPending = idx > currentStage || isRejected;

            return (
              <motion.div 
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className={`flex flex-col md:flex-row items-center justify-between gap-6 ${isPending ? 'opacity-40' : 'opacity-100'}`}
              >
                {/* Left side (empty on desktop for zig-zag, or text) - Let's do a symmetric layout */}
                <div className={`md:w-1/2 flex md:justify-end text-center md:text-right px-4 ${idx % 2 !== 0 ? 'md:order-3 md:justify-start md:text-left' : ''}`}>
                  <div>
                    <h3 className={`text-xl font-serif tracking-wide ${isCurrent ? 'text-[#C5A059]' : isCompleted ? 'text-[#F5F5F5]' : 'text-[#666]'}`}>
                      {stage.label}
                    </h3>
                    <p className="text-[#888] text-sm mt-1">{stage.description}</p>
                  </div>
                </div>

                {/* Center Icon */}
                <div className={`shrink-0 w-16 h-16 rounded-full border-4 flex items-center justify-center bg-[#050505] transition-all duration-500 z-10 relative md:order-2 ${
                  isCurrent ? 'border-[#C5A059] text-[#C5A059] shadow-[0_0_30px_rgba(197,160,89,0.3)]' :
                  isCompleted ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : 'border-[#333] text-[#555]'
                }`}>
                  <stage.icon size={24} />
                </div>

                {/* Right side spacer to keep center alignment */}
                <div className={`md:w-1/2 px-4 hidden md:block ${idx % 2 !== 0 ? 'md:order-1' : ''}`} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Action Area */}
      {isApprovedOrGenerated && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl mx-auto bg-gradient-to-r from-[#111] to-[#1A1A1A] border border-[#C5A059]/40 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(197,160,89,0.1)] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 mx-auto bg-[#C5A059]/10 rounded-full flex items-center justify-center mb-2">
              <Mail className="text-[#C5A059]" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-serif text-[#C5A059] tracking-widest uppercase">Your Invitation is Ready</h2>
              <p className="text-[#AAA] mt-3">
                Your application has been successfully processed. Click below to view and download your exclusive digital invitation.
              </p>
            </div>
            
            <button className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#C5A059] text-black font-semibold rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(197,160,89,0.4)]">
              <span className="relative z-10 tracking-widest uppercase text-sm">View Invitation</span>
              <ArrowRight className="relative z-10 transition-transform group-hover:translate-x-1" size={18} />
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </div>
        </motion.div>
      )}

      {isRejected && (
        <div className="max-w-2xl mx-auto p-6 bg-red-950/20 border border-red-900/50 rounded-2xl text-center">
          <p className="text-red-400">Unfortunately, your application was not approved. An invitation cannot be generated at this time.</p>
        </div>
      )}
    </div>
  );
};
