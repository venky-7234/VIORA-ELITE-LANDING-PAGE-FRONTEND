import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Lock, Camera, X, CalendarDays, Clock,
  CheckCircle2, Shield, Bell
} from "lucide-react";
import { getUserProfile, updatePassword, updateUserProfile, fetchEvents } from '../../services/api';
import { toast, Toaster } from "react-hot-toast";

interface AdminProfileModuleProps {
  token: string;
}

export const AdminProfileModule: React.FC<AdminProfileModuleProps> = ({ token }) => {
  const [profile, setProfile]             = useState<any>(null);
  const [allEvents, setAllEvents]         = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showPasswordModal, setPassModal] = useState(false);
  const [showAvatarModal, setAvatarModal] = useState(false);
  const [showEventsModal, setEventsModal] = useState(false);
  const [passwordForm, setPassForm]       = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [avatarUrl, setAvatar]            = useState("");
  const [submitting, setSubmitting]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, eventsRes] = await Promise.all([
        getUserProfile(token),
        fetchEvents(token, 0, 200),
      ]);
      setProfile(profileRes.data);
      setAvatar(profileRes.data?.avatarUrl || "");
      setAllEvents(eventsRes.data?.content || []);
    } catch { toast.error("Failed to load profile"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const assignedEvents = allEvents.filter(ev =>
    profile?.assignedEventIds?.includes(ev.publicId)
  );

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword }, token);
      toast.success("Password updated");
      setPassModal(false);
      setPassForm({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally { setSubmitting(false); }
  };

  const handleUpdateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateUserProfile({ avatarUrl }, token);
      toast.success("Profile picture updated");
      setAvatarModal(false);
      await load();
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (err: any) {
      toast.error(err.message || "Failed to update picture");
    } finally { setSubmitting(false); }
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
      className="w-full space-y-5 p-6"
    >
      <Toaster position="top-right" toastOptions={{ style: { background: "#111", color: "#DDD", border: "1px solid #222" } }} />

      {/* Profile Header Card */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full bg-[#111] border-2 border-[#C5A059]/30 overflow-hidden flex items-center justify-center">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={36} className="text-[#444]" />
            )}
          </div>
          <button
            onClick={() => setAvatarModal(true)}
            className="absolute bottom-0 right-0 w-7 h-7 bg-[#C5A059] hover:bg-[#D4B86A] text-black rounded-full flex items-center justify-center transition-colors shadow-lg"
            title="Update photo"
          >
            <Camera size={13} />
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-semibold text-[#F5F5F5] mb-0.5">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-sm text-[#666] mb-4">{profile.email}</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <span className="px-2.5 py-1 bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] text-[11px] font-semibold rounded-full uppercase tracking-wide">
              {profile.roles?.[0]?.name || "Admin"}
            </span>
            <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border uppercase tracking-wide ${
              profile.status === "ACTIVE"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {profile.status}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => setPassModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-lg text-sm text-[#CCC] hover:text-[#F5F5F5] transition-all"
          >
            <Lock size={14} className="text-[#C5A059]" /> Change Password
          </button>
          <button
            onClick={() => setEventsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-lg text-sm text-[#CCC] hover:text-[#F5F5F5] transition-all"
          >
            <CalendarDays size={14} className="text-[#C5A059]" />
            Assigned Events
            <span className="ml-auto bg-[#C5A059]/10 text-[#C5A059] text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
              {profile.assignedEventIds?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Account Details + Assignments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Account Details */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1a1a1a]">
            <Shield size={14} className="text-[#C5A059]" />
            <h3 className="text-sm font-semibold text-[#DDD]">Account Details</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Username",   value: profile.username || "—" },
              { label: "Last Login", value: profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Never" },
              { label: "Phone",      value: profile.phoneNumber || "—" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-xs text-[#555]">{row.label}</span>
                <span className="text-xs text-[#CCC] max-w-[55%] text-right truncate">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assignments Summary */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1a1a1a]">
            <CalendarDays size={14} className="text-[#C5A059]" />
            <h3 className="text-sm font-semibold text-[#DDD]">Assignments</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Assigned Events", value: profile.assignedEventIds?.length || 0, color: "text-[#C5A059]" },
              { label: "Assigned Guests", value: profile.assignedGuestIds?.length || 0, color: "text-blue-400" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-xs text-[#555]">{row.label}</span>
                <span className={`text-xl font-light ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Preferences (read-only UI placeholder) */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1a1a1a]">
          <Bell size={14} className="text-[#C5A059]" />
          <h3 className="text-sm font-semibold text-[#DDD]">Notification Preferences</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: "Email Notifications",    enabled: true  },
            { label: "WhatsApp Notifications", enabled: false },
            { label: "New Application Alerts", enabled: true  },
          ].map(pref => (
            <div key={pref.label} className="flex items-center justify-between">
              <span className="text-xs text-[#888]">{pref.label}</span>
              <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${pref.enabled ? "bg-[#C5A059]" : "bg-[#222]"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${pref.enabled ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#444] mt-4">
          Notification settings are managed server-side. Toggle UI coming soon.
        </p>
      </div>

      {/* ── Modals ── */}

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <Modal title="Change Password" onClose={() => setPassModal(false)}>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <Field label="Current Password">
                <input type="password" required value={passwordForm.oldPassword}
                  onChange={e => setPassForm({ ...passwordForm, oldPassword: e.target.value })}
                  className={INPUT_CLS} />
              </Field>
              <Field label="New Password">
                <input type="password" required minLength={8} value={passwordForm.newPassword}
                  onChange={e => setPassForm({ ...passwordForm, newPassword: e.target.value })}
                  className={INPUT_CLS} />
              </Field>
              <Field label="Confirm New Password">
                <input type="password" required value={passwordForm.confirm}
                  onChange={e => setPassForm({ ...passwordForm, confirm: e.target.value })}
                  className={INPUT_CLS} />
              </Field>
              <ModalFooter submitting={submitting} onCancel={() => setPassModal(false)} label="Update Password" />
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Avatar Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <Modal title="Update Profile Picture" onClose={() => setAvatarModal(false)}>
            <form onSubmit={handleUpdateAvatar} className="space-y-4">
              <Field label="Photo URL">
                <input type="url" value={avatarUrl}
                  onChange={e => setAvatar(e.target.value)}
                  placeholder="https://…"
                  className={INPUT_CLS} />
              </Field>
              {avatarUrl && (
                <div className="flex justify-center">
                  <img src={avatarUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-[#C5A059]/30" />
                </div>
              )}
              <ModalFooter submitting={submitting} onCancel={() => setAvatarModal(false)} label="Save Picture" />
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Assigned Events Modal */}
      <AnimatePresence>
        {showEventsModal && (
          <Modal title="Assigned Events" onClose={() => setEventsModal(false)} wide>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {assignedEvents.length === 0 ? (
                <div className="text-center py-10">
                  <CalendarDays size={32} className="text-[#333] mx-auto mb-3" />
                  <p className="text-sm text-[#555]">No events assigned yet.</p>
                </div>
              ) : assignedEvents.map(ev => (
                <div key={ev.publicId} className="flex items-center justify-between bg-[#111] border border-[#1a1a1a] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#DDD]">{ev.title}</p>
                    <p className="text-xs text-[#555] flex items-center gap-1.5 mt-0.5">
                      <Clock size={11} />
                      {ev.startDateTime ? new Date(ev.startDateTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBD"}
                      {ev.city && ` • ${ev.city}`}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                    ev.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  }`}>
                    {ev.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-[#1a1a1a] mt-4">
              <button onClick={() => setEventsModal(false)}
                className="px-5 py-2 bg-[#111] border border-[#1a1a1a] rounded-lg text-sm text-[#888] hover:text-[#CCC] transition-colors">
                Close
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Local sub-components ────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ submitting, onCancel, label }: { submitting: boolean; onCancel: () => void; label: string }) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-[#1a1a1a]">
      <button type="button" onClick={onCancel}
        className="px-5 py-2 text-sm text-[#888] hover:text-[#CCC] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={submitting}
        className="px-5 py-2 bg-[#C5A059] text-black text-sm font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors disabled:opacity-50 flex items-center gap-2">
        {submitting && <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />}
        {label}
      </button>
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`bg-[#0d0d0d] border border-[#222] rounded-2xl shadow-2xl w-full ${wide ? "max-w-lg" : "max-w-md"} overflow-hidden`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a]">
          <h3 className="text-sm font-semibold text-[#DDD]">{title}</h3>
          <button onClick={onClose} className="text-[#555] hover:text-[#CCC] transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

