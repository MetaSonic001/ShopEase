import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MousePointer, Activity, Clock, TrendingUp, Navigation, Eye, Send, Zap, Calendar } from 'lucide-react';

const Analytics2 = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Generate data based on time range
  const generateEventData = (range, customStart, customEnd) => {
    const data = [];
    const today = new Date();
    
    if (range === 'custom' && customStart && customEnd) {
      // Custom date range - daily data
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        data.push({
          name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          clicks: Math.floor(Math.random() * 3000) + 3000,
          scrolls: Math.floor(Math.random() * 5000) + 8000,
          submits: Math.floor(Math.random() * 200) + 200,
          pageViews: Math.floor(Math.random() * 3000) + 4000,
        });
      }
    } else if (range === '24h') {
      // Last 24 hours - hourly data
      for (let i = 23; i >= 0; i--) {
        const date = new Date(today);
        date.setHours(today.getHours() - i);
        data.push({
          name: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          clicks: Math.floor(Math.random() * 500) + 200,
          scrolls: Math.floor(Math.random() * 1200) + 600,
          submits: Math.floor(Math.random() * 30) + 10,
          pageViews: Math.floor(Math.random() * 600) + 300,
        });
      }
    } else if (range === '7d') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        data.push({
          name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          clicks: Math.floor(Math.random() * 3000) + 3000,
          scrolls: Math.floor(Math.random() * 5000) + 8000,
          submits: Math.floor(Math.random() * 200) + 200,
          pageViews: Math.floor(Math.random() * 3000) + 4000,
        });
      }
    } else if (range === '30d') {
      // Last 30 days - weekly aggregates
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - (i * 6));
        data.push({
          name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          clicks: Math.floor(Math.random() * 15000) + 15000,
          scrolls: Math.floor(Math.random() * 30000) + 40000,
          submits: Math.floor(Math.random() * 1000) + 1000,
          pageViews: Math.floor(Math.random() * 20000) + 20000,
        });
      }
    } else if (range === '90d') {
      // Last 90 days - monthly aggregates
      for (let i = 2; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(today.getMonth() - i);
        data.push({
          name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          clicks: Math.floor(Math.random() * 50000) + 80000,
          scrolls: Math.floor(Math.random() * 100000) + 200000,
          submits: Math.floor(Math.random() * 5000) + 5000,
          pageViews: Math.floor(Math.random() * 60000) + 100000,
        });
      }
    }
    
    return data;
  };

  const eventData = generateEventData(
    timeRange, 
    startDate ? new Date(startDate) : undefined, 
    endDate ? new Date(endDate) : undefined
  );

  const handleCustomDateApply = () => {
    if (startDate && endDate) {
      setTimeRange('custom');
      setShowCustomRange(false);
    }
  };

  const interactionData = [
    { time: '00:00', clicks: 120, hovers: 450, scrollDepth: 65 },
    { time: '04:00', clicks: 80, hovers: 290, scrollDepth: 58 },
    { time: '08:00', clicks: 380, hovers: 920, scrollDepth: 72 },
    { time: '12:00', clicks: 520, hovers: 1200, scrollDepth: 78 },
    { time: '16:00', clicks: 680, hovers: 1450, scrollDepth: 82 },
    { time: '20:00', clicks: 490, hovers: 1100, scrollDepth: 75 },
  ];

  const eventTypeData = [
    { name: 'Button Clicks', value: 42, color: '#6366f1' },
    { name: 'Link Clicks', value: 28, color: '#8b5cf6' },
    { name: 'Form Submits', value: 15, color: '#a78bfa' },
    { name: 'Scroll Events', value: 15, color: '#c4b5fd' },
  ];

  const performanceData = [
    { metric: 'Page Load', value: 1.2, benchmark: 2.0, status: 'good' },
    { metric: 'Time to Interactive', value: 2.8, benchmark: 3.5, status: 'good' },
    { metric: 'First Paint', value: 0.8, benchmark: 1.0, status: 'good' },
    { metric: 'DOM Load', value: 1.5, benchmark: 2.5, status: 'good' },
  ];

  const heatmapData = [
    { section: 'Header', clicks: 3420, avgTime: 2.3 },
    { section: 'Hero Section', clicks: 5890, avgTime: 8.7 },
    { section: 'Features', clicks: 4230, avgTime: 12.4 },
    { section: 'CTA Button', clicks: 2890, avgTime: 3.2 },
    { section: 'Footer', clicks: 1560, avgTime: 4.1 },
  ];

  const scrollDepthData = [
    { depth: '0-25%', users: 8900, percentage: 100 },
    { depth: '25-50%', users: 7200, percentage: 81 },
    { depth: '50-75%', users: 4800, percentage: 54 },
    { depth: '75-100%', users: 2300, percentage: 26 },
  ];

  const statsCards = [
    { 
      title: 'Total Clicks', 
      value: '32.4K', 
      change: '+15.3%', 
      icon: MousePointer, 
      color: 'bg-blue-500',
      trend: 'up',
      subtitle: 'All click events'
    },
    { 
      title: 'Page Views', 
      value: '38.9K', 
      change: '+12.8%', 
      icon: Eye, 
      color: 'bg-green-500',
      trend: 'up',
      subtitle: 'Unique page loads'
    },
    { 
      title: 'Form Submits', 
      value: '2.1K', 
      change: '+8.7%', 
      icon: Send, 
      color: 'bg-purple-500',
      trend: 'up',
      subtitle: 'Successful submissions'
    },
    { 
      title: 'Avg Wait Time', 
      value: '1.2s', 
      change: '-18.4%', 
      icon: Clock, 
      color: 'bg-orange-500',
      trend: 'up',
      subtitle: 'Load performance'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Event Analytics Dashboard</h1>
              <p className="text-slate-600 mt-1">Track user interactions, events, and page performance</p>
            </div>
            <div className="flex gap-2">
              {['24h', '7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range);
                    setShowCustomRange(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    timeRange === range
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {range}
                </button>
              ))}
              <button
                onClick={() => setShowCustomRange(!showCustomRange)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  timeRange === 'custom'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Custom
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {showCustomRange && (
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Select Date Range</h3>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleCustomDateApply}
                disabled={!startDate || !endDate}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-2">{stat.value}</h3>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-sm font-semibold ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-slate-500 text-xs">{stat.subtitle}</span>
                    </div>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Event Tracking */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Event Tracking Overview</h2>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={eventData}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScrolls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }} 
                />
                <Legend />
                <Area type="monotone" dataKey="clicks" stroke="#6366f1" fillOpacity={1} fill="url(#colorClicks)" />
                <Area type="monotone" dataKey="scrolls" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorScrolls)" />
                <Area type="monotone" dataKey="pageViews" stroke="#10b981" fillOpacity={1} fill="url(#colorPageViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Event Type Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Event Types</h2>
              <Zap className="w-5 h-5 text-slate-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {eventTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {eventTypeData.map((event, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }}></div>
                    <span className="text-sm text-slate-600">{event.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{event.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Interactions by Time */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Interactions by Time</h2>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={interactionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }} 
                />
                <Legend />
                <Bar dataKey="clicks" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="hovers" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scroll Depth Analysis */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Scroll Depth</h2>
              <Navigation className="w-5 h-5 text-slate-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scrollDepthData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="depth" type="category" stroke="#64748b" width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }} 
                />
                <Bar dataKey="users" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Click Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Click Heatmap by Section</h2>
              <MousePointer className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              {heatmapData.map((section, index) => {
                const intensity = (section.clicks / Math.max(...heatmapData.map(s => s.clicks))) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{section.section}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{section.avgTime}s avg</span>
                        <span className="text-sm font-semibold text-slate-800">{section.clicks.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${intensity}%`,
                          backgroundColor: intensity > 70 ? '#ef4444' : intensity > 40 ? '#f59e0b' : '#10b981'
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Performance Metrics</h2>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              {performanceData.map((metric, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{metric.metric}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-800">{metric.value}s</span>
                      <div className={`w-2 h-2 rounded-full ${
                        metric.status === 'good' ? 'bg-green-500' : 'bg-orange-500'
                      }`}></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Benchmark: {metric.benchmark}s</span>
                    <span className="text-green-600 font-semibold">
                      {((1 - metric.value / metric.benchmark) * 100).toFixed(0)}% faster
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Submissions Over Time */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Form Submissions & Click Events</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-600">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={eventData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                }} 
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="submits" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Form Submits"
              />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="#6366f1" 
                strokeWidth={3}
                dot={{ fill: '#6366f1', r: 4 }}
                activeDot={{ r: 6 }}
                name="Total Clicks"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics2;