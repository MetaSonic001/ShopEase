import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, BarChart3, Flame, Link as LinkIcon, Target, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

type RageItem = {
  pageURL: string;
  selector: string;
  incidents: number;
  totalClicksInIncidents?: number;
  sessions: string[];
  firstSeen: string | Date;
  lastSeen: string | Date;
  sampleText?: string | null;
};

type DeadItem = {
  pageURL: string;
  selector: string;
  deadClicks: number;
  sessions: string[];
  firstSeen: string | Date;
  lastSeen: string | Date;
  sampleText?: string | null;
};

type ErrorGroup = {
  fingerprint: string;
  name: string;
  message: string;
  normalizedStack: string;
  count: number;
  sessions: string[];
  pages: string[];
  firstSeen: string | Date;
  lastSeen: string | Date;
};

const BehaviorAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [pageURL, setPageURL] = useState<string>('');
  const [rage, setRage] = useState<RageItem[]>([]);
  const [dead, setDead] = useState<DeadItem[]>([]);
  const [errors, setErrors] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const query = useMemo(() => {
    const q: any = {};
    if (from) q.startDate = new Date(from).toISOString();
    if (to) q.endDate = new Date(to).toISOString();
    if (pageURL) q.pageURL = pageURL;
    return q;
  }, [from, to, pageURL]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [rageRes, deadRes, errRes] = await Promise.all([
        axios.get(`${API_URL}/api/tracking/interactions/rage-clicks`, { params: { ...query, limit: 50 }, withCredentials: true }),
        axios.get(`${API_URL}/api/tracking/interactions/dead-clicks`, { params: { ...query, limit: 50 }, withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/errors/groups`, { params: { from: query.startDate, to: query.endDate, pageURL: query.pageURL, limit: 50 }, withCredentials: true }),
      ]);
      setRage(rageRes.data.items || []);
      setDead(deadRes.data.items || []);
      setErrors(errRes.data.items || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to fetch behavior analytics', description: 'Check server and try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showHeatmap = () => {
    try {
      // Prefer SDK overlay if present in current page (for demo pages using public/pagepulse.js)
      // This toggles overlay in the current admin page; for production, broadcast via sockets to client sites.
      (window as any).PagePulse?.showHeatmap?.();
      toast({ title: 'Heatmap overlay toggled', description: 'If the SDK is loaded on this page, the overlay will appear.' });
    } catch { /* noop */ }
  };

  const exportPDF = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    if (pageURL) params.set('pageURL', pageURL);
    const url = `${API_URL}/api/analytics/export/pdf?${params.toString()}`;
    window.open(url, '_blank');
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    if (pageURL) params.set('pageURL', pageURL);
    params.set('includeBehavior', 'true');
    const url = `${API_URL}/api/analytics/export/csv?${params.toString()}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" /> Behavior Analytics
        </h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200">Export CSV</button>
          <button onClick={exportPDF} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Export PDF</button>
          <button onClick={fetchAll} className="px-3 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">From</label>
          <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="w-full border rounded-md px-2 py-2"/>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">To</label>
          <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="w-full border rounded-md px-2 py-2"/>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Page URL (optional)</label>
          <input type="text" placeholder="/checkout" value={pageURL} onChange={e=>setPageURL(e.target.value)} className="w-full border rounded-md px-2 py-2"/>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={showHeatmap} className="px-3 py-2 text-sm rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-2">
          <Target className="w-4 h-4"/> Show Heatmap Overlay
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-red-600"/> Rage Clicks</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3">Selector</th>
                  <th className="py-2 pr-3">Incidents</th>
                  <th className="py-2 pr-3">Sessions</th>
                  <th className="py-2 pr-3">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {rage.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-slate-400">No rage clicks detected.</td></tr>
                )}
                {rage.map((r, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="py-2 pr-3 font-mono text-xs">{r.selector}</td>
                    <td className="py-2 pr-3">{r.incidents}</td>
                    <td className="py-2 pr-3">{r.sessions.length}</td>
                    <td className="py-2 pr-3">{new Date(r.lastSeen).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600"/> Dead Clicks</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3">Selector</th>
                  <th className="py-2 pr-3">Dead Clicks</th>
                  <th className="py-2 pr-3">Sessions</th>
                  <th className="py-2 pr-3">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {dead.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-slate-400">No dead clicks detected.</td></tr>
                )}
                {dead.map((d, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="py-2 pr-3 font-mono text-xs">{d.selector}</td>
                    <td className="py-2 pr-3">{d.deadClicks}</td>
                    <td className="py-2 pr-3">{d.sessions.length}</td>
                    <td className="py-2 pr-3">{new Date(d.lastSeen).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mt-6">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600"/> Error Groups</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-3">Message</th>
                <th className="py-2 pr-3">Count</th>
                <th className="py-2 pr-3">Sessions</th>
                <th className="py-2 pr-3">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {errors.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-slate-400">No errors detected.</td></tr>
              )}
              {errors.map((e, idx) => (
                <tr key={idx} className="border-b hover:bg-slate-50">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-slate-900 truncate max-w-[520px]" title={e.message}>{e.message}</div>
                    {e.normalizedStack && (
                      <pre className="text-xs text-slate-500 whitespace-pre-wrap max-w-[520px] overflow-hidden">{e.normalizedStack}</pre>
                    )}
                  </td>
                  <td className="py-2 pr-3">{e.count}</td>
                  <td className="py-2 pr-3">{e.sessions.length}</td>
                  <td className="py-2 pr-3">{new Date(e.lastSeen).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BehaviorAnalytics;
