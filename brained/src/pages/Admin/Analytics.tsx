import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  MousePointer,
  Activity,
  Clock,
  TrendingUp,
  Eye,
  Send,
  Download,
  Calendar,
  RefreshCw,
  Filter,
  Zap,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const AdminAnalytics: React.FC = () => {
  const [eventsSummary, setEventsSummary] = useState<any[]>([]);
  const [perfSummary, setPerfSummary] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [clickEvents, setClickEvents] = useState<any[]>([]);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [pageURL, setPageURL] = useState<string>('');

  const baseURL = (api as any).defaults?.baseURL || '';

  const load = async () => {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (pageURL) params.pageURL = pageURL;
      const ev = await api.get('/api/analytics/events/summary', { params });
      setEventsSummary(ev.data.byType || []);
      const perf = await api.get('/api/analytics/performance/summary', { params });
      setPerfSummary(perf.data || []);
      const recent = await api.get('/api/analytics/events', { params });
      setEvents(recent.data || []);
      // limit click events for heatmap
      const clicks = (recent.data || []).filter((e: any) => e.eventType === 'click');
      setClickEvents(clicks.slice(0, 2000));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const exportCSV = () => {
    const u = new URL('/api/analytics/export/csv', baseURL);
    if (from) u.searchParams.set('from', from);
    if (to) u.searchParams.set('to', to);
    if (pageURL) u.searchParams.set('pageURL', pageURL);
    window.open(u.toString(), '_blank');
  };

  const exportPDF = () => {
    const u = new URL('/api/analytics/export/pdf', baseURL);
    if (from) u.searchParams.set('from', from);
    if (to) u.searchParams.set('to', to);
    if (pageURL) u.searchParams.set('pageURL', pageURL);
    window.open(u.toString(), '_blank');
  };

  // transform perf summary into chart-friendly data
  const perfChartData = useMemo(() => {
    return (perfSummary || []).map((p: any) => ({
      page: p.pageURL?.replace(/^https?:\/\//, '') || 'unknown',
      LCP: Math.round(p.avgLCP || 0),
      FCP: Math.round(p.avgFCP || 0),
      TTFB: Math.round(p.avgTTFB || 0),
      count: p.count || 0,
    }));
  }, [perfSummary]);

  // heatmap points normalized to container size
  const Heatmap: React.FC = () => {
    const [w, h] = [800, 450];
    const points = useMemo(() => {
      return clickEvents.map((e: any) => {
        const m = e.metadata || {};
        const vw = m.vw || 1366;
        const vh = m.vh || 768;
        const x = Math.max(0, Math.min(1, (m.x || 0) / vw)) * w;
        const y = Math.max(0, Math.min(1, (m.y || 0) / vh)) * h;
        return { x, y };
      });
    }, [clickEvents]);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold">{clickEvents.length}</span> click points
            {pageURL && <span className="text-slate-500"> for {pageURL}</span>}
          </p>
          {clickEvents.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-red-500/40"></div>
              <span className="text-xs font-medium text-slate-700">Click density</span>
            </div>
          )}
        </div>
        <div
          className="relative border-2 border-slate-200 rounded-xl bg-gradient-to-br from-slate-50 to-white overflow-hidden shadow-inner"
          style={{ width: w, height: h, maxWidth: '100%' }}
        >
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-10">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Click points */}
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-red-500/30 border-2 border-red-500/50 animate-pulse"
              style={{
                left: p.x - 8,
                top: p.y - 8,
                width: 16,
                height: 16,
                animationDuration: `${1.5 + (i % 3) * 0.5}s`,
              }}
            />
          ))}
          {points.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <MousePointer className="w-12 h-12 text-slate-300 mb-2" />
              <span className="text-sm text-slate-400 font-medium">No click data available</span>
              <span className="text-xs text-slate-400 mt-1">Apply filters to see heatmap data</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calculate total events for stats
  const totalClicks = useMemo(() => {
    const clickSum = eventsSummary.find((e: any) => e.eventType === 'click');
    return clickSum?.count || 0;
  }, [eventsSummary]);

  const totalPageViews = useMemo(() => {
    const pvSum = eventsSummary.find((e: any) => e.eventType === 'pageview');
    return pvSum?.count || 0;
  }, [eventsSummary]);

  const totalSubmits = useMemo(() => {
    const submitSum = eventsSummary.find((e: any) => e.eventType === 'submit');
    return submitSum?.count || 0;
  }, [eventsSummary]);

  const avgLoadTime = useMemo(() => {
    if (perfSummary.length === 0) return 0;
    const totalLCP = perfSummary.reduce((sum: number, p: any) => sum + (p.avgLCP || 0), 0);
    return (totalLCP / perfSummary.length / 1000).toFixed(1); // Convert to seconds
  }, [perfSummary]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200/50 bg-white sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Event Analytics Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Track user interactions, events, and page performance</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportPDF}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">From Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">To Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Page URL</label>
              <input
                type="text"
                placeholder="https://example.com/page"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                value={pageURL}
                onChange={(e) => setPageURL(e.target.value)}
              />
            </div>
            <button
              onClick={load}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFrom('');
                setTo('');
                setPageURL('');
              }}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MousePointer className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(totalClicks)}</p>
              <p className="text-sm text-slate-600">Total Clicks</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(totalPageViews)}</p>
              <p className="text-sm text-slate-600">Page Views</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Send className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(totalSubmits)}</p>
              <p className="text-sm text-slate-600">Form Submits</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{avgLoadTime}s</p>
              <p className="text-sm text-slate-600">Avg Load Time</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Event Counts by Type</h3>
            {eventsSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventsSummary} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="eventType"
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={80}
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-slate-500 bg-slate-50 rounded-lg">
                No events collected yet.
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Metrics (Avg)</h3>
            {perfChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={perfChartData} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="page"
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={80}
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis unit="ms" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="LCP" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="FCP" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="TTFB" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-slate-500 bg-slate-50 rounded-lg">
                No performance data yet.
              </div>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Click Heatmap</h3>
          <Heatmap />
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Events</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {events.slice(0, 50).map((e: any, i: number) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      e.eventType === 'click' ? 'bg-blue-100 text-blue-700' :
                      e.eventType === 'pageview' ? 'bg-green-100 text-green-700' :
                      e.eventType === 'submit' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {e.eventType}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(e.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <pre className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-2 overflow-x-auto">
                  {JSON.stringify(e.metadata || e.deviceInfo || {}, null, 2)}
                </pre>
              </div>
            ))}
            {events.length === 0 && (
              <div className="h-40 flex items-center justify-center text-sm text-slate-500 bg-slate-50 rounded-lg">
                No events recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminAnalytics;
