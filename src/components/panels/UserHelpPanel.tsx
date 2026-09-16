import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Mail, AlertCircle, ChevronDown, ChevronUp, Send, X } from "lucide-react";

// ── FAQ data ────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "How do I check the status of my application?",
    a: "Go to \"My Applications\" in the sidebar. Your current status is displayed at the top with a lifecycle timeline showing exactly where your application stands.",
  },
  {
    q: "When will I receive my invitation?",
    a: "Invitations are generated after your application is approved by an admin. You will receive a notification as soon as it's ready. Check \"My Invitations\" to view and download your invitation.",
  },
  {
    q: "Can I edit my application after submitting?",
    a: "Applications can only be edited before the RSVP deadline and only if editing has been enabled by an administrator. If your application is locked, contact the organizer using the form below.",
  },
  {
    q: "How do I download my invitation?",
    a: "Navigate to \"My Invitations\". Once your invitation is generated, you will see a Download button and a QR code that you can save or share.",
  },
  {
    q: "What should I bring to the event?",
    a: "You should present your digital invitation QR code upon arrival. Government-issued photo ID matching your application details is also required. Check \"Event Details\" for the full guest instructions.",
  },
  {
    q: "How do I update my profile photo?",
    a: "Go to \"Profile\" and click the camera icon on your avatar. Enter the URL of your photo and click \"Save Photo\".",
  },
  {
    q: "I made a mistake in my application. What do I do?",
    a: "Use the \"Contact Support\" form below to describe the issue. An administrator will review your request and reach out within 1-2 business days.",
  },
];

// ── Contact form state type ──────────────────────────────────────────────────

type ContactCategory = "application" | "invitation" | "event" | "technical" | "other";

// ── Component ────────────────────────────────────────────────────────────────

export const UserHelpPanel: React.FC = () => {
  const [openFaq, setOpenFaq]             = useState<number | null>(null);
  const [showContactForm, setContactForm] = useState(false);
  const [showReportForm, setReportForm]   = useState(false);
  const [submitted, setSubmitted]         = useState<"contact" | "report" | null>(null);

  // Contact form state
  const [contactData, setContact] = useState({ category: "application" as ContactCategory, subject: "", message: "" });
  // Report form state
  const [reportData, setReport]   = useState({ page: "", description: "" });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder — wire to backend endpoint if available
    setSubmitted("contact");
    setContactForm(false);
    setContact({ category: "application", subject: "", message: "" });
    setTimeout(() => setSubmitted(null), 4000);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted("report");
    setReportForm(false);
    setReport({ page: "", description: "" });
    setTimeout(() => setSubmitted(null), 4000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5 max-w-3xl"
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[#F5F5F5]">Help & Support</h2>
        <p className="text-xs text-[#555] mt-0.5">Find answers, contact the team, or report an issue.</p>
      </div>

      {/* Success toasts */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-sm"
          >
            <AlertCircle size={15} />
            {submitted === "contact"
              ? "Your message has been sent. We'll respond within 1–2 business days."
              : "Issue reported. Thank you for helping us improve."}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick-action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => { setContactForm(true); setReportForm(false); }}
          className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#C5A059]/30 hover:bg-[#111] rounded-xl px-5 py-4 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center shrink-0">
            <Mail size={15} className="text-[#C5A059]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#DDD] group-hover:text-[#C5A059] transition-colors">Contact Support</p>
            <p className="text-[11px] text-[#555]">Send a message to the organizer</p>
          </div>
        </button>

        <button
          onClick={() => { setReportForm(true); setContactForm(false); }}
          className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1a1a1a] hover:border-red-500/30 hover:bg-[#111] rounded-xl px-5 py-4 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertCircle size={15} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#DDD] group-hover:text-red-400 transition-colors">Report an Issue</p>
            <p className="text-[11px] text-[#555]">Report a bug or technical problem</p>
          </div>
        </button>
      </div>

      {/* Contact Support Form */}
      <AnimatePresence>
        {showContactForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0d0d0d] border border-[#C5A059]/20 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#DDD]">Contact Support</h3>
                <button onClick={() => setContactForm(false)} className="text-[#555] hover:text-[#CCC] transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleContactSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Category</label>
                  <select
                    value={contactData.category}
                    onChange={e => setContact({ ...contactData, category: e.target.value as ContactCategory })}
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none appearance-none"
                  >
                    <option value="application">Application Issue</option>
                    <option value="invitation">Invitation Issue</option>
                    <option value="event">Event Question</option>
                    <option value="technical">Technical Problem</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Subject</label>
                  <input
                    required type="text" value={contactData.subject}
                    onChange={e => setContact({ ...contactData, subject: e.target.value })}
                    placeholder="Brief description of your question"
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Message</label>
                  <textarea
                    required rows={4} value={contactData.message}
                    onChange={e => setContact({ ...contactData, message: e.target.value })}
                    placeholder="Describe your issue or question in detail…"
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setContactForm(false)}
                    className="px-4 py-2 text-sm text-[#888] hover:text-[#CCC] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex items-center gap-2 px-5 py-2 bg-[#C5A059] text-black text-sm font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors">
                    <Send size={13} /> Send Message
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Issue Form */}
      <AnimatePresence>
        {showReportForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0d0d0d] border border-red-500/20 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#DDD]">Report an Issue</h3>
                <button onClick={() => setReportForm(false)} className="text-[#555] hover:text-[#CCC] transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleReportSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Page / Section</label>
                  <input
                    type="text" value={reportData.page}
                    onChange={e => setReport({ ...reportData, page: e.target.value })}
                    placeholder="e.g. My Invitations, Event Details"
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-red-400/50 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Describe the Issue</label>
                  <textarea
                    required rows={4} value={reportData.description}
                    onChange={e => setReport({ ...reportData, description: e.target.value })}
                    placeholder="What happened? What did you expect to happen?"
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-red-400/50 outline-none transition-colors resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setReportForm(false)}
                    className="px-4 py-2 text-sm text-[#888] hover:text-[#CCC] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex items-center gap-2 px-5 py-2 bg-red-500/80 text-white text-sm font-semibold rounded-lg hover:bg-red-500 transition-colors">
                    <Send size={13} /> Submit Report
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center gap-2">
          <HelpCircle size={14} className="text-[#C5A059]" />
          <h3 className="text-sm font-semibold text-[#DDD]">Frequently Asked Questions</h3>
        </div>
        <div className="divide-y divide-[#111]">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#111]/50 transition-colors"
              >
                <span className="text-sm text-[#DDD] pr-4 leading-snug">{item.q}</span>
                {openFaq === i ? (
                  <ChevronUp size={15} className="text-[#C5A059] shrink-0" />
                ) : (
                  <ChevronDown size={15} className="text-[#555] shrink-0" />
                )}
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-[#888] leading-relaxed">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
