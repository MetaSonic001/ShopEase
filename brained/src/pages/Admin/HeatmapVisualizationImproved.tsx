import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Replayer, unpack } from 'rrweb';
import {
  MousePointer2,
  ScrollText,
  Activity,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Video,
  TrendingUp,
  Search,
  Database,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface HeatmapPoint { x: number; y: number; value: number; }
interface AvailablePage { pageURL: string; sessionCount: number; heatmapTypes: Record<string, number>; hasData: boolean; }

 type HeatmapType = 'click' | 'scroll' | 'hover' | 'mousemove';
 type DeviceType = 'all' | 'desktop' | 'mobile' | 'tablet';

const HeatmapVisualizationImproved: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [availablePages, setAvailablePages] = useState<AvailablePage[]>([]);
  const [pageSearch, setPageSearch] = useState('');
  const [pageURL, setPageURL] = useState('');
  const [customURL, setCustomURL] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [heatmapType, setHeatmapType] = useState<HeatmapType>('click');
  const [deviceType, setDeviceType] = useState<DeviceType>('all');
  const [showOverlay, setShowOverlay] = useState(true);
  const [intensity, setIntensity] = useState([60]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [aggregatedMode, setAggregatedMode] = useState(false);
  const aggregatedContainerRef = useRef<HTMLDivElement>(null);
  const [aggregatedViewport, setAggregatedViewport] = useState<{ width: number; height: number } | null>(null);
  const [simpleMode, setSimpleMode] = useState(false);
  const [rawPoints, setRawPoints] = useState<Array<{ x: number; y: number; timestamp?: string | number }>>([]);
  // Demo fallback points (used when backend DB isn't available) — simple hotspots across the page
  const DEMO_POINTS = [
    { x: 200, y: 120 }, { x: 220, y: 140 }, { x: 210, y: 160 },
    { x: 600, y: 200 }, { x: 620, y: 220 }, { x: 580, y: 240 },
    { x: 400, y: 420 }, { x: 420, y: 430 }, { x: 380, y: 410 },
    { x: 1000, y: 150 }, { x: 1020, y: 160 }, { x: 980, y: 140 },
  ];
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);
  const [lastGeneratedURL, setLastGeneratedURL] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayerContainerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<any>(null);

  useEffect(() => { fetchAvailablePages(); }, []);

  const fetchAvailablePages = async () => {
    try {
      setLoadingPages(true);
      const res = await api.get('/api/tracking/sessions/pages/available');
      const pages = res.data.pages || [];
      setAvailablePages(pages);
      if (pages.length > 0 && !pageURL) setPageURL(pages[0].pageURL);
    } catch (e: any) {
      console.error('[Heatmap] Error fetching available pages:', e);
    } finally { setLoadingPages(false); }
  };

  const fetchSessionAndSnapshot = async (urlToUse?: string) => {
    const url = urlToUse || pageURL;
    try {
      setLoading(true); setError(null); setNoData(false); setSnapshotReady(false);
      // Try querying sessions using multiple common URL variants to handle seeded data inconsistencies
      const tryVariants = generateUrlVariants(url);
      let sessions: any[] = [];
      for (let i = 0; i < tryVariants.length; i++) {
        const v = tryVariants[i];
        try {
          // The server sessions list endpoint expects `urlContains` to filter by pagesVisited
          const sessionParams: any = { urlContains: v, limit: 10 };
          const resp = await api.get('/api/tracking/sessions', { params: sessionParams });
          sessions = resp.data.sessions || [];
          if (sessions.length) { 
            // prefer setting the pageURL to the canonical entryURL from availablePages if present
            const canonical = availablePages.find(p => p.pageURL && p.pageURL.includes(v));
            if (canonical) setPageURL(canonical.pageURL); else setPageURL(v);
            break; 
          }
        } catch (e) {
          console.warn('[Heatmap] variant fetch failed for', v, e);
        }
      }
      if (!sessions.length) {
        // No session recordings found — try aggregated heatmap fallback
        const agg = await fetchHeatmapDataFor(url);
        if (agg && agg.length) {
          setAggregatedMode(true);
          // prefer viewport from metadata if available
          const md = (agg as any).__metadata || null;
          if (md && md.viewport && md.viewport.width && md.viewport.height) {
            setAggregatedViewport({ width: md.viewport.width, height: md.viewport.height });
          } else if (md && md.metadata && md.metadata.viewport) {
            setAggregatedViewport(md.metadata.viewport);
          } else {
            setAggregatedViewport({ width: 1280, height: 768 });
          }
          setSnapshotReady(false);
          setNoData(false);
          // give React a tick to render container
          setTimeout(() => { drawHeatmap(); }, 80);
          return;
        }
        setNoData(true); return;
      }
      let target = sessions.find((s: any) => s.tags?.includes('heatmap-ready') && s.events?.length) ||
                   sessions.find((s: any) => s.events && s.events.length) || sessions[0];
      setSessionId(target.sessionId);
      if (!target.events || !target.events.length) { setNoData(true); return; }
      const events: any[] = [];
      target.events.forEach((raw: any) => {
        try {
          if (typeof raw === 'string') {
            const unpacked = unpack(raw);
            if (Array.isArray(unpacked)) events.push(...unpacked);
            else if (unpacked && typeof unpacked === 'object') {
              Object.keys(unpacked).filter(k => !isNaN(Number(k))).forEach(k => events.push((unpacked as any)[k]));
            }
          } else if (raw && typeof raw === 'object') {
            if (raw.type !== undefined) events.push(raw); else {
              Object.keys(raw).filter(k => !isNaN(Number(k))).forEach(k => events.push(raw[k]));
            }
          }
        } catch (e) { console.warn('[Heatmap] Failed to unpack event:', e); }
      });
      events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      if (!events.length) { setNoData(true); return; }
      if (replayerContainerRef.current) {
        if (replayerRef.current) { try { replayerRef.current.destroy(); } catch (e) { console.warn('[Heatmap] destroy error', e); } }
        replayerRef.current = new Replayer(events, { root: replayerContainerRef.current, mouseTail: false, speed: 1, skipInactive: false, showWarning: false, showDebug: false });
        replayerRef.current.pause(0);
        setTimeout(() => { setSnapshotReady(true); drawHeatmap(); }, 150);
      }
    } catch (e: any) {
      console.error('[Heatmap] Error:', e); setError(e.response?.data?.message || e.message || 'Failed to load heatmap data');
    } finally { setLoading(false); }
  };

  // Fetch heatmap data for a given URL and return points (and attach metadata on return object)
  const fetchHeatmapDataFor = async (url?: string) => {
    try {
      const params: any = { pageURL: url, type: heatmapType };
      if (deviceType !== 'all') params.device = deviceType;
      const res = await api.get('/api/tracking/heatmap', { params });
      const pts = res.data.heatmapData || [];
      // attach metadata for viewport etc so caller can read
      (pts as any).__metadata = res.data.metadata || res.data || null;
      setHeatmapData(pts as HeatmapPoint[]);
      return pts as any[];
    } catch (e: any) { console.error('[Heatmap] Failed to fetch heatmap data for fallback:', e); return []; }
  };

  // Fetch raw interaction points (fast aggregate mode)
  const fetchRawInteractions = async (url?: string, limit = 2000) => {
    try {
      const params: any = { pageURL: url, type: heatmapType, limit };
      const res = await api.get('/api/tracking/heatmap/raw', { params });
      const pts = res.data.points || [];
      setRawPoints(pts.map((p: any) => ({ x: p.x, y: p.y, timestamp: p.timestamp })));
      return pts;
    } catch (e: any) { console.error('[Heatmap] Failed to fetch raw interactions:', e); setRawPoints([]); return []; }
  };

  // Generate reasonable URL variants to handle different stored forms
  function generateUrlVariants(raw?: string) {
    const out: string[] = [];
    if (!raw) return out;
    try {
      const u = raw.trim();
      // raw as-is
      out.push(u);
      // ensure trailing slash/no-trailing
      if (u.endsWith('/')) out.push(u.replace(/\/+$/, '')); else out.push(u + '/');
      // try without protocol
      out.push(u.replace(/^https?:\/\//, ''));
      // try with http and https prefixed
      if (!/^https?:\/\//.test(u)) { out.push('http://' + u); out.push('https://' + u); }
      // try path-only (leading slash)
      const path = u.replace(/^https?:\/\/(?:[^/]+)(.*)$/, '$1');
      if (path && path !== u) out.push(path.startsWith('/') ? path : '/' + path);
      // unique
      return Array.from(new Set(out)).filter(Boolean);
    } catch (e) { return [raw]; }
  }

  const fetchHeatmapData = async () => {
    try {
      const params: any = { pageURL, type: heatmapType }; if (deviceType !== 'all') params.device = deviceType;
      const res = await api.get('/api/tracking/heatmap', { params });
      setHeatmapData(res.data.heatmapData || []);
    } catch (e: any) { console.error('[Heatmap] Failed to fetch heatmap data:', e); }
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    // aggregated mode uses aggregatedContainerRef, otherwise use replayer container
    const container = aggregatedMode ? aggregatedContainerRef.current : replayerContainerRef.current;
    if (!canvas || !container) return;
    const wrapper = container.querySelector('.replayer-wrapper') as HTMLElement | null || container as HTMLElement;
    const iframe = container.querySelector('iframe') as HTMLIFrameElement | null;
    // In aggregated mode there may be no iframe. We can still render using aggregatedViewport or wrapper size
    if (!wrapper) return;
    // Try to obtain natural (original) dimensions of the snapshot iframe. Fall back to wrapper size when not available
    let naturalW = 0; let naturalH = 0;
    if (iframe) {
      naturalW = parseInt(iframe.getAttribute('width') || '0');
      naturalH = parseInt(iframe.getAttribute('height') || '0');
      if (!naturalW || !naturalH) {
        try {
          const doc = iframe.contentWindow?.document;
          if (doc) {
            naturalW = doc.documentElement.scrollWidth || doc.documentElement.clientWidth || wrapper.clientWidth;
            naturalH = doc.documentElement.scrollHeight || doc.documentElement.clientHeight || wrapper.clientHeight;
          }
        } catch (e) { /* cross-origin or not ready */ }
      }
    }
    // If aggregated mode, prefer aggregatedViewport if provided
    if (aggregatedMode && aggregatedViewport) {
      naturalW = aggregatedViewport.width || naturalW;
      naturalH = aggregatedViewport.height || naturalH;
    }
    if (!naturalW) naturalW = Math.max(1024, wrapper.clientWidth);
    if (!naturalH) naturalH = Math.max(768, wrapper.clientHeight);
    const displayRect = wrapper.getBoundingClientRect();
    canvas.width = displayRect.width; canvas.height = displayRect.height;
    canvas.style.position = 'absolute'; canvas.style.top = displayRect.top + 'px'; canvas.style.left = displayRect.left + 'px';
    const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height); if (!heatmapData.length || !showOverlay) return;
    const scaleX = displayRect.width / naturalW; const scaleY = displayRect.height / naturalH;
    const maxVal = Math.max(...heatmapData.map(p => p.value || 1), 1); const intensityValue = intensity[0] / 100;
    for (const p of heatmapData) {
      const x = p.x * scaleX; const y = p.y * scaleY; const norm = (p.value || 1) / maxVal; const radius = 50 * (1 + norm * 0.5); const alpha = norm * intensityValue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      if (heatmapType === 'click') { g.addColorStop(0, `rgba(255,0,0,${alpha})`); g.addColorStop(0.5, `rgba(255,100,0,${alpha * 0.5})`); g.addColorStop(1, 'rgba(255,200,0,0)'); }
      else if (heatmapType === 'scroll') { g.addColorStop(0, `rgba(0,100,255,${alpha})`); g.addColorStop(0.5, `rgba(0,200,255,${alpha * 0.5})`); g.addColorStop(1, 'rgba(100,255,255,0)'); }
      else { g.addColorStop(0, `rgba(100,0,255,${alpha})`); g.addColorStop(0.5, `rgba(200,100,255,${alpha * 0.5})`); g.addColorStop(1, 'rgba(255,200,255,0)'); }
      ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  };

  // Simple aggregate heatmap renderer (fast, uses rawPoints)
  const drawSimpleAggregateHeatmap = () => {
    const canvas = canvasRef.current;
    const container = aggregatedMode ? aggregatedContainerRef.current : replayerContainerRef.current;
    if (!canvas || !container) return;
    const wrapper = container.querySelector('.replayer-wrapper') as HTMLElement | null || container as HTMLElement;
    if (!wrapper) return;
    const displayRect = wrapper.getBoundingClientRect();
    const w = Math.max(200, Math.round(displayRect.width));
    const h = Math.max(200, Math.round(displayRect.height));
    canvas.width = w; canvas.height = h;
    canvas.style.position = 'absolute'; canvas.style.top = '0px'; canvas.style.left = '0px';

    const ctx = canvas.getContext('2d'); if (!ctx) return;
    // Offscreen accumulation canvas
    const acc = document.createElement('canvas'); acc.width = w; acc.height = h;
    const aCtx = acc.getContext('2d'); if (!aCtx) return;
    aCtx.clearRect(0, 0, w, h);
    aCtx.globalCompositeOperation = 'lighter';

    // Determine scale: raw points are expected to be in viewport coordinates - try to normalize to display
    const naturalW = (aggregatedViewport && aggregatedViewport.width) ? aggregatedViewport.width : Math.max(1024, w);
    const naturalH = (aggregatedViewport && aggregatedViewport.height) ? aggregatedViewport.height : Math.max(768, h);
    const scaleX = w / naturalW; const scaleY = h / naturalH;

    // draw splats
    const maxRad = Math.max(20, Math.min(w, h) * 0.06);
    for (const p of rawPoints) {
      const x = (p.x || 0) * scaleX; const y = (p.y || 0) * scaleY;
      const grad = aCtx.createRadialGradient(x, y, 0, x, y, maxRad);
      grad.addColorStop(0, 'rgba(255,255,255,0.35)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      aCtx.fillStyle = grad;
      aCtx.fillRect(x - maxRad, y - maxRad, maxRad * 2, maxRad * 2);
    }

    // Colorize: sample alpha and map to gradient
    const src = aCtx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);
    // gradient stops (from cold to hot)
    const palette = [ [0, 36, 100], [0,136,255], [255,165,0], [255,0,0] ]; // blue->cyan->orange->red
    for (let i = 0; i < src.data.length; i += 4) {
      const alpha = src.data[i+3] / 255; // 0..1
      if (alpha <= 0.001) { dst.data[i] = dst.data[i+1] = dst.data[i+2] = dst.data[i+3] = 0; continue; }
      // map alpha to palette index
      const t = Math.min(1, alpha * 1.8);
      const idx = Math.floor(t * (palette.length - 1));
      const frac = (t * (palette.length - 1)) - idx;
      const c1 = palette[idx]; const c2 = palette[Math.min(palette.length-1, idx+1)];
      const r = Math.round(c1[0] + (c2[0]-c1[0])*frac);
      const g = Math.round(c1[1] + (c2[1]-c1[1])*frac);
      const b = Math.round(c1[2] + (c2[2]-c1[2])*frac);
      dst.data[i] = r; dst.data[i+1] = g; dst.data[i+2] = b; dst.data[i+3] = Math.round(Math.min(255, alpha * 255 * 1.2));
    }
    ctx.putImageData(dst, 0, 0);
  };

  useEffect(() => { if (pageURL && !showCustomInput) fetchHeatmapData(); }, [heatmapType, deviceType, pageURL]);
  useEffect(() => { if (snapshotReady && heatmapData.length > 0) drawHeatmap(); }, [heatmapData, intensity, showOverlay, snapshotReady]);
  useEffect(() => { if (snapshotReady) { const r = () => requestAnimationFrame(drawHeatmap); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); } }, [snapshotReady, heatmapData, intensity, showOverlay]);

  const handleGenerate = () => {
    const urlToUse = showCustomInput ? customURL : pageURL;
    if (urlToUse) {
      // Try to fetch raw interactions for simple mode first if enabled
      if (simpleMode) {
        fetchRawInteractions(urlToUse).then((pts) => {
          if (pts && pts.length) {
            setAggregatedMode(false);
            setSnapshotReady(false);
            // give React a tick then draw
            setTimeout(() => drawSimpleAggregateHeatmap(), 60);
          } else {
            // fallback to normal session/snapshot flow
            fetchSessionAndSnapshot(urlToUse);
          }
        }).catch((err) => {
          console.warn('[Heatmap] raw fetch failed, falling back to demo points', err);
          // If backend DB isn't available (e.g., Mongo not running), show demo heatmap so UI is usable
          setRawPoints(DEMO_POINTS as any);
          setAggregatedMode(true);
          setSnapshotReady(false);
          setTimeout(() => drawSimpleAggregateHeatmap(), 80);
        });
      } else {
        fetchSessionAndSnapshot(urlToUse);
      }
      if (showCustomInput) setPageURL(urlToUse);
      setLastGeneratedURL(urlToUse);
    }
  };

  const handlePageSelect = (value: string) => {
    if (value === 'custom') { setShowCustomInput(true); setPageURL(''); setSnapshotReady(false); setHeatmapData([]); }
    else { setShowCustomInput(false); setPageURL(value); }
  };

  const selectedPage = availablePages.find(p => p.pageURL === pageURL);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Heatmaps</h1>
            <p className="text-sm text-slate-600 mt-1">Interactive heatmap visualization — clicks, moves and scroll attention for your pages.</p>
          </div>
          <div className="text-xs text-slate-500">Preview mode · Simple aggregate available</div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 items-start">
        <aside className="col-span-12 md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Controls</CardTitle>
              <CardDescription className="text-xs">Select page, type and options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Page</Label>
                  <Input value={pageSearch ? pageSearch : (pageURL || '')} onChange={e => setPageSearch(e.target.value)} placeholder="Search or paste URL" className="w-full" />
                  <div className="mt-2">
                    <Select value={showCustomInput ? 'custom' : pageURL} onValueChange={handlePageSelect}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Choose a page..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom URL</SelectItem>
                        {availablePages.slice(0, 30).map(p => (
                          <SelectItem key={p.pageURL} value={p.pageURL}>{p.pageURL}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Heatmap Type</Label>
                  <div className="flex gap-2 mt-2">
                    {(['click', 'hover', 'mousemove', 'scroll'] as HeatmapType[]).map(t => (
                      <Button key={t} size="sm" variant={heatmapType === t ? 'default' : 'outline'} onClick={() => setHeatmapType(t)}>{t}</Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Device</Label>
                  <div className="flex gap-2 mt-2">
                    {(['all', 'desktop', 'mobile', 'tablet'] as DeviceType[]).map(d => (
                      <Button key={d} size="sm" variant={deviceType === d ? 'default' : 'outline'} onClick={() => setDeviceType(d)}>{d}</Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Intensity</Label>
                  <div className="mt-2"><Slider value={intensity} onValueChange={setIntensity} min={10} max={100} step={10} /></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleGenerate} className="w-full sm:flex-1" size="lg"><RefreshCw className="w-4 h-4 mr-2" /> Generate</Button>
                  <Button size="lg" className="w-full sm:w-auto" variant={simpleMode ? 'default' : 'outline'} onClick={() => setSimpleMode(!simpleMode)}>{simpleMode ? 'Simple ON' : 'Simple'}</Button>
                </div>

                <div className="text-xs text-slate-500">Tip: Use Simple mode when you want a fast density preview without session replay.</div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4 hidden md:block">
            <CardHeader>
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Hot</span><div className="w-24 h-3 rounded bg-gradient-to-r from-orange-400 via-yellow-300 to-red-600" /></div>
                <div className="text-xs text-slate-500">Red = most interactions, Blue = fewer</div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="col-span-12 md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription className="text-xs">Live preview of replay or aggregated heatmap</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-white rounded border overflow-hidden min-h-[320px] md:min-h-[520px]" >
                {/* Replayer / Aggregated container */}
                <div ref={replayerContainerRef} className="absolute inset-0" />
                <div ref={aggregatedContainerRef} className="absolute inset-0" />
                <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'multiply' }} />

                {/* Empty / helpful states */}
                {noData && (<div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><h3 className="text-lg font-semibold">No Data</h3><p className="text-sm text-slate-500">No sessions or aggregated data found for this page.</p></div></div>)}
                {loading && (<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-slate-600" /></div>)}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default HeatmapVisualizationImproved;
