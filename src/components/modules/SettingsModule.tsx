import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Palette, Shield, Mail, MessageSquare, Lock, Key,
  ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { MOCK_MODE } from '../../config/env';
import { resetMockData } from '../../services/api';
import { fetchSettings, saveSettings } from '../../services/api';

interface Section {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  status: 'configured' | 'not_configured' | 'partial';
}

const SECTIONS: Section[] = [
  {
    id: 'branding',
    label: 'Branding',
    description: 'Platform name, logo, colour palette, and custom domain settings.',
    icon: Palette,
    iconColor: 'text-pink-400',
    status: 'partial',
  },
  {
    id: 'authentication',
    label: 'Authentication',
    description: 'Google SSO, JWT expiry, session management, and login policies.',
    icon: Key,
    iconColor: 'text-blue-400',
    status: 'configured',
  },
  {
    id: 'smtp',
    label: 'SMTP / Email',
    description: 'Outgoing mail server, sender address, and TLS configuration.',
    icon: Mail,
    iconColor: 'text-[#C5A059]',
    status: 'configured',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Twilio / Meta Cloud API credentials and default message templates.',
    icon: MessageSquare,
    iconColor: 'text-emerald-400',
    status: 'not_configured',
  },
  {
    id: 'permissions',
    label: 'Permissions',
    description: 'Role definitions, access scopes, and feature flags per role.',
    icon: Shield,
    iconColor: 'text-purple-400',
    status: 'configured',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Rate limiting, IP allowlist, audit log retention, and 2FA enforcement.',
    icon: Lock,
    iconColor: 'text-red-400',
    status: 'partial',
  },
];

