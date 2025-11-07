import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import { toast } from '@/components/ui/use-toast';
import { 
  Users, 
  Eye, 
  MousePointer2, 
  TrendingUp,
  Activity,
  Clock,
  Globe,
  Smartphone,
  
  Chrome,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Zap,
  AlertCircle,
  Video,
  Target
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ExportToolbar from '../../components/ExportToolbar';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_URL;

interface DashboardStats {
  totalVisitors: number;
  activeVisitors: number;
  totalPageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  browserBreakdown: Array<{ browser: string; count: number }>;
  eventTrends: Array<{ time: string; events: number }>;
  realtimeEvents: Array<{ type: string; page: string; timestamp: Date | number }>;
  eventsPerMinute?: number;
  eventsPerMinuteTrend?: Array<{ time: string; events: number }>;
  lcpP75?: number;
  clsP75?: number;
  inpP75?: number;
  rageLast10m?: number;
  errorsLast10m?: number;
}

const RealTimeAnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const socketRef = useRef<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalVisitors: 0,
    activeVisitors: 0,
    totalPageViews: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    topPages: [],
    deviceBreakdown: [],
    browserBreakdown: [],
    eventTrends: [],
    realtimeEvents: [],
    eventsPerMinute: 0,
    eventsPerMinuteTrend: [],
    lcpP75: 0,
    clsP75: 0,
    inpP75: 0,
    rageLast10m: 0,
    errorsLast10m: 0,
  });
  const [, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [greeting, setGreeting] = useState('');
  const [timeFilter, setTimeFilter] = useState('24h');
  const [filters, setFilters] = useState({
    device: '',
    country: '',
    utmSource: '',
    referrerContains: '',
    pathPrefix: '',
  });
  const [heatmapCtrl, setHeatmapCtrl] = useState({
    radius: 28,
    intensity: 0.35, // maps to maxAlpha
    mode: 'click' as 'click' | 'scroll' | 'hover' | 'mousemove',
  });

  const auth = useAuth();

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Try to get user name from auth context
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || user.email || 'Admin');
      } catch (e) {}
    }

  // Don’t fetch until we have an access token (prevents 401 spam during initialization)
  if (!auth?.accessToken) return;
  fetchDashboardData();
    
    // Setup Socket.IO for real-time updates
  const socket = io(SOCKET_URL, { withCredentials: true });
  socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to real-time analytics');
      socket.emit('join', 'default'); // Join default project room
    });

    socket.on('event', (event: any) => {
      console.log('Real-time event:', event);
      const mapped = event?.data
        ? { type: event.data.eventType || event.type || 'event', page: event.data.pageURL, timestamp: event.data.timestamp || Date.now() }
        : { type: event.type || 'event', page: event.pageURL, timestamp: event.timestamp || Date.now() };
      setStats(prev => ({
        ...prev,
        realtimeEvents: [mapped, ...prev.realtimeEvents].slice(0, 10),
      }));
    });

    // Also listen to interaction events from tracking routes
    socket.on('interaction', (payload: any) => {
      const mapped = {
        type: payload?.eventType || 'interaction',
        page: payload?.pageURL || '-',
        timestamp: payload?.timestamp || Date.now(),
      };
      setStats(prev => ({
        ...prev,
        realtimeEvents: [mapped, ...prev.realtimeEvents].slice(0, 10),
      }));
    });

    socket.on('session-recorded', ({ sessionId, pageURL, duration }: any) => {
      console.log('[Dashboard] New session recorded:', sessionId);
      toast({
        title: 'New Session Recorded',
        description: `${Math.round((duration || 0) / 1000)}s session on ${pageURL || 'unknown page'}`,
      });
      fetchDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, [auth?.accessToken]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch from tracking APIs and enhanced overview in parallel
      const [sessionsRes, interactionsRes, summaryRes, overviewRes] = await Promise.all([
        api.get('/api/tracking/sessions', {
          params: { page: 1, limit: 100, isComplete: false },
        }),
        api.get('/api/tracking/interactions/summary', {
          params: { 
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            groupBy: 'eventType'
          },
        }),
        api.get('/api/tracking/interactions/summary', {
          params: { 
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
        api.get('/api/dashboard/overview', {
          params: {
            device: filters.device || undefined,
            country: filters.country || undefined,
            utmSource: filters.utmSource || undefined,
            referrerContains: filters.referrerContains || undefined,
            pathPrefix: filters.pathPrefix || undefined,
          },
        }),
      ]);

      // Process sessions data
      const sessions = sessionsRes.data.sessions || [];
      const activeSessions = sessions.filter((s: any) => !s.isComplete);

      // Process interactions summary
      const interactionsSummary = interactionsRes.data.summary || [];
      const overallSummary = summaryRes.data.summary || [];
      
      // Calculate metrics
      const pageviews = interactionsSummary.find((i: any) => i.eventType === 'pageview')?.count || 0;
      const avgDuration = overallSummary[0]?.avgTimeOnPage || 0;
      const uniqueUsers = new Set(sessions.map((s: any) => s.userId)).size;

      // Device breakdown
      const deviceCounts = sessions.reduce((acc: any, s: any) => {
        const device = s.device?.type || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});
      const deviceBreakdown = Object.entries(deviceCounts).map(([device, count]) => ({
        device,
        count: count as number,
      }));

      // Browser breakdown
      const browserCounts = sessions.reduce((acc: any, s: any) => {
        const browser = s.device?.browser || 'unknown';
        acc[browser] = (acc[browser] || 0) + 1;
        return acc;
      }, {});
      const browserBreakdown = Object.entries(browserCounts).map(([browser, count]) => ({
        browser,
        count: count as number,
      }));

      // Event trends (last 24 hours, hourly)
      const now = new Date();
      const eventTrends = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        return {
          time: hour.getHours() + ':00',
          events: Math.floor(Math.random() * 100), // TODO: Replace with actual data
        };
      });

      // Top pages (from pageview events)
      const topPages = [
        { page: '/products', views: pageviews > 0 ? Math.floor(pageviews * 0.4) : 0 },
        { page: '/home', views: pageviews > 0 ? Math.floor(pageviews * 0.3) : 0 },
        { page: '/cart', views: pageviews > 0 ? Math.floor(pageviews * 0.15) : 0 },
        { page: '/checkout', views: pageviews > 0 ? Math.floor(pageviews * 0.1) : 0 },
        { page: '/about', views: pageviews > 0 ? Math.floor(pageviews * 0.05) : 0 },
      ];

      setStats({
        totalVisitors: uniqueUsers,
        activeVisitors: activeSessions.length,
        totalPageViews: pageviews,
        avgSessionDuration: avgDuration,
        bounceRate: 35, // TODO: Calculate from actual data
        topPages,
        deviceBreakdown,
        browserBreakdown,
        eventTrends,
        realtimeEvents: stats.realtimeEvents, // Keep existing real-time events
        // Merge enhanced overview metrics
        eventsPerMinute: overviewRes?.data?.eventsPerMinute ?? 0,
        eventsPerMinuteTrend: overviewRes?.data?.eventsPerMinuteTrend ?? [],
        lcpP75: overviewRes?.data?.lcpP75 ?? 0,
        clsP75: overviewRes?.data?.clsP75 ?? 0,
        inpP75: overviewRes?.data?.inpP75 ?? 0,
        rageLast10m: overviewRes?.data?.rageLast10m ?? 0,
        errorsLast10m: overviewRes?.data?.errorsLast10m ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      // Try fallback to old API which now includes enhanced metrics
      try {
        if (!auth?.accessToken) return;
        const response = await api.get('/api/dashboard/overview');
        setStats(prev => ({
          ...prev,
          ...response.data,
          eventsPerMinute: response.data.eventsPerMinute ?? prev.eventsPerMinute,
          eventsPerMinuteTrend: response.data.eventsPerMinuteTrend ?? prev.eventsPerMinuteTrend,
          lcpP75: response.data.lcpP75 ?? prev.lcpP75,
          clsP75: response.data.clsP75 ?? prev.clsP75,
          inpP75: response.data.inpP75 ?? prev.inpP75,
          rageLast10m: response.data.rageLast10m ?? prev.rageLast10m,
          errorsLast10m: response.data.errorsLast10m ?? prev.errorsLast10m,
        }));
      } catch (fallbackErr) {
        console.error('Fallback API also failed', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const containerRef = useRef<HTMLDivElement>(null);
  const csvGroups = [
    {
      label: 'Top Pages',
      headers: ['Page','Views'],
      rows: stats.topPages.map(p => [p.page, p.views]),
      filename: 'realtime-top-pages.csv'
    },
    {
      label: 'Device Breakdown',
      headers: ['Device','Count'],
      rows: stats.deviceBreakdown.map(d => [d.device, d.count]),
      filename: 'realtime-device-breakdown.csv'
    },
    {
      label: 'Browser Breakdown',
      headers: ['Browser','Count'],
      rows: stats.browserBreakdown.map(b => [b.browser, b.count]),
      filename: 'realtime-browser-breakdown.csv'
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header Section */}
      <div className="px-6 py-8 border-b border-slate-200/50 bg-white sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-slate-600 mt-1">Monitor your website performance in real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <ExportToolbar targetRef={containerRef as any} pdfFilename="realtime-dashboard.pdf" csvGroups={csvGroups} size="sm" />
            <button
              onClick={() => navigate('/admin/analytics/recordings')}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 font-medium"
            >
              <Video className="w-5 h-5" />
              Recordings
            </button>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Activity className="w-5 h-5 animate-pulse" />
              Refresh
            </button>
          </div>
        </div>
        {/* Filter Bar */}
        <div className="max-w-7xl mx-auto mt-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={filters.device}
            onChange={(e) => setFilters((f) => ({ ...f, device: e.target.value }))}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700"
          >
            <option value="">All devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
          <input
            placeholder="Country (e.g. US)"
            value={filters.country}
            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700"
          />
          <input
            placeholder="UTM source"
            value={filters.utmSource}
            onChange={(e) => setFilters((f) => ({ ...f, utmSource: e.target.value }))}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700"
          />
          <input
            placeholder="Referrer contains"
            value={filters.referrerContains}
            onChange={(e) => setFilters((f) => ({ ...f, referrerContains: e.target.value }))}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700"
          />
          <input
            placeholder="Path prefix (e.g. /docs)"
            value={filters.pathPrefix}
            onChange={(e) => setFilters((f) => ({ ...f, pathPrefix: e.target.value }))}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700"
          />
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            {/* Active Visitors Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></div>
                    Live
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(stats.activeVisitors)}</p>
                <p className="text-sm text-slate-600">Active Visitors</p>
              </div>
            </div>

            {/* Total Visitors Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                    <ArrowUp className="w-3 h-3" />
                    12%
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(stats.totalVisitors)}</p>
                <p className="text-sm text-slate-600">Total Visitors</p>
              </div>
            </div>

            {/* Page Views Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                    <ArrowUp className="w-3 h-3" />
                    8%
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(stats.totalPageViews)}</p>
                <p className="text-sm text-slate-600">Page Views</p>
              </div>
            </div>

            {/* Avg Session Duration Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                    <ArrowDown className="w-3 h-3" />
                    3%
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{formatDuration(stats.avgSessionDuration)}</p>
                <p className="text-sm text-slate-600">Avg Session Duration</p>
              </div>
            </div>
            {/* Events Per Minute Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    /min
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(stats.eventsPerMinute || 0)}</p>
                <p className="text-sm text-slate-600">Events / Minute</p>
              </div>
            </div>

            {/* Rage & Errors Badge Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl"></div>
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Rage (10m)</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${ (stats.rageLast10m||0) > 5 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{stats.rageLast10m}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Errors (10m)</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${ (stats.errorsLast10m||0) > 10 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{stats.errorsLast10m}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Auto-refresh via socket events</div>
              </div>
            </div>
          </div>

          {/* Charts & Vitals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Traffic Trends
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Hourly event metrics</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={(stats.eventsPerMinuteTrend && stats.eventsPerMinuteTrend.length > 0) ? stats.eventsPerMinuteTrend : stats.eventTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="events"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEvents)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Live Activity
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {stats.realtimeEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Waiting for events...</p>
                  </div>
                ) : (
                  stats.realtimeEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200/50"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <MousePointer2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{event.type}</p>
                        <p className="text-xs text-slate-500 truncate">{event.page}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Core Web Vitals Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* LCP Gauge */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">LCP (P75)</h3>
              <div className="flex items-center justify-center relative">
                <svg className="w-28 h-28">
                  <circle className="text-slate-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="56" cx="60" cy="60" />
                  <circle
                    className="text-blue-500"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={2 * Math.PI * 56 * (1 - Math.min((stats.lcpP75 || 0) / 4000, 1))}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="56"
                    cx="60"
                    cy="60"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <span className="absolute text-lg font-bold text-slate-900">{(stats.lcpP75 || 0)}ms</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Target &lt; 2500ms</p>
            </div>
            {/* CLS Gauge */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">CLS (P75)</h3>
              <div className="flex items-center justify-center relative">
                <svg className="w-28 h-28">
                  <circle className="text-slate-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="56" cx="60" cy="60" />
                  <circle
                    className="text-purple-500"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={2 * Math.PI * 56 * (1 - Math.min((stats.clsP75 || 0) / 0.3, 1))}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="56"
                    cx="60"
                    cy="60"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <span className="absolute text-lg font-bold text-slate-900">{(stats.clsP75 || 0).toFixed(3)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Target &lt; 0.1</p>
            </div>
            {/* INP Gauge */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">INP (P75)</h3>
              <div className="flex items-center justify-center relative">
                <svg className="w-28 h-28">
                  <circle className="text-slate-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="56" cx="60" cy="60" />
                  <circle
                    className="text-green-500"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={2 * Math.PI * 56 * (1 - Math.min((stats.inpP75 || 0) / 200, 1))}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="56"
                    cx="60"
                    cy="60"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <span className="absolute text-lg font-bold text-slate-900">{(stats.inpP75 || 0)}ms</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Target &lt; 200ms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Pages Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Top Pages
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topPages} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="page" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="views" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Device Breakdown Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-600" />
                Device Breakdown
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.deviceBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Browser Stats */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Chrome className="w-5 h-5 text-blue-600" />
                Top Browsers
              </h3>
              <div className="space-y-4">
                {stats.browserBreakdown.slice(0, 5).map((browser, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{browser.browser}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${(browser.count / (stats.browserBreakdown[0]?.count || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-8 text-right">{browser.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bounce Rate */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Bounce Rate
              </h3>
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <svg className="w-32 h-32">
                    <circle
                      className="text-slate-200"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className="text-orange-500"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 58}
                      strokeDashoffset={2 * Math.PI * 58 * (1 - stats.bounceRate / 100)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                      transform="rotate(-90 64 64)"
                      style={{ transition: "stroke-dashoffset 0.5s ease" }}
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold text-slate-900">{stats.bounceRate.toFixed(1)}%</span>
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {stats.bounceRate < 40 ? "✨ Excellent" : stats.bounceRate < 60 ? "👍 Good" : "⚠️ Needs Improvement"}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/analytics/recordings')}
                  className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left flex items-center gap-3 font-medium border border-blue-200"
                >
                  <Video className="w-4 h-4" />
                  <span className="text-sm">Session Recordings</span>
                </button>
                <button
                  onClick={() => navigate('/admin/analytics/heatmap')}
                  className="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-left flex items-center gap-3 font-medium border border-purple-200"
                >
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Heatmaps</span>
                </button>
                <button
                  onClick={() => navigate('/admin/analytics/funnels')}
                  className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-left flex items-center gap-3 font-medium border border-green-200"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Funnel Analysis</span>
                </button>
                {/* Admin Heatmap Control */}
                <div className="pt-4 mt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Admin Heatmap Control</h4>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Radius</label>
                      <input
                        type="number"
                        min={8}
                        max={64}
                        value={heatmapCtrl.radius}
                        onChange={(e) => setHeatmapCtrl((h) => ({ ...h, radius: Number(e.target.value) }))}
                        className="w-full px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Intensity</label>
                      <input
                        type="number"
                        step={0.05}
                        min={0}
                        max={1}
                        value={heatmapCtrl.intensity}
                        onChange={(e) => setHeatmapCtrl((h) => ({ ...h, intensity: Number(e.target.value) }))}
                        className="w-full px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Mode</label>
                      <select
                        value={heatmapCtrl.mode}
                        onChange={(e) => setHeatmapCtrl((h) => ({ ...h, mode: e.target.value as any }))}
                        className="w-full px-2 py-1 border border-slate-300 rounded"
                      >
                        <option value="click">Click</option>
                        <option value="scroll">Scroll</option>
                        <option value="hover">Hover</option>
                        <option value="mousemove">Mousemove</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        try {
                          socketRef.current?.emit('admin-show-heatmap', {
                            projectId: 'default',
                            options: { radius: heatmapCtrl.radius, maxAlpha: heatmapCtrl.intensity, mode: heatmapCtrl.mode },
                          });
                          toast({ title: 'Heatmap show broadcasted' });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="px-3 py-2 bg-purple-600 text-white rounded text-sm"
                    >
                      Show Heatmap
                    </button>
                    <button
                      onClick={() => {
                        try {
                          socketRef.current?.emit('admin-hide-heatmap', { projectId: 'default' });
                          toast({ title: 'Heatmap hide broadcasted' });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="px-3 py-2 bg-slate-200 text-slate-800 rounded text-sm"
                    >
                      Hide Heatmap
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeAnalyticsDashboard;
