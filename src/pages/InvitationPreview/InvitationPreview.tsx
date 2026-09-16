import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { fetchInvitationByToken } from '../../services/api';

export const InvitationPreview: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('This invitation link is incomplete.');
      setLoading(false);
      return;
    }
    fetchInvitationByToken(token)
      .then(result => setInvitation(result.data))
      .catch(() => setError('This invitation is invalid or no longer available.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] text-[#C5A059] flex items-center justify-center">Loading invitation...</div>;
  if (error || !invitation) return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col items-center justify-center gap-5 p-6 text-center">
      <Mail className="text-[#C5A059]" size={40} />
      <h1 className="text-2xl font-serif">Invitation unavailable</h1>
      <p className="text-[#888]">{error}</p>
      <button onClick={() => navigate('/')} className="text-sm text-[#C5A059]">Return to home</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-6 sm:p-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-[#888] hover:text-[#C5A059] mb-12">
        <ArrowLeft size={16} /> Back
      </button>
      <main className="max-w-2xl mx-auto border border-[#C5A059]/25 bg-[#111] rounded-2xl p-8 sm:p-12 text-center">
        <Mail className="mx-auto text-[#C5A059] mb-6" size={34} />
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#C5A059]">Private Invitation</p>
        <h1 className="text-4xl font-serif mt-4">{invitation.eventTitle || 'The Imperium'}</h1>
        <p className="text-[#999] mt-5">Prepared exclusively for {invitation.guestName || 'our invited guest'}.</p>
        <p className="text-xs text-[#666] mt-8">Invitation {invitation.invitationNumber || invitation.publicId}</p>
      </main>
    </div>
  );
};