const STATUS_MAP = {
  configured:     { label: 'Configured',     cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  partial:        { label: 'Partial',         cls: 'bg-yellow-500/10  text-yellow-400  border-yellow-500/20'  },
  not_configured: { label: 'Not Configured',  cls: 'bg-red-500/10     text-red-400     border-red-500/20'     },
};

// Section detail panels — environment-variable-driven configs shown as read-only
const DETAIL_CONTENT: Record<string, React.ReactNode> = {
  branding: (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <SettingField label="Platform Name" value="Viora Elite" editable />
        <SettingField label="Primary Colour (hex)" value="#C5A059" editable />
        <SettingField label="Logo URL" value="/images/logo.png" editable />
        <SettingField label="Custom Domain" value="—" editable placeholder="yourdomain.com" />
      </div>
    </div>
  ),
  authentication: (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <SettingField label="Google Client ID" value="Configured via env" readonly />
        <SettingField label="JWT Access Expiry" value="15 minutes" readonly />
        <SettingField label="JWT Refresh Expiry" value="7 days" readonly />
        <SettingField label="Session Policy" value="Single device" readonly />
      </div>
      <Notice type="info">
        Authentication credentials are managed via environment variables in <code>application.yml</code>.
      </Notice>
    </div>
  ),
  smtp: (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <SettingField label="SMTP Host" value="smtp.titan.email" readonly />
        <SettingField label="Port" value="465 (SSL)" readonly />
        <SettingField label="Sender Address" value="Configured via env" readonly />
        <SettingField label="TLS" value="Enabled" readonly />
      </div>
      <Notice type="info">
        SMTP credentials are managed via environment variables. Changes require a server restart.
      </Notice>
    </div>
  ),
  whatsapp: (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <SettingField label="Provider" value="Twilio" readonly />
        <SettingField label="Account SID" value="Not configured" readonly />
        <SettingField label="From Number" value="Not configured" readonly />
        <SettingField label="Auth Token" value="Not configured" readonly />
      </div>
      <Notice type="warn">
        WhatsApp integration is not active. Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, and <code>TWILIO_FROM_NUMBER</code> in your environment.
      </Notice>
    </div>
  ),
  permissions: (
    <div className="space-y-3 text-sm">
      {[
        { role: 'SUPER_ADMIN', perms: ['Full platform access', 'User & event management', 'Audit logs', 'Settings'] },
        { role: 'ADMIN',       perms: ['Application review', 'Guest management', 'Invitation management', 'Analytics (read)'] },
        { role: 'MEMBER',        perms: ['View assigned events', 'View assigned guests', 'Profile management'] },
      ].map(r => (
        <div key={r.role} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <p className="text-xs font-bold text-[#C5A059] uppercase tracking-widest mb-3">{r.role}</p>
          <div className="flex flex-wrap gap-2">
            {r.perms.map(p => (
              <span key={p} className="px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[#999] rounded-lg text-xs">
                {p}
              </span>
            ))}
          </div>
        </div>
      ))}
      <Notice type="info">Role permissions are enforced server-side. Frontend changes are display-only.</Notice>
    </div>
  ),
  security: (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <SettingField label="Rate Limiting" value="Active (Spring Security)" readonly />
        <SettingField label="CORS Origins" value="localhost:5173, :3000, :5174" readonly />
        <SettingField label="Audit Log Retention" value="90 days (default)" readonly />
        <SettingField label="2FA" value="Not enforced" readonly />
      </div>
      <Notice type="info">
        Security settings are managed via <code>SecurityConfig.java</code> and environment variables.
      </Notice>
    </div>
  ),
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SettingField({
  label, value, readonly, editable, placeholder, onChange
}: {
  label: string;
  value: string;
  readonly?: boolean;
  editable?: boolean;
  placeholder?: string;
    onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">
        {label}
      </label>
        <input
          readOnly={readonly || !editable}
          value={value}
          onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg px-4 py-2.5 text-sm border outline-none transition-colors ${
          readonly
            ? 'bg-[#0a0a0a] border-[#1a1a1a] text-[#555] cursor-default'
            : 'bg-[#111] border-[#222] text-[#DDD] focus:border-[#C5A059]/50'
        }`}
      />
    </div>
  );
}

function Notice({ children, type }: { children: React.ReactNode; type: 'info' | 'warn' }) {
  const cls = type === 'warn'
    ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400/80'
    : 'bg-blue-500/5 border-blue-500/20 text-blue-400/80';
  const Icon = type === 'warn' ? AlertCircle : CheckCircle2;
  return (
    <div className={`flex items-start gap-3 border rounded-xl p-3.5 ${cls}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export const SettingsModule: React.FC<{ token?: string }> = ({ token = '' }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settings, setSettings] = useState({ platformName: 'Viora Elite', primaryColor: '#C5A059', logoUrl: '/images/logo.png', customDomain: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings(token).then(result => setSettings(current => ({ ...current, ...result.data }))).catch(() => {});
  }, [token]);

  const saveBranding = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings(settings, token);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const section = SECTIONS.find(s => s.id === activeSection);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-5xl"
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[#F5F5F5]">Settings</h2>
        <p className="text-xs text-[#555] mt-0.5">
          Platform configuration. Most values are managed via environment variables and <code className="text-[#C5A059]">application.yml</code>.
        </p>
      </div>

      {activeSection === null ? (
        /* Section Grid */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTIONS.map((s, i) => {
            const status = STATUS_MAP[s.status];
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveSection(s.id)}
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 text-left hover:border-[#2a2a2a] hover:bg-[#111] transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-9 h-9 rounded-lg bg-[#111] border border-[#1a1a1a] flex items-center justify-center ${s.iconColor}`}>
                    <s.icon size={16} />
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#DDD] mb-1 group-hover:text-[#C5A059] transition-colors">
                  {s.label}
                </h3>
                <p className="text-xs text-[#555] leading-relaxed">{s.description}</p>
                <div className="flex items-center gap-1 mt-4 text-[#444] group-hover:text-[#C5A059] transition-colors">
                  <span className="text-[11px]">Configure</span>
                  <ChevronRight size={12} />
                </div>
              </motion.button>
            );
            })}
          </div>
          {MOCK_MODE && (
            <div className="flex items-center justify-between gap-4 border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4">
              <div>
                <p className="text-xs font-semibold text-yellow-400">Mock development data</p>
                <p className="text-[11px] text-yellow-400/60 mt-1">Reset applications, users, notifications, tasks, and activities to their seed state.</p>
              </div>
              <button
                onClick={() => { if (window.confirm('Reset all mock data?')) resetMockData(); }}
                className="shrink-0 px-3 py-2 text-xs font-semibold text-yellow-300 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/10 transition-colors"
              >
                Reset Mock Data
              </button>
            </div>
          )}
        </>
      ) : (
        /* Section Detail */
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-5"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setActiveSection(null)}
              className="text-[#555] hover:text-[#C5A059] transition-colors"
            >
              Settings
            </button>
            <ChevronRight size={14} className="text-[#333]" />
            <span className="text-[#DDD] font-medium">{section?.label}</span>
          </div>

          {/* Detail Card */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[#1a1a1a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {section && (
                  <div className={`w-8 h-8 rounded-lg bg-[#111] border border-[#1a1a1a] flex items-center justify-center ${section.iconColor}`}>
                    <section.icon size={15} />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-[#DDD]">{section?.label}</h3>
                  <p className="text-[11px] text-[#555]">{section?.description}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_MAP[section?.status || 'not_configured'].cls}`}>
                {STATUS_MAP[section?.status || 'not_configured'].label}
              </span>
            </div>

            {/* Card Body */}
            <div className="p-6">
              {activeSection === 'branding' ? (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <SettingField label="Platform Name" value={settings.platformName} editable onChange={value => setSettings({ ...settings, platformName: value })} />
                    <SettingField label="Primary Colour (hex)" value={settings.primaryColor} editable onChange={value => setSettings({ ...settings, primaryColor: value })} />
                    <SettingField label="Logo URL" value={settings.logoUrl} editable onChange={value => setSettings({ ...settings, logoUrl: value })} />
                    <SettingField label="Custom Domain" value={settings.customDomain} editable placeholder="yourdomain.com" onChange={value => setSettings({ ...settings, customDomain: value })} />
                  </div>
                </div>
              ) : DETAIL_CONTENT[activeSection] ?? (
                <p className="text-sm text-[#555]">No configuration available.</p>
              )}
            </div>

            {/* Card Footer */}
            {section?.status !== 'not_configured' && (
              <div className="px-6 py-4 border-t border-[#1a1a1a] bg-[#0a0a0a] flex justify-end gap-3">
                <button
                  onClick={() => setActiveSection(null)}
                  className="px-5 py-2 text-sm text-[#888] hover:text-[#CCC] border border-[#1a1a1a] rounded-lg hover:bg-[#111] transition-colors"
                >
                  Cancel
                </button>
                <button onClick={activeSection === 'branding' ? saveBranding : undefined} disabled={saving} className="px-5 py-2 text-sm bg-[#C5A059] text-black font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
