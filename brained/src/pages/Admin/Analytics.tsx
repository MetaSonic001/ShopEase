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
} from 'recharts';

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
        <div className="text-xs text-gray-500 mb-2">Showing up to {clickEvents.length} click points{pageURL ? ` for ${pageURL}` : ''}.</div>
        <div className="relative border rounded bg-white" style={{ width: w, height: h }}>
          {/* points overlay */}
          {points.map((p, i) => (
            <div key={i} className="absolute rounded-full bg-red-500/30" style={{ left: p.x - 8, top: p.y - 8, width: 16, height: 16 }} />
          ))}
          {points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">No click data</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Analytics</h2>

      {/* Filters */}
      <div className="bg-white rounded p-4 shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">From</label>
          <input type="date" className="border rounded p-2 w-full" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">To</label>
          <input type="date" className="border rounded p-2 w-full" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Page URL (exact match)</label>
          <input type="text" placeholder="https://example.com/page" className="border rounded p-2 w-full" value={pageURL} onChange={(e) => setPageURL(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white">Apply</button>
          <button onClick={() => { setFrom(''); setTo(''); setPageURL(''); }} className="px-3 py-2 rounded border">Reset</button>
        </div>
        <div className="md:col-span-4 flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded border">Export CSV</button>
          <button onClick={exportPDF} className="px-3 py-2 rounded border">Export PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded p-4 shadow">
          <h3 className="font-semibold mb-3">Event counts</h3>
          {eventsSummary.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={eventsSummary} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="eventType" interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No events collected yet.</div>
          )}
        </div>

        <div className="bg-white rounded p-4 shadow">
          <h3 className="font-semibold mb-3">Performance (avg)</h3>
          {perfChartData.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={perfChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="page" interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis unit="ms" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="LCP" stroke="#ef4444" dot={false} />
                  <Line type="monotone" dataKey="FCP" stroke="#22c55e" dot={false} />
                  <Line type="monotone" dataKey="TTFB" stroke="#3b82f6" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No perf data yet.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded p-4 shadow mb-6">
        <h3 className="font-semibold mb-3">Heatmap (clicks)</h3>
        <Heatmap />
      </div>

      <div className="bg-white rounded p-4 shadow">
        <h3 className="font-semibold mb-3">Recent events</h3>
        <div className="space-y-2">
          {events.slice(0, 50).map((e: any, i: number) => (
            <div key={i} className="text-sm border rounded p-2 bg-gray-50">
              <div className="text-xs text-gray-500">{new Date(e.timestamp).toLocaleString()}</div>
              <div className="font-medium">{e.eventType}</div>
              <pre className="text-xs mt-1 text-gray-700">{JSON.stringify(e.metadata || e.deviceInfo || {}, null, 2)}</pre>
            </div>
          ))}
          {events.length === 0 && <div className="text-sm text-gray-500">No events recorded yet.</div>}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
