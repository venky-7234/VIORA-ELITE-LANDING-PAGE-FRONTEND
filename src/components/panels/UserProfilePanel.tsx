import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, Save, Loader2, Camera, X,
  Bell, CheckCircle2, AlertCircle
} from "lucide-react";
import { getUserProfile, updateUserProfile } from '../../services/api';

interface UserProfilePanelProps {
  token: string;
}

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ token }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [avatarUrl, setAvatar]    = useState("");
  const [showAvatarModal, setAvatarModal] = useState(false);

  const load = () => {
    getUserProfile(token)
      .then(d => {
        const u = d.data;
        setProfile(u);
        setFirstName(u.firstName || "");
        setLastName(u.lastName   || "");
        setPhone(u.phoneNumber   || "");
        setAvatar(u.avatarUrl    || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const d = await updateUserProfile({ firstName, lastName, phoneNumber: phone }, token);
      if (d) {
        setMessage({ type: "success", text: "Profile updated." });
        setProfile(d.data);
        window.dispatchEvent(new Event("profileUpdated"));
      } else {
        setMessage({ type: "error", text: d.message || "Update failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Try again." });
    }
    setSaving(false);
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleAvatarSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateUserProfile({ avatarUrl }, token);
      if (res) {
        setAvatarModal(false);
        load();
        window.dispatchEvent(new Event("profileUpdated"));
        setMessage({ type: "success", text: "Photo updated." });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      {/* Profile Header Card */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full bg-[#111] border-2 border-[#C5A059]/30 overflow-hidden flex items-center justify-center">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={30} className="text-[#444]" />
            )}
          </div>
          <button
            onClick={() => setAvatarModal(true)}
            className="absolute bottom-0 right-0 w-6 h-6 bg-[#C5A059] hover:bg-[#D4B86A] text-black rounded-full flex items-center justify-center transition-colors shadow-lg"
            title="Change photo"
          >
            <Camera size={11} />
          </button>
        </div>

        {/* Name + email */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-[#F5F5F5] mb-0.5">
            {profile.firstName} {profile.lastName}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-[#666] justify-center sm:justify-start mb-3">
            <Mail size={13} className="text-[#C5A059]" />
            <span>{profile.email}</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-semibold">
              Verified
            </span>
          </div>
          <span className="px-2.5 py-1 bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] text-[11px] font-semibold rounded-full uppercase tracking-wide">
            Member
          </span>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#1a1a1a]">
          <h3 className="text-sm font-semibold text-[#DDD]">Edit Profile</h3>
          {message.text && (
            <span className={`text-xs flex items-center gap-1 ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {message.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {message.text}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">First Name</label>
              <input
                type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Last Name</label>
              <input
                type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C5A059] text-black font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1a1a1a]">
          <Bell size={14} className="text-[#C5A059]" />
          <h3 className="text-sm font-semibold text-[#DDD]">Notification Preferences</h3>
        </div>
        <div className="space-y-4">
          {[
            { label: "Application Updates",  sub: "Status changes on your application", on: true  },
            { label: "Approval Alerts",      sub: "When your application is approved",  on: true  },
            { label: "Invitation Updates",   sub: "When your invitation is ready",      on: true  },
            { label: "Event Reminders",      sub: "Upcoming event notifications",       on: true  },
          ].map(pref => (
            <div key={pref.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#CCC]">{pref.label}</p>
                <p className="text-[11px] text-[#555]">{pref.sub}</p>
              </div>
              <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${pref.on ? "bg-[#C5A059]" : "bg-[#222]"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${pref.on ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#444] mt-5">
          Notification preferences are managed server-side. Configurable toggles coming soon.
        </p>
      </div>

      {/* Avatar Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#0d0d0d] border border-[#222] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a]">
                <h3 className="text-sm font-semibold text-[#DDD]">Update Profile Photo</h3>
                <button onClick={() => setAvatarModal(false)} className="text-[#555] hover:text-[#CCC] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAvatarSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">
                    Photo URL
                  </label>
                  <input
                    type="url" value={avatarUrl} onChange={e => setAvatar(e.target.value)}
                    placeholder="https://…"
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                  />
                </div>
                {avatarUrl && (
                  <div className="flex justify-center">
                    <img src={avatarUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-[#C5A059]/30" />
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-2 border-t border-[#1a1a1a]">
                  <button type="button" onClick={() => setAvatarModal(false)}
                    className="px-4 py-2 text-sm text-[#888] hover:text-[#CCC] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 bg-[#C5A059] text-black text-sm font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors disabled:opacity-50 flex items-center gap-2">
                    {saving && <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />}
                    Save Photo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
