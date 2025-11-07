import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Replayer, unpack } from 'rrweb';

// Query flags: ?pp_heatmap_snapshot=1&type=click&device=desktop&session=<id>
// This overlay rebuilds a DOM snapshot from the most recent (or specified) session for the current page
// and draws aggregated heatmap points aligned to the snapshot's coordinate space.

interface HeatmapPoint { x: number; y: number; value: number }

type HeatmapType = 'click' | 'scroll' | 'hover' | 'mousemove';
type DeviceType = 'all' | 'desktop' | 'mobile' | 'tablet';

function getParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

function basePageURL(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('pp_heatmap_snapshot');
  url.searchParams.delete('type');
  url.searchParams.delete('device');
  url.searchParams.delete('session');
  return url.origin + url.pathname;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  left: 12,
  zIndex: 2147483646,
  background: 'rgba(17,24,39,0.92)',
  color: 'white',
  padding: '10px 14px',
  borderRadius: 12,
  fontSize: 12,
  fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
  maxWidth: 320,
};

const buttonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.25)',
  color: 'white',
  padding: '6px 10px',
  borderRadius: 8,
  cursor: 'pointer',
};

export default function HeatmapSnapshotOverlay() {
  const { user } = useAuth();
  const enabled = getParam('pp_heatmap_snapshot') === '1';
  if (!enabled) return null;
  if (user?.role !== 'admin') return null;

  const initialType = (getParam('type') as HeatmapType) || 'click';
  const initialDevice = (getParam('device') as DeviceType) || 'all';
  const chosenSession = getParam('session');

  const [heatmapType, setHeatmapType] = useState<HeatmapType>(initialType);
  const [deviceType, setDeviceType] = useState<DeviceType>(initialDevice);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(chosenSession);
  const [snapshotReady, setSnapshotReady] = useState(false);

  const replayerContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const replayerRef = useRef<Replayer | null>(null);

  const updateParam = (k: string, v: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(k, v);
    window.history.replaceState({}, '', url.toString());
  };

  const removeParamsAndClose = () => {
    const url = new URL(window.location.href);
    ['pp_heatmap_snapshot','type','device','session'].forEach(p => url.searchParams.delete(p));
    window.location.href = url.toString();
  };

  // Fetch a session's events (latest if none specified)
  const fetchSessionAndSnapshot = async () => {
    try {
      setLoading(true); 
      setError(null); 
      setSnapshotReady(false);
      
      const pageURL = basePageURL();
      const sessionParams: any = { pageURL, limit: sessionId ? 1 : 10 };
      if (sessionId) sessionParams.sessionId = sessionId;
      
      const resp = await api.get('/api/tracking/sessions', { params: sessionParams });
      const sessions = resp.data.sessions || [];
      
      if (!sessions.length) {
        throw new Error('No sessions found for this page');
      }
      
      let target = sessions[0];
      if (!sessionId) {
        target = sessions.find((s: any) => s.events && s.events.length) || sessions[0];
        setSessionId(target.sessionId);
        updateParam('session', target.sessionId);
      }
      
      if (!target.events || !target.events.length) {
        throw new Error('Session has no events to reconstruct DOM');
      }

      // Unpack events (support packed rrweb arrays)
      const events: any[] = [];
      target.events.forEach((raw: any) => {
        try {
          if (typeof raw === 'string') {
            const unpacked = unpack(raw);
            if (Array.isArray(unpacked)) {
              events.push(...unpacked);
            } else if (unpacked && typeof unpacked === 'object') {
              Object.keys(unpacked)
                .filter(k => !isNaN(Number(k)))
                .forEach(k => events.push((unpacked as any)[k]));
            }
          } else if (raw && typeof raw === 'object') {
            if (raw.type !== undefined) {
              events.push(raw);
            } else {
              Object.keys(raw)
                .filter(k => !isNaN(Number(k)))
                .forEach(k => events.push(raw[k]));
            }
          }
        } catch (e) { 
          console.warn('[HeatmapSnapshot] Failed to unpack event:', e);
        }
      });

      events.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));

      if (!events.length) {
        throw new Error('No valid events after unpacking');
      }

      if (replayerContainerRef.current) {
        if (replayerRef.current) { 
          try { 
            replayerRef.current.destroy(); 
          } catch (e) {
            console.warn('[HeatmapSnapshot] Error destroying replayer:', e);
          }
        }
        
        replayerRef.current = new Replayer(events, {
          root: replayerContainerRef.current,
          mouseTail: false,
          speed: 1,
          skipInactive: false,
          showWarning: false,
          showDebug: false,
        });
        
        replayerRef.current.pause(0);
        
        setTimeout(() => {
          setSnapshotReady(true);
          requestAnimationFrame(() => draw());
        }, 100);
      }
    } catch (e: any) {
      console.error('[HeatmapSnapshot] Error:', e);
      setError(e.message || 'Failed to reconstruct snapshot');
    } finally {
      setLoading(false);
    }
  };

  const fetchHeatmapPoints = async () => {
    try {
      const pageURL = basePageURL();
      const params: any = { pageURL, type: heatmapType };
      if (deviceType !== 'all') params.device = deviceType;
      // If we have a selected session restrict optionally if desired (for future filtering)
      const res = await api.get('/api/tracking/heatmap', { params });
      setPoints(res.data.heatmapData || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to fetch heatmap points');
    }
  };

  useEffect(() => { fetchSessionAndSnapshot(); }, [sessionId]);
  useEffect(() => { fetchHeatmapPoints(); }, [heatmapType, deviceType, sessionId]);

  // Draw heatmap aligned to replayer wrapper
  const draw = () => {
    const canvas = canvasRef.current; const container = replayerContainerRef.current;
    if (!canvas || !container || !snapshotReady) return;

    const wrapper = container.querySelector('.replayer-wrapper') as HTMLElement | null;
    const iframe = container.querySelector('iframe') as HTMLIFrameElement | null;
    if (!wrapper || !iframe) return;

    // Determine scaling used by rrweb (wrapper holds original dimensions)
    const naturalW = parseInt(iframe.getAttribute('width') || '1024');
    const naturalH = parseInt(iframe.getAttribute('height') || '768');
    const displayRect = wrapper.getBoundingClientRect();

    canvas.width = displayRect.width; canvas.height = displayRect.height;
    canvas.style.position = 'absolute';
    canvas.style.top = displayRect.top + 'px';
    canvas.style.left = displayRect.left + 'px';

    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (!points.length) return;

    // Scale factor from natural to displayed
    const scaleX = displayRect.width / naturalW;
    const scaleY = displayRect.height / naturalH;
    const maxVal = Math.max(...points.map(p => p.value || 1), 1);

    for (const p of points) {
      // Assuming raw points are recorded in natural pixel coords of viewport
      const x = p.x * scaleX;
      const y = p.y * scaleY;
      const norm = (p.value || 1) / maxVal;
      const radius = 50 * (1 + norm * 0.5);
      const alpha = norm * 0.6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      if (heatmapType === 'click') {
        g.addColorStop(0, `rgba(255,0,0,${alpha})`);
        g.addColorStop(0.5, `rgba(255,100,0,${alpha * 0.5})`);
        g.addColorStop(1, 'rgba(255,200,0,0)');
      } else if (heatmapType === 'scroll') {
        g.addColorStop(0, `rgba(0,100,255,${alpha})`);
        g.addColorStop(0.5, `rgba(0,200,255,${alpha * 0.5})`);
        g.addColorStop(1, 'rgba(100,255,255,0)');
      } else {
        g.addColorStop(0, `rgba(100,0,255,${alpha})`);
        g.addColorStop(0.5, `rgba(200,100,255,${alpha * 0.5})`);
        g.addColorStop(1, 'rgba(255,200,255,0)');
      }
      ctx.fillStyle = g;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  };

  useEffect(() => { draw(); }, [points, snapshotReady, heatmapType]);
  useEffect(() => {
    if (snapshotReady) {
      const onResize = () => {
        requestAnimationFrame(() => draw());
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
  }, [snapshotReady, points, heatmapType]);

  if (loading && !snapshotReady) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          width: 50,
          height: 50,
          border: '4px solid rgba(255,255,255,0.2)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ fontSize: 16 }}>Rebuilding DOM snapshot from session...</div>
        <style dangerouslySetInnerHTML={{
          __html: '@keyframes spin { to { transform: rotate(360deg); } }'
        }} />
      </div>
    );
  }

  return (
    <>
      <div ref={replayerContainerRef} style={{ position: 'fixed', inset: 0, zIndex: 2147483644, background: '#111' }} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2147483645, pointerEvents: 'none', mixBlendMode: 'multiply' }} />
      
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>🔥 Heatmap Snapshot</span>
          {snapshotReady && <span style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: '#10b981' 
          }} />}
        </div>
        
        {error && (
          <div style={{
            padding: 8,
            marginBottom: 8,
            background: '#fee',
            border: '1px solid #f88',
            borderRadius: 4,
            color: '#c00',
            fontSize: 12,
          }}>
            <span style={{ marginRight: 6 }}>⚠️</span>
            {error}
          </div>
        )}
        
        {sessionId && (
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
            Session: <code style={{ 
              background: '#f4f4f4', 
              padding: '2px 4px', 
              borderRadius: 3,
              fontFamily: 'monospace',
            }}>
              {sessionId.substring(0, 8)}...
            </code>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['click','hover','mousemove','scroll'] as const).map(t => (
              <button 
                key={t}
                style={{
                  ...buttonStyle,
                  background: heatmapType === t ? '#3b82f6' : '#fff',
                  color: heatmapType === t ? '#fff' : '#000',
                }}
                onClick={() => { 
                  setHeatmapType(t); 
                  updateParam('type', t);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all','desktop','mobile','tablet'] as const).map(d => (
              <button 
                key={d}
                style={{
                  ...buttonStyle,
                  background: deviceType === d ? '#10b981' : '#fff',
                  color: deviceType === d ? '#fff' : '#000',
                }}
                onClick={() => { 
                  setDeviceType(d); 
                  updateParam('device', d);
                }}
              >
                {d}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              style={{ ...buttonStyle, flex: 1 }}
              onClick={() => fetchSessionAndSnapshot()}
              disabled={loading}
            >
              Refresh
            </button>
            <button 
              style={{ ...buttonStyle, flex: 1 }}
              onClick={removeParamsAndClose}
            >
              Close
            </button>
          </div>
        </div>
        
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
          Page: {basePageURL()}
        </div>
      </div>
    </>
  );
}
