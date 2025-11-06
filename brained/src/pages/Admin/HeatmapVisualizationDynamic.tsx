import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Replayer, unpack } from 'rrweb';
import {
  MousePointer2,
  ScrollText,
  Activity,
  Users,
  Target,
  TrendingUp,
  Filter,
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
  AlertCircle,
  Layers,
  CheckCircle2,
  Calendar,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
}

interface HeatmapMetadata {
  totalInteractions: number;
  uniqueUsers: number;
  sessionCount?: number;
  lastUpdated?: Date;
}

interface SessionInfo {
  sessionId: string;
  userId?: string;
  userName?: string;
  startTime: Date;
  duration?: number;
  pageURL: string;
  device?: {
    type?: string;
    browser?: string;
    os?: string;
  };
}

type HeatmapType = 'click' | 'scroll' | 'hover' | 'mousemove';
type DeviceType = 'all' | 'desktop' | 'mobile' | 'tablet';
type FilterMode = 'all' | 'single' | 'custom' | 'dateRange';

const HeatmapVisualizationDynamic: React.FC = () => {
  // Core state
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [metadata, setMetadata] = useState<HeatmapMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [pageURL, setPageURL] = useState('/products');
  const [heatmapType, setHeatmapType] = useState<HeatmapType>('click');
  const [deviceType, setDeviceType] = useState<DeviceType>('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Display state
  const [showOverlay, setShowOverlay] = useState(true);
  const [intensity, setIntensity] = useState(0.6);
  const [domReady, setDomReady] = useState(false);
  
  // Available sessions for filtering
  const [availableSessions, setAvailableSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerContainerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<Replayer | null>(null);

  // Fetch available sessions for the page
  useEffect(() => {
    if (pageURL && filterMode !== 'all') {
      fetchAvailableSessions();
    }
  }, [pageURL, filterMode]);

  // Draw heatmap when data changes
  useEffect(() => {
    if (heatmapData.length > 0 && domReady) {
      drawHeatmap();
    }
  }, [heatmapData, intensity, showOverlay, domReady]);

  // Auto-fetch on mount
  useEffect(() => {
    if (pageURL) {
      fetchHeatmapData();
    }
  }, []);

  const fetchAvailableSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await axios.get(`${API_URL}/api/tracking/sessions`, {
        params: { pageURL, limit: 50 },
        withCredentials: true,
      });
      
      const sessions = response.data.sessions || [];
      setAvailableSessions(sessions);
    } catch (err: any) {
      console.error('[Heatmap] Failed to fetch sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const unpackEvents = (events: any[]): any[] => {
    const allEvents: any[] = [];
    
    events.forEach((event: any) => {
      if (typeof event === 'string') {
        // Packed string format
        try {
          const unpacked = unpack(event);
          if (unpacked && typeof unpacked === 'object' && !Array.isArray(unpacked)) {
            const unpackedEvents = Object.keys(unpacked)
              .filter(key => !isNaN(Number(key)))
              .map(key => (unpacked as any)[key])
              .filter(e => e && typeof e === 'object');
            allEvents.push(...unpackedEvents);
          } else if (Array.isArray(unpacked)) {
            allEvents.push(...unpacked);
          }
        } catch (err) {
          console.error('[Heatmap] Failed to unpack event:', err);
        }
      } else if (event.v && typeof event === 'object') {
        // Old packed format
        const unpackedEvents = Object.keys(event)
          .filter(key => !isNaN(Number(key)))
          .map(key => event[key])
          .filter(e => e && typeof e === 'object');
        allEvents.push(...unpackedEvents);
      } else if (event.type !== undefined) {
        // Already unpacked
        allEvents.push(event);
      }
    });
    
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  };

  const fetchPageDOMSnapshot = async (url: string) => {
    try {
      console.log('[Heatmap] Fetching DOM snapshot for:', url);
      setDomReady(false);
      
      // Get the most recent session for this page to extract DOM snapshot
      const params: any = { pageURL: url, limit: 1 };
      
      // If single session mode, use that specific session
      if (filterMode === 'single' && selectedSessions.length > 0) {
        params.sessionId = selectedSessions[0];
      }
      
      const response = await axios.get(`${API_URL}/api/tracking/sessions`, {
        params,
        withCredentials: true,
      });
      
      const sessions = response.data.sessions || [];
      if (sessions.length === 0) {
        console.warn('[Heatmap] No sessions found for page:', url);
        setError('No session recordings found for this page');
        return;
      }
      
      const session = sessions[0];
      console.log('[Heatmap] Using session:', session.sessionId, 'Events:', session.events?.length);
      
      if (!session.events || session.events.length === 0) {
        setError('Session has no recorded events');
        return;
      }
      
      // Unpack and find snapshot
      const events = unpackEvents(session.events);
      console.log('[Heatmap] Unpacked events:', events.length);
      
      // Find full snapshot (type 2) or meta (type 4) with snapshot
      const snapshot = events.find((e: any) => e.type === 2 || (e.type === 4 && e.data?.href));
      
      if (!snapshot) {
        console.error('[Heatmap] No snapshot found in events');
        setError('No DOM snapshot found in session recording');
        return;
      }
      
      console.log('[Heatmap] Found snapshot, initializing replayer');
      
      // Initialize rrweb Replayer in frozen mode (just show the snapshot)
      if (replayerContainerRef.current) {
        // Destroy previous replayer
        if (replayerRef.current) {
          try {
            replayerRef.current.destroy();
          } catch (e) {
            console.error('[Heatmap] Error destroying previous replayer:', e);
          }
        }
        
        // Create new replayer with snapshot
        const replayer = new Replayer(events, {
          root: replayerContainerRef.current,
          speed: 1,
          skipInactive: false,
          showWarning: false,
          showDebug: false,
          mouseTail: false, // Disable mouse trail for static view
        });
        
        // Pause at first frame to show as static page
        replayer.pause(0);
        
        replayerRef.current = replayer;
        setDomReady(true);
        setError(null);
        
        console.log('[Heatmap] Replayer initialized and paused at frame 0');
        
        // Apply scaling after a short delay
        setTimeout(() => {
          applyReplayerScaling();
        }, 100);
      }
    } catch (err: any) {
      console.error('[Heatmap] Error fetching DOM snapshot:', err);
      setError(err.response?.data?.message || 'Failed to load page DOM');
    }
  };

  const applyReplayerScaling = () => {
    if (!replayerContainerRef.current) return;
    
    const wrapper = replayerContainerRef.current.querySelector('.replayer-wrapper') as HTMLElement;
    const iframe = replayerContainerRef.current.querySelector('iframe') as HTMLElement;
    
    if (wrapper && iframe) {
      const container = replayerContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      const iframeWidth = parseInt(iframe.getAttribute('width') || '1024');
      const iframeHeight = parseInt(iframe.getAttribute('height') || '768');
      
      const scaleX = containerWidth / iframeWidth;
      const scaleY = containerHeight / iframeHeight;
      const scale = Math.min(scaleX, scaleY);
      
      wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
      wrapper.style.transformOrigin = 'center center';
      wrapper.style.position = 'absolute';
      wrapper.style.top = '50%';
      wrapper.style.left = '50%';
      wrapper.style.width = `${iframeWidth}px`;
      wrapper.style.height = `${iframeHeight}px`;
      
      console.log('[Heatmap] Applied scaling:', scale);
    }
  };

  const fetchHeatmapData = async () => {
    if (!pageURL) {
      alert('Please enter a page URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        pageURL: pageURL.startsWith('http') ? pageURL : `${window.location.origin}${pageURL}`,
        type: heatmapType,
      };
      
      if (deviceType !== 'all') {
        params.device = deviceType;
      }
      
      // Apply session filtering
      if (filterMode === 'single' && selectedSessions.length > 0) {
        params.sessionId = selectedSessions[0];
      } else if (filterMode === 'custom' && selectedSessions.length > 0) {
        params.sessionIds = selectedSessions.join(',');
      } else if (filterMode === 'dateRange') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const [heatmapResponse] = await Promise.all([
        axios.get(`${API_URL}/api/tracking/heatmap`, {
          params,
          withCredentials: true,
        }),
        fetchPageDOMSnapshot(pageURL),
      ]);

      setHeatmapData(heatmapResponse.data.heatmapData || []);
      setMetadata(heatmapResponse.data.metadata || null);
      
      console.log('[Heatmap] Loaded heatmap data:', heatmapResponse.data.heatmapData?.length, 'points');
    } catch (err: any) {
      console.error('[Heatmap] Failed to fetch heatmap data', err);
      setError(err.response?.data?.message || 'Failed to fetch heatmap data');
    } finally {
      setLoading(false);
    }
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    const replayerContainer = replayerContainerRef.current;
    
    if (!canvas || heatmapData.length === 0 || !replayerContainer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to replayer container
    canvas.width = replayerContainer.clientWidth;
    canvas.height = replayerContainer.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlay) return;

    // Calculate max value for normalization
    const maxIntensity = Math.max(...heatmapData.map(p => p.value || 1));

    // Draw each point
    heatmapData.forEach(point => {
      const x = point.x;
      const y = point.y;
      const normalizedIntensity = (point.value || 1) / maxIntensity;

      // Dynamic radius based on intensity
      const radius = 50 * (1 + normalizedIntensity * 0.5);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      // Color based on heatmap type
      const alpha = normalizedIntensity * intensity;
      if (heatmapType === 'click') {
        gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
      } else if (heatmapType === 'scroll') {
        gradient.addColorStop(0, `rgba(0, 100, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(0, 200, 255, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(100, 255, 255, 0)');
      } else {
        gradient.addColorStop(0, `rgba(100, 0, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(200, 100, 255, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 200, 255, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
  };

  const exportHeatmap = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `heatmap-${heatmapType}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const getHeatmapIcon = () => {
    switch (heatmapType) {
      case 'click':
        return <MousePointer2 className="w-5 h-5" />;
      case 'scroll':
        return <ScrollText className="w-5 h-5" />;
      case 'hover':
      case 'mousemove':
        return <Activity className="w-5 h-5" />;
    }
  };

  const getHeatmapColor = () => {
    switch (heatmapType) {
      case 'click':
        return 'from-red-500 to-orange-500';
      case 'scroll':
        return 'from-blue-500 to-cyan-500';
      case 'hover':
      case 'mousemove':
        return 'from-purple-500 to-pink-500';
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions(prev => {
      if (filterMode === 'single') {
        return [sessionId];
      } else {
        return prev.includes(sessionId)
          ? prev.filter(id => id !== sessionId)
          : [...prev, sessionId];
      }
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Layers className="w-8 h-8 text-blue-600" />
                Dynamic Heatmap Visualization
              </h1>
              <p className="text-slate-600 mt-1">
                View user interactions overlaid on actual page DOM (PostHog/Hotjar style)
              </p>
            </div>
            <Button onClick={exportHeatmap} variant="outline" disabled={heatmapData.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export PNG
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-slate-50 rounded-xl p-6 space-y-4">
            {/* Page URL */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Page URL
                </label>
                <input
                  type="text"
                  value={pageURL}
                  onChange={(e) => setPageURL(e.target.value)}
                  placeholder="e.g., /products, /cart, /checkout"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchHeatmapData}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Filter className="w-4 h-4 mr-2" />
                      Generate Heatmap
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Heatmap Type & Device Filter */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Type:</label>
                {(['click', 'scroll', 'hover', 'mousemove'] as HeatmapType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setHeatmapType(type)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
                      heatmapType === type
                        ? `bg-gradient-to-r ${getHeatmapColor()} text-white shadow-lg`
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'click' && <MousePointer2 className="w-4 h-4" />}
                    {type === 'scroll' && <ScrollText className="w-4 h-4" />}
                    {type === 'hover' && <Activity className="w-4 h-4" />}
                    {type === 'mousemove' && <Activity className="w-4 h-4" />}
                    {type === 'mousemove' ? 'Move' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <Separator orientation="vertical" className="h-8" />

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Device:</label>
                {(['all', 'desktop', 'mobile', 'tablet'] as DeviceType[]).map((device) => (
                  <button
                    key={device}
                    onClick={() => setDeviceType(device)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      deviceType === device
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {device === 'desktop' && <Monitor className="w-4 h-4 inline mr-1" />}
                    {device === 'mobile' && <Smartphone className="w-4 h-4 inline mr-1" />}
                    {device === 'tablet' && <Tablet className="w-4 h-4 inline mr-1" />}
                    {device.charAt(0).toUpperCase() + device.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Filtering */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-700">Filter Mode:</label>
                <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions (Aggregated)</SelectItem>
                    <SelectItem value="single">Single Session</SelectItem>
                    <SelectItem value="custom">Multiple Sessions</SelectItem>
                    <SelectItem value="dateRange">Date Range</SelectItem>
                  </SelectContent>
                </Select>

                {filterMode !== 'all' && filterMode !== 'dateRange' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAvailableSessions}
                    disabled={sessionsLoading}
                  >
                    {sessionsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Load Sessions'
                    )}
                  </Button>
                )}
              </div>

              {/* Date Range Picker */}
              {filterMode === 'dateRange' && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <label className="text-sm text-slate-700">From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-700">To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Session List */}
              {(filterMode === 'single' || filterMode === 'custom') && availableSessions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Select Sessions ({availableSessions.length} available)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {availableSessions.map((session) => (
                          <label
                            key={session.sessionId}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200"
                          >
                            <input
                              type={filterMode === 'single' ? 'radio' : 'checkbox'}
                              checked={selectedSessions.includes(session.sessionId)}
                              onChange={() => handleSessionToggle(session.sessionId)}
                              className="w-4 h-4"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900 truncate">
                                  {session.userName || session.userId || 'Anonymous'}
                                </span>
                                {session.device && (
                                  <Badge variant="outline" className="text-xs">
                                    {getDeviceIcon(session.device.type || 'desktop')}
                                    <span className="ml-1">{session.device.type}</span>
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                {new Date(session.startTime).toLocaleString()}
                                {session.duration && (
                                  <span>• {Math.round(session.duration / 1000)}s</span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Display Options */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOverlay}
                    onChange={(e) => setShowOverlay(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Show Overlay</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Intensity:</label>
                  <Slider
                    value={[intensity]}
                    onValueChange={(v) => setIntensity(v[0])}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="w-32"
                  />
                  <span className="text-sm font-semibold text-slate-900 w-12">
                    {(intensity * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {domReady && (
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  DOM Ready
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {heatmapData.length > 0 && metadata && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getHeatmapColor()} rounded-lg flex items-center justify-center`}>
                    {getHeatmapIcon()}
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{metadata.totalInteractions.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Total Interactions</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{metadata.uniqueUsers.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Unique Users</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{heatmapData.length.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Heat Points</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {metadata.sessionCount || Math.max(...heatmapData.map(p => p.value || 1))}
                </p>
                <p className="text-sm text-slate-600">
                  {metadata.sessionCount ? 'Sessions' : 'Peak Value'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Heatmap Visualization */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              {getHeatmapIcon()}
              <span className="font-medium">
                {heatmapType.charAt(0).toUpperCase() + heatmapType.slice(1)} Heatmap
                {pageURL && ` - ${pageURL}`}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Filter className="w-4 h-4" />
                <span>
                  {heatmapData.length} point{heatmapData.length !== 1 ? 's' : ''}
                </span>
              </div>
              {metadata?.sessionCount && (
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  {metadata.sessionCount} session{metadata.sessionCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative bg-slate-50"
            style={{ minHeight: '700px', height: '80vh' }}
          >
            {/* Loading State */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Loading heatmap data...</p>
                  <p className="text-sm text-slate-500">Fetching DOM snapshot and interactions</p>
                </div>
              </div>
            )}

            {/* rrweb Replayer Container (DOM Recreation) */}
            <div
              ref={replayerContainerRef}
              className="absolute inset-0 w-full h-full overflow-hidden"
            />

            {/* Heatmap Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ mixBlendMode: 'multiply' }}
            />

            {/* Empty State */}
            {!loading && heatmapData.length === 0 && !domReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className={`w-20 h-20 bg-gradient-to-r ${getHeatmapColor()} rounded-full flex items-center justify-center mx-auto mb-4 opacity-20`}
                  >
                    {getHeatmapIcon()}
                  </div>
                  <p className="text-slate-600 text-lg font-semibold mb-2">No heatmap data</p>
                  <p className="text-sm text-slate-500">
                    Enter a page URL and click Generate to visualize user interactions
                  </p>
                </div>
              </div>
            )}

            {/* DOM Loading Indicator */}
            {!domReady && heatmapData.length > 0 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Loading page DOM...</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          {heatmapData.length > 0 && showOverlay && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700">Intensity Scale:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Low</span>
                    <div className={`w-32 h-4 rounded bg-gradient-to-r ${getHeatmapColor()}`}></div>
                    <span className="text-xs text-slate-500">High</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  💡 Brighter areas indicate higher user interaction
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
};

export default HeatmapVisualizationDynamic;
