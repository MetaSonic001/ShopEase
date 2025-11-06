import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { Bug, RefreshCw } from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface ErrorGroupItem {
  fingerprint: string;
  name: string;
  message: string;
  normalizedStack: string;
  count: number;
  sessions: string[];
  pages: string[];
  firstSeen: string;
  lastSeen: string;
}

const ErrorGroups: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [pageURL, setPageURL] = useState<string>('');
  const [items, setItems] = useState<ErrorGroupItem[]>([]);

  const params = useMemo(() => {
    const p: any = {};
    if (from) p.from = new Date(from).toISOString();
    if (to) p.to = new Date(to).toISOString();
    if (pageURL) p.pageURL = pageURL;
    return p;
  }, [from, to, pageURL]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/analytics/errors/groups`, { params, withCredentials: true });
      setItems(res.data?.items || []);
    } catch (e: any) {
      console.error('Failed to load error groups', e);
      toast({ title: 'Failed to load errors', description: e?.message || 'Error fetching error groups' });
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
          <Bug className="w-6 h-6 text-rose-600" /> Error Groups
        </h1>
        <button
          onClick={fetchGroups}
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Message</th>
                <th className="py-2 pr-4">Count</th>
                <th className="py-2 pr-4">Sessions</th>
                <th className="py-2 pr-4">Pages</th>
                <th className="py-2 pr-4">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t align-top">
                  <td className="py-2 pr-4">
                    <div className="font-medium text-slate-900">{it.name || 'Error'}</div>
                    <div className="text-slate-700 break-words max-w-[560px]">{it.message}</div>
                    {it.normalizedStack && (
                      <pre className="mt-1 text-xs text-slate-500 whitespace-pre-wrap max-w-[560px] overflow-x-auto">{it.normalizedStack}</pre>
                    )}
                  </td>
                  <td className="py-2 pr-4">{it.count}</td>
                  <td className="py-2 pr-4 max-w-[220px] truncate" title={it.sessions.join(', ')}>{it.sessions.length}</td>
                  <td className="py-2 pr-4 max-w-[220px] truncate" title={it.pages.join(', ')}>{it.pages.length}</td>
                  <td className="py-2 pr-4">{new Date(it.lastSeen).toLocaleString()}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400">No errors in selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ErrorGroups;
