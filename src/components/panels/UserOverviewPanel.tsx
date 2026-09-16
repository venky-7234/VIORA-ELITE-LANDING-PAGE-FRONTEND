import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, FileText, Mail, Bell, CalendarDays, ArrowRight } from "lucide-react";
import { fetchUserMetrics } from '../../services/api';

interface UserOverviewPanelProps {
  token: string;
  onNavigate?: (tab: string) => void;
}

export const UserOverviewPanel: React.FC<UserOverviewPanelProps> = ({ token, onNavigate }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserMetrics(token)
      .then(d => { setMetrics(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-[#C5A059] rounded-full border-t-transparent animate-spin" />
      </div>
    );
  }

  const statusStyle: Record<string, string> = {
    APPROVED:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    PENDING:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    REJECTED:  "bg-red-500/10 text-red-400 border-red-500/20",
    SENT:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
    GENERATED: "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20",
    default:   "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  const appStatus  = metrics?.applicationStatus  || "—";
  const invStatus  = metrics?.invitationStatusBadge || "—";
  const unread     = metrics?.unreadNotifications || 0;
  const daysLeft   = metrics?.daysRemaining;
  const eventName  = metrics?.eventName  || "Your Event";
  const welcomeMsg = metrics?.welcomeMessage || "Welcome back.";

  const cards = [
    {
      label:   "Application",
      value:   appStatus,
      icon:    FileText,
      color:   "text-[#C5A059]",
      bg:      "bg-[#C5A059]/5",
      border:  "border-[#C5A059]/20",
      tab:     "applications",
      badge:   statusStyle[appStatus] ?? statusStyle.default,
    },
    {
      label:  "Invitation",
      value:  invStatus,
      icon:   Mail,
      color:  "text-blue-400",
      bg:     "bg-blue-500/5",
      border: "border-blue-500/20",
      tab:    "invitations",
      badge:  statusStyle[invStatus] ?? statusStyle.default,
    },
    {
      label:  "Notifications",
      value:  String(unread),
      icon:   Bell,
      color:  unread > 0 ? "text-yellow-400" : "text-[#555]",
      bg:     unread > 0 ? "bg-yellow-500/5" : "bg-[#0d0d0d]",
      border: unread > 0 ? "border-yellow-500/20" : "border-[#1a1a1a]",
      tab:    "notifications",
      badge:  null,
    },
    ...(daysLeft !== undefined && daysLeft !== null ? [{
      label:  "Days to Event",
      value:  String(Math.max(0, daysLeft)),
      icon:   CalendarDays,
      color:  "text-purple-400",
      bg:     "bg-purple-500/5",
      border: "border-purple-500/20",
      tab:    "event",
      badge:  null as string | null,
    }] : []),
  ];

  return (
    <div className="p-6 space-y-6 w-full max-w-none h-full flex flex-col">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111] to-[#0a0a0a] border border-[#222] p-7 shadow-2xl w-full"
      >
        <div className="absolute top-0 right-0 w-56 h-56 bg-[#C5A059]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Crown size={18} className="text-[#C5A059]" />
              <span className="text-[#C5A059] text-xs font-bold uppercase tracking-widest">VIORA ELITE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-[#F5F5F5] leading-snug">
              {welcomeMsg}
            </h1>
          </div>
          {invStatus && invStatus !== "—" && (
            <span className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest rounded-full border ${statusStyle[invStatus] ?? statusStyle.default} shrink-0`}>
              {invStatus}
            </span>
          )}
        </div>
      </motion.div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.button
            key={card.label}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onNavigate && onNavigate(card.tab)}
            className={`${card.bg} border ${card.border} rounded-xl p-4 text-left hover:brightness-110 transition-all`}
          >
            <div className={`w-8 h-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center mb-3`}>
              <card.icon size={15} className={card.color} />
            </div>
            <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-1">
              {card.label}
            </p>
            {card.badge ? (
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${card.badge}`}>
                {card.value}
              </span>
            ) : (
              <p className={`text-2xl font-light ${card.color}`}>{card.value}</p>
            )}
          </motion.button>
        ))}
      </div>

      {/* Quick-navigation strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "View My Application",  tab: "applications",  desc: "Check status and details" },
          { label: "View My Invitation",   tab: "invitations",   desc: "Download or view QR code" },
          { label: "Event Details",        tab: "event",          desc: "Schedule, venue, dress code" },
        ].map(item => (
          <button
            key={item.tab}
            onClick={() => onNavigate && onNavigate(item.tab)}
            className="flex items-center justify-between gap-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3.5 hover:border-[#2a2a2a] hover:bg-[#111] transition-all group text-left"
          >
            <div>
              <p className="text-sm font-semibold text-[#DDD] group-hover:text-[#C5A059] transition-colors">
                {item.label}
              </p>
              <p className="text-[11px] text-[#555] mt-0.5">{item.desc}</p>
            </div>
            <ArrowRight size={15} className="text-[#444] group-hover:text-[#C5A059] transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
