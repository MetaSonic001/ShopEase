import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BarChart3, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface Bucket { label: string; value: number }

const AttentionMap: React.FC = () => {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [pageURL, setPageURL] = useState<string>('');
  const [attention, setAttention] = useState<Bucket[]>([]);
  const [scroll, setScroll] = useState<{ range: string; count: number; uniqueUsers: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => {
    const p: any = {};
    if (from) p.startDate = new Date(from).toISOString();
    if (to) p.endDate = new Date(to).toISOString();
    if (pageURL) p.pageURL = pageURL;
    return p;
  }, [from, to, pageURL]);

  const fetchAll = async () => {
    if (!pageURL) return; // require a page to avoid noisy results
    try {
      setLoading(true);
      const [attRes, scrollRes] = await Promise.all([
        axios.get(`${API_URL}/api/tracking/interactions/attention`, { params, withCredentials: true }),
        axios.get(`${API_URL}/api/tracking/interactions/scroll-depth`, { params, withCredentials: true }),
      ]);
      setAttention(attRes.data?.buckets || []);
      setScroll(scrollRes.data?.distribution || []);
    } catch (e) {
      console.error('Failed to fetch attention/scroll', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const end = new Date();
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    setFrom(start.toISOString().slice(0, 16));
    setTo(end.toISOString().slice(0, 16));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-600" /> Attention & Scroll Maps
        </h1>
        <button onClick={fetchAll} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="flex flex-col md:col-span-2">
          <label className="text-xs text-slate-500 mb-1">Page URL</label>
          <input className="border rounded-lg px-3 py-2" type="text" placeholder="https://site/page" value={pageURL} onChange={(e) => setPageURL(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">From</label>
          <input className="border rounded-lg px-3 py-2" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">To</label>
          <input className="border rounded-lg px-3 py-2" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-3">Attention by viewport (vh%)</h2>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={attention} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-3">Scroll Depth Distribution</h2>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={scroll.map(s => ({ label: String(s.range), value: s.count }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttentionMap;
