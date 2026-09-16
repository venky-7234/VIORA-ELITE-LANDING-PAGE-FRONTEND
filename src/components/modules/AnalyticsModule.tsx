import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Activity, Building, MapPin, Mail, TrendingUp, Users, FileText } from 'lucide-react';
import { fetchAnalytics } from '../../services/api';

interface AnalyticsModuleProps {
  token: string;
  eventId?: string;
}

interface ChartData {
  applicationsReceived: { date: string; count: number }[];
  applicationsApproved: { date: string; count: number }[];
  applicationsRejected: { date: string; count: number }[];
  invitationsSent:      { date: string; count: number }[];
  topCompanies:         { name: string; count: number }[];
  topCities:            { name: string; count: number }[];
  invitationStats: {
    totalGenerated: number;
    totalSent:      number;
    totalResponded: number;
    totalCancelled: number;
  };
}

const GOLD  = '#C5A059';
const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: '#111',
    borderColor: '#2a2a2a',
    color: '#DDD',
    borderRadius: '10px',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
  },
  itemStyle: { color: '#DDD' }
};

const AnalyticsModuleBase: React.FC<AnalyticsModuleProps> = ({ token, eventId }) => {
  const [data, setData]     = useState<ChartData | null>(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => { fetchData(); }, [eventId]);

  const fetchData = async () => {
    setLoad(true);
    try {
      const json = await fetchAnalytics(token, eventId);
      setData(json.data);
    } catch { /* silent */ }
    finally { setLoad(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-64 text-[#888] text-sm">
        No analytics data available.
      </div>
    );
  }

  // Trend data merge
  const trendData = (data.applicationsReceived || []).map((item, i) => ({
    date:    new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Received:    item.count,
    Approved:    data.applicationsApproved?.[i]?.count || 0,
    Rejected:    data.applicationsRejected?.[i]?.count || 0,
  }));

  const invStats = data.invitationStats || { totalGenerated: 0, totalSent: 0, totalResponded: 0, totalCancelled: 0 };

  const pieData = [
    { name: 'Generated',  value: invStats.totalGenerated,  color: '#e5c158' },
    { name: 'Sent',       value: invStats.totalSent,        color: '#C5A059' },
    { name: 'Responded',  value: invStats.totalResponded,   color: '#10b981' },
    { name: 'Cancelled',  value: invStats.totalCancelled,   color: '#ef4444' },
  ].filter(d => d.value > 0);
  if (pieData.length === 0) pieData.push({ name: 'No Data', value: 1, color: '#1a1a1a' });

  // Summary KPIs derived from trend data
  const totalReceived  = (data.applicationsReceived || []).reduce((s, d) => s + d.count, 0);
  const totalApproved  = (data.applicationsApproved || []).reduce((s, d) => s + d.count, 0);
  const approvalRate   = totalReceived > 0 ? Math.round((totalApproved / totalReceived) * 100) : 0;

  const kpis = [
    { label: 'Received (7d)',   value: totalReceived,                          icon: FileText, color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
    { label: 'Approved (7d)',   value: totalApproved,                          icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/5',  border: 'border-emerald-500/20' },
    { label: 'Invites Sent',    value: invStats.totalSent,         icon: Mail,     color: 'text-[#C5A059]',   bg: 'bg-[#C5A059]/5',    border: 'border-[#C5A059]/20' },
    { label: 'Approval Rate',   value: `${approvalRate}%`,                     icon: TrendingUp,color: 'text-purple-400', bg: 'bg-purple-500/5',   border: 'border-purple-500/20' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-7xl">
      
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`${k.bg} ${k.border} border rounded-xl p-4`}
          >
            <div className={`w-8 h-8 rounded-lg ${k.bg} border ${k.border} flex items-center justify-center mb-3`}>
              <k.icon size={15} className={k.color} />
            </div>
            <p className={`text-2xl font-light ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-[#555] uppercase tracking-widest mt-1 font-semibold">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1: Trend + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend line — 2/3 width */}
        <div className="lg:col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={15} className="text-[#C5A059]" />
            <h3 className="text-sm font-semibold text-[#DDD]">7-Day Application Pipeline</h3>
          </div>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="date" stroke="#444" fontSize={11} tick={{ fill: '#666' }} />
                <YAxis stroke="#444" fontSize={11} tick={{ fill: '#666' }} />
                <Tooltip {...CHART_TOOLTIP} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#888' }}
                />
                <Line type="monotone" dataKey="Received" stroke="#e5c158" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Approved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Rejected" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invitation Pie — 1/3 width */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Mail size={15} className="text-[#C5A059]" />
            <h3 className="text-sm font-semibold text-[#DDD]">Invitation Funnel</h3>
          </div>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="45%"
                  innerRadius={52} outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP} />
                <Legend
                  verticalAlign="bottom" height={32}
                  wrapperStyle={{ fontSize: '11px', color: '#888' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Companies + Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Companies */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Building size={15} className="text-[#C5A059]" />
            <h3 className="text-sm font-semibold text-[#DDD]">Top Companies</h3>
          </div>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={(data.topCompanies || []).slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                <XAxis type="number" stroke="#444" fontSize={11} tick={{ fill: '#666' }} />
                <YAxis dataKey="name" type="category" stroke="#444" fontSize={11} tick={{ fill: '#888' }} width={90} />
                <Tooltip {...CHART_TOOLTIP} cursor={{ fill: '#1a1a1a' }} />
                <Bar dataKey="count" fill={GOLD} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={15} className="text-[#C5A059]" />
            <h3 className="text-sm font-semibold text-[#DDD]">Top Cities</h3>
          </div>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={(data.topCities || []).slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                <XAxis type="number" stroke="#444" fontSize={11} tick={{ fill: '#666' }} />
                <YAxis dataKey="name" type="category" stroke="#444" fontSize={11} tick={{ fill: '#888' }} width={90} />
                <Tooltip {...CHART_TOOLTIP} cursor={{ fill: '#1a1a1a' }} />
                <Bar dataKey="count" fill="#8c6d32" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const AnalyticsModule = React.memo(AnalyticsModuleBase);
