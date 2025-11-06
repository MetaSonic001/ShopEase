import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { Target, AlertTriangle, MousePointer2, RefreshCw } from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface RageItem {
  pageURL: string;
  selector: string;
  incidents: number;
  totalClicksInIncidents: number;
  sessions: string[];
  firstSeen: string;
  lastSeen: string;
  samplePosition?: { x: number; y: number };
  sampleText?: string | null;
}

interface DeadItem {
  pageURL: string;
  selector: string;
  deadClicks: number;
  sessions: string[];
  firstSeen: string;
  lastSeen: string;
  sampleText?: string | null;
}

const RageDeadClicks: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [pageURL, setPageURL] = useState<string>('');
  const [rage, setRage] = useState<RageItem[]>([]);
  const [dead, setDead] = useState<DeadItem[]>([]);

  const rangeParams = useMemo(() => {
    const params: any = {};
    if (from) params.startDate = new Date(from).toISOString();
    if (to) params.endDate = new Date(to).toISOString();
    if (pageURL) params.pageURL = pageURL;
    return params;
  }, [from, to, pageURL]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [rageRes, deadRes] = await Promise.all([
        axios.get(`${API_URL}/api/tracking/interactions/rage-clicks`, { params: { ...rangeParams }, withCredentials: true }),
        axios.get(`${API_URL}/api/tracking/interactions/dead-clicks`, { params: { ...rangeParams }, withCredentials: true }),
      ]);
      setRage(rageRes.data?.items || []);
      setDead(deadRes.data?.items || []);
    } catch (e: any) {
      console.error('Failed to fetch quality metrics', e);
      toast({ title: 'Failed to load', description: e?.message || 'Error fetching rage/dead clicks' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // default: last 24 hours
    const end = new Date();
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
    setFrom(start.toISOString().slice(0, 16));
    setTo(end.toISOString().slice(0, 16));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-600" /> Rage & Dead Clicks
        </h1>
        <button
          onClick={fetchAll}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">From</label>
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">To</label>
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-2" />
        </div>
        <div className="flex flex-col md:col-span-2">
          <label className="text-xs text-slate-500 mb-1">Filter by Page URL (optional)</label>
          <input type="text" placeholder="/path or https://..." value={pageURL} onChange={(e) => setPageURL(e.target.value)} className="border rounded-lg px-3 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rage Clicks */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2"><MousePointer2 className="w-5 h-5 text-red-600" /> Rage Clicks</h2>
            <span className="text-sm text-slate-500">{rage.length} spots</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Selector</th>
                  <th className="py-2 pr-4">Incidents</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">Page</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rage.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2 pr-4 font-mono text-xs break-all">{r.selector}</td>
                    <td className="py-2 pr-4">{r.incidents}</td>
                    <td className="py-2 pr-4">{r.totalClicksInIncidents}</td>
                    <td className="py-2 pr-4 max-w-[260px] truncate" title={r.pageURL}>{r.pageURL}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200"
                          onClick={() => {
                            navigator.clipboard.writeText(r.selector).then(() => toast({ title: 'Selector copied' }));
                          }}
                        >Copy selector</button>
                        <button
                          className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-1"
                          onClick={() => {
                            // Attempt to show heatmap overlay on current page if SDK present
                            const anyWin = window as any;
                            if (anyWin.PagePulse?.showHeatmap) {
                              anyWin.PagePulse.showHeatmap({ pageURL: r.pageURL, eventType: 'click' });
                              toast({ title: 'Heatmap overlay', description: 'If this is the target page with SDK loaded, overlay should appear.' });
                            } else {
                              toast({ title: 'SDK not detected', description: 'Open the target page with PagePulse SDK to view overlay.' });
                            }
                          }}
                        ><Target className="w-3 h-3" /> Heatmap</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rage.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-400">No rage clicks detected in range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dead Clicks */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" /> Dead Clicks</h2>
            <span className="text-sm text-slate-500">{dead.length} spots</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Selector</th>
                  <th className="py-2 pr-4">Dead Clicks</th>
                  <th className="py-2 pr-4">Page</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dead.map((d, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2 pr-4 font-mono text-xs break-all">{d.selector}</td>
                    <td className="py-2 pr-4">{d.deadClicks}</td>
                    <td className="py-2 pr-4 max-w-[260px] truncate" title={d.pageURL}>{d.pageURL}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200"
                          onClick={() => {
                            navigator.clipboard.writeText(d.selector).then(() => toast({ title: 'Selector copied' }));
                          }}
                        >Copy selector</button>
                        <button
                          className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-1"
                          onClick={() => {
                            const anyWin = window as any;
                            if (anyWin.PagePulse?.showHeatmap) {
                              anyWin.PagePulse.showHeatmap({ pageURL: d.pageURL, eventType: 'click' });
                              toast({ title: 'Heatmap overlay', description: 'If this is the target page with SDK loaded, overlay should appear.' });
                            } else {
                              toast({ title: 'SDK not detected', description: 'Open the target page with PagePulse SDK to view overlay.' });
                            }
                          }}
                        ><Target className="w-3 h-3" /> Heatmap</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dead.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-400">No dead clicks detected in range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RageDeadClicks;
