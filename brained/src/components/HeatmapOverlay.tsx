import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Minimal inline styles to avoid pulling extra UI deps
const panelStyles: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  zIndex: 2147483646,
  background: 'rgba(17,24,39,0.9)',
  color: 'white',
  borderRadius: 12,
  padding: '10px 12px',
  boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  fontSize: 12,
  maxWidth: 320,
  lineHeight: 1.4,
};

const chipStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 999,
  padding: '4px 8px',
};

const buttonStyles: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'white',
  padding: '6px 10px',
  borderRadius: 8,
  cursor: 'pointer',
};

const selectStyles: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'white',
  padding: '4px 8px',
  borderRadius: 6,
};

const sliderStyles: React.CSSProperties = {
  width: 120,
};

// Types
 type HeatmapType = 'click' | 'scroll' | 'hover' | 'mousemove';
 type DeviceType = 'all' | 'desktop' | 'mobile' | 'tablet';
 type HeatmapPoint = { x: number; y: number; value: number };

function useQueryParams() {
  const [params, setParams] = useState(() => new URLSearchParams(window.location.search));
  useEffect(() => {
    const handler = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', handler);
    window.addEventListener('pushstate', handler as any);
    window.addEventListener('replacestate', handler as any);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('pushstate', handler as any);
      window.removeEventListener('replacestate', handler as any);
    };
  }, []);
  return params;
}

function canonicalPageURL(): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('pp_heatmap');
    url.searchParams.delete('type');
    url.searchParams.delete('device');
    url.searchParams.delete('intensity');
    url.searchParams.delete('pp_debug');
    return url.origin + url.pathname; // omit other queries for aggregation stability
  } catch {
    return window.location.origin + window.location.pathname;
  }
}

export default function HeatmapOverlay() {
  const { user } = useAuth();
  const qp = useQueryParams();

  // Allow only admins to view overlay (avoid exposing to end users via query)
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) return null;

  const enabled = qp.get('pp_heatmap') === '1';
  if (!enabled) return null;

  const initialType = (qp.get('type') as HeatmapType) || 'click';
  const initialDevice = (qp.get('device') as DeviceType) || 'all';
  const initialIntensity = Math.min(1, Math.max(0.1, parseFloat(qp.get('intensity') || '0.6')));

  const [heatmapType, setHeatmapType] = useState<HeatmapType>(initialType);
  const [deviceType, setDeviceType] = useState<DeviceType>(initialDevice);
  const [intensity, setIntensity] = useState<number>(isNaN(initialIntensity) ? 0.6 : initialIntensity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const pageURL = useMemo(() => canonicalPageURL(), []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { pageURL, type: heatmapType };
      if (deviceType !== 'all') params.device = deviceType;
      const res = await api.get('/api/tracking/heatmap', { params });
      setPoints(res.data.heatmapData || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to fetch heatmap');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapType, deviceType, pageURL]);

  // Drawing
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    if (!points.length) return;
    const maxIntensity = Math.max(...points.map((p) => p.value || 1), 1);

    for (const p of points) {
      const x = p.x; // assuming absolute page coordinates from backend
      const y = p.y - scrollY; // convert document coords to viewport coords
      if (y < -120 || y > h + 120) continue; // skip far outside viewport for perf

      const normalized = (p.value || 1) / maxIntensity;
      const radius = 50 * (1 + normalized * 0.5);
      const alpha = normalized * intensity;

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

  const scheduleDraw = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    scheduleDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, intensity, heatmapType]);

  useEffect(() => {
    const onResize = () => scheduleDraw();
    const onScroll = () => scheduleDraw();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Update URL params when controls change (for shareability)
  const updateParam = (key: string, val: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, val);
    window.history.replaceState({}, '', url.toString());
  };

  const closeOverlay = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('pp_heatmap');
    url.searchParams.delete('type');
    url.searchParams.delete('device');
    url.searchParams.delete('intensity');
    window.history.replaceState({}, '', url.toString());
    // Soft-unmount by hiding component (it will return null on next render)
  };

  return (
    <>
      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 2147483645,
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Control panel */}
      <div style={panelStyles}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={chipStyles}>
            <span style={{ opacity: 0.8 }}>Heatmap</span>
            <strong>Live Overlay</strong>
          </div>
          <button style={{ ...buttonStyles, background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.35)' }} onClick={closeOverlay}>
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ opacity: 0.8 }}>Type</span>
            <select
              value={heatmapType}
              onChange={(e) => { setHeatmapType(e.target.value as HeatmapType); updateParam('type', e.target.value); }}
              style={selectStyles}
            >
              <option value="click">Click</option>
              <option value="hover">Hover</option>
              <option value="mousemove">Move</option>
              <option value="scroll">Scroll</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ opacity: 0.8 }}>Device</span>
            <select
              value={deviceType}
              onChange={(e) => { setDeviceType(e.target.value as DeviceType); updateParam('device', e.target.value); }}
              style={selectStyles}
            >
              <option value="all">All</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ opacity: 0.8 }}>Intensity</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={intensity}
              onChange={(e) => { const v = parseFloat(e.target.value); setIntensity(v); updateParam('intensity', String(v)); scheduleDraw(); }}
              style={sliderStyles as any}
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={fetchData} style={buttonStyles} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {error && <span style={{ color: '#fecaca' }}>{error}</span>}
          </div>
        </div>

        <div style={{ marginTop: 8, opacity: 0.7 }}>
          Viewing: <span style={{ opacity: 0.9 }}>{pageURL}</span>
        </div>
      </div>
    </>
  );
}
