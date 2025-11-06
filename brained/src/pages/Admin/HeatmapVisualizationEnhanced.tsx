import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MousePointer2,
  ScrollText,
  Activity,
  RefreshCw,
  Download,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Users,
  Target,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
}

interface HeatmapMetadata {
  totalInteractions: number;
  uniqueUsers: number;
}

type HeatmapType = 'click' | 'scroll' | 'hover' | 'mousemove';
type DeviceType = 'all' | 'desktop' | 'mobile' | 'tablet';

const HeatmapVisualizationEnhanced: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [metadata, setMetadata] = useState<HeatmapMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageURL, setPageURL] = useState('/products');
  const [heatmapType, setHeatmapType] = useState<HeatmapType>('click');
  const [deviceType, setDeviceType] = useState<DeviceType>('all');
  const [showOverlay, setShowOverlay] = useState(true);
  const [intensity, setIntensity] = useState(0.6);
  const [pageHTML, setPageHTML] = useState<string>('');
  const [pageLoading, setPageLoading] = useState(false);
  const [domReady, setDomReady] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (heatmapData.length > 0 && domReady) {
      drawHeatmap();
    }
  }, [heatmapData, intensity, showOverlay, domReady]);

  useEffect(() => {
    // Auto-fetch on mount with default page
    if (pageURL) {
      fetchHeatmapData();
    }
  }, []);

  const fetchPageHTML = async (url: string) => {
    try {
      setPageLoading(true);
      setDomReady(false);
      
      // Try to fetch the actual page HTML
      const fullURL = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      
      try {
        const response = await axios.get(fullURL);
        setPageHTML(response.data);
      } catch (err) {
        console.warn('[Heatmap] Could not fetch page HTML, creating mock structure:', err);
        // Create a mock HTML structure for visualization
        setPageHTML(createMockPageStructure(url));
      }
      
      setDomReady(true);
    } catch (err) {
      console.error('[Heatmap] Error loading page:', err);
      setPageHTML(createMockPageStructure(url));
      setDomReady(true);
    } finally {
      setPageLoading(false);
    }
  };

  const createMockPageStructure = (url: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f8f9fa;
          }
          .page-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 40px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 40px;
            border-radius: 12px;
            margin-bottom: 40px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
          }
          .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1em;
          }
          .content-section {
            margin: 30px 0;
          }
          .content-section h2 {
            color: #2d3748;
            margin-bottom: 20px;
          }
          .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 24px;
            margin: 30px 0;
          }
          .product-card {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s;
            cursor: pointer;
          }
          .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .product-image {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #667eea40 0%, #764ba240 100%);
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .button {
            background: #4299e1;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: all 0.3s;
          }
          .button:hover {
            background: #3182ce;
            transform: translateY(-2px);
          }
          .cta-section {
            background: #edf2f7;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            margin: 40px 0;
          }
          .footer {
            margin-top: 60px;
            padding: 40px;
            background: #2d3748;
            color: white;
            border-radius: 12px;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="header">
            <h1>Page: ${url}</h1>
            <p>Interactive heatmap visualization of user behavior</p>
          </div>
          
          <div class="content-section">
            <h2>Popular Products</h2>
            <div class="product-grid">
              <div class="product-card">
                <div class="product-image"></div>
                <h3>Product 1</h3>
                <p>Description of product 1</p>
                <button class="button">View Details</button>
              </div>
              <div class="product-card">
                <div class="product-image"></div>
                <h3>Product 2</h3>
                <p>Description of product 2</p>
                <button class="button">View Details</button>
              </div>
              <div class="product-card">
                <div class="product-image"></div>
                <h3>Product 3</h3>
                <p>Description of product 3</p>
                <button class="button">View Details</button>
              </div>
              <div class="product-card">
                <div class="product-image"></div>
                <h3>Product 4</h3>
                <p>Description of product 4</p>
                <button class="button">View Details</button>
              </div>
              <div class="product-card">
                <div class="product-image"></div>
                <h3>Product 5</h3>
                <p>Description of product 5</p>
                <button class="button">View Details</button>
              </div>
              <div class="product-card">
                <div class="product-image"></div>
                <h3>Product 6</h3>
                <p>Description of product 6</p>
                <button class="button">View Details</button>
              </div>
            </div>
          </div>
          
          <div class="cta-section">
            <h2>Special Offer!</h2>
            <p>Sign up now and get 20% off your first order</p>
            <button class="button" style="margin-top: 20px;">Get Started</button>
          </div>
          
          <div class="content-section">
            <h2>Why Choose Us</h2>
            <p style="line-height: 1.8; color: #4a5568;">
              We provide the best quality products with excellent customer service. 
              Our team is dedicated to ensuring your satisfaction with every purchase.
              Shop with confidence knowing that we stand behind everything we sell.
            </p>
          </div>
          
          <div class="footer">
            <h3>Contact Information</h3>
            <p>Email: info@example.com | Phone: (123) 456-7890</p>
            <p style="margin-top: 20px; opacity: 0.7;">© 2025 Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const fetchHeatmapData = async () => {
    if (!pageURL) {
      alert('Please enter a page URL');
      return;
    }

    try {
      setLoading(true);
      
      // Fetch both heatmap data and page HTML
      const params: any = {
        pageURL: pageURL.startsWith('http') ? pageURL : `${window.location.origin}${pageURL}`,
        type: heatmapType,
      };
      
      if (deviceType !== 'all') {
        params.device = deviceType;
      }

      const [heatmapResponse] = await Promise.all([
        axios.get(`${API_URL}/api/tracking/heatmap`, {
          params,
          withCredentials: true,
        }),
        fetchPageHTML(pageURL),
      ]);

      setHeatmapData(heatmapResponse.data.heatmapData || []);
      setMetadata(heatmapResponse.data.metadata || null);
    } catch (err: any) {
      console.error('[Heatmap] Failed to fetch heatmap data', err);
      alert(err.response?.data?.message || 'Failed to fetch heatmap data');
    } finally {
      setLoading(false);
    }
  };

  const drawHeatmap = () => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlay || heatmapData.length === 0) return;

    // Find max intensity for normalization
    const maxIntensity = Math.max(...heatmapData.map(p => p.value || 1), 1);

    // Draw each point
    heatmapData.forEach(point => {
      const x = point.x;
      const y = point.y;

      // Normalize intensity
      const normalizedIntensity = (point.value || 1) / maxIntensity;

      // Create radial gradient
      const radius = 50 + (normalizedIntensity * 30); // Bigger radius for higher intensity
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      // Color based on intensity and heatmap type
      const alpha = normalizedIntensity * intensity;
      if (heatmapType === 'click') {
        gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha * 0.9})`);
        gradient.addColorStop(0.4, `rgba(255, 100, 0, ${alpha * 0.6})`);
        gradient.addColorStop(0.7, `rgba(255, 200, 0, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
      } else if (heatmapType === 'scroll') {
        gradient.addColorStop(0, `rgba(0, 100, 255, ${alpha * 0.9})`);
        gradient.addColorStop(0.4, `rgba(0, 200, 255, ${alpha * 0.6})`);
        gradient.addColorStop(0.7, `rgba(100, 255, 255, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(200, 255, 255, 0)');
      } else {
        gradient.addColorStop(0, `rgba(148, 0, 211, ${alpha * 0.9})`);
        gradient.addColorStop(0.4, `rgba(186, 85, 211, ${alpha * 0.6})`);
        gradient.addColorStop(0.7, `rgba(221, 160, 221, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 200, 255, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
  };

  const exportHeatmap = () => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create a temporary canvas with both iframe content and heatmap
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    tempCanvas.width = containerRef.current.offsetWidth;
    tempCanvas.height = containerRef.current.offsetHeight;

    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Try to draw iframe content (may fail due to CORS)
    if (iframeRef.current) {
      try {
        const iframeDoc = iframeRef.current.contentDocument;
        if (iframeDoc) {
          // This is a simplified approach - real implementation would need html2canvas or similar
          ctx.fillStyle = '#f8f9fa';
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
      } catch (e) {
        console.warn('[Heatmap] Could not access iframe content for export:', e);
      }
    }

    // Draw heatmap on top
    ctx.drawImage(canvasRef.current, 0, 0);

    // Download
    const link = document.createElement('a');
    link.download = `heatmap-${heatmapType}-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL();
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
      default:
        return 'from-purple-500 to-pink-500';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200/50 bg-white sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">🔥 Heatmap Visualization</h1>
              <p className="text-sm text-slate-600 mt-1">Visualize user interactions with DOM recreation and real-time overlays</p>
            </div>
            {heatmapData.length > 0 && (
              <button
                onClick={exportHeatmap}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export PNG
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="space-y-4">
            {/* URL Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={pageURL}
                onChange={(e) => setPageURL(e.target.value)}
                placeholder="e.g., /products or https://example.com/products"
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              />
              <button
                onClick={fetchHeatmapData}
                disabled={loading || pageLoading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
              >
                {loading || pageLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
            </div>

            {/* Heatmap Type & Device Filter */}
            <div className="flex gap-3 flex-wrap">
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
                  {(type === 'hover' || type === 'mousemove') && <Activity className="w-4 h-4" />}
                  {type === 'mousemove' ? 'Move' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
              
              <div className="ml-auto flex gap-2">
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

            {/* Options */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOverlay}
                    onChange={(e) => setShowOverlay(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Show Heatmap Overlay</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Intensity:</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={intensity}
                    onChange={(e) => setIntensity(parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm font-semibold text-slate-900">{(intensity * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {heatmapData.length > 0 && metadata && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${getHeatmapColor()} rounded-lg flex items-center justify-center text-white`}>
                  {getHeatmapIcon()}
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{metadata.totalInteractions.toLocaleString()}</p>
              <p className="text-sm text-slate-600">Total Interactions</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{metadata.uniqueUsers.toLocaleString()}</p>
              <p className="text-sm text-slate-600">Unique Users</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{heatmapData.length.toLocaleString()}</p>
              <p className="text-sm text-slate-600">Heat Points</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {Math.max(...heatmapData.map(p => p.value || 1), 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-600">Peak Intensity</p>
            </div>
          </div>
        )}

        {/* Heatmap Canvas with DOM */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              {getHeatmapIcon()}
              <span className="font-medium">
                {heatmapType.charAt(0).toUpperCase() + heatmapType.slice(1)} Heatmap
                {pageURL && ` - ${pageURL}`}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {pageLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading page...</span>
                </div>
              )}
              {domReady && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <Eye className="w-4 h-4" />
                  <span>DOM Ready</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Target className="w-4 h-4" />
                <span>
                  {heatmapData.length} point{heatmapData.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative bg-slate-50 overflow-auto"
            style={{ minHeight: '800px', maxHeight: '1200px' }}
          >
            {/* IFrame for actual page rendering */}
            {pageHTML && domReady && (
              <iframe
                ref={iframeRef}
                srcDoc={pageHTML}
                className="w-full h-full border-0"
                style={{ minHeight: '800px' }}
                sandbox="allow-same-origin"
                onLoad={() => {
                  console.log('[Heatmap] IFrame loaded, ready to draw heatmap');
                  // Trigger heatmap redraw after iframe loads
                  setTimeout(() => drawHeatmap(), 300);
                }}
              />
            )}

            {/* Canvas for heatmap overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ mixBlendMode: 'multiply' }}
            />

            {/* Loading State */}
            {(loading || pageLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20">
                <div className="text-center">
                  <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-slate-600 text-lg font-semibold">
                    {pageLoading ? 'Loading page content...' : 'Generating heatmap...'}
                  </p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !pageLoading && heatmapData.length === 0 && !pageHTML && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`w-20 h-20 bg-gradient-to-r ${getHeatmapColor()} rounded-full flex items-center justify-center mx-auto mb-4 opacity-20`}>
                    {getHeatmapIcon()}
                  </div>
                  <p className="text-slate-600 text-lg font-semibold mb-2">No heatmap data</p>
                  <p className="text-sm text-slate-500">Enter a page URL and click Generate to visualize user interactions</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {!loading && !pageLoading && heatmapData.length === 0 && pageHTML && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">No interaction data found for this page</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          {heatmapData.length > 0 && showOverlay && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700">Heat Intensity:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Low</span>
                    <div className={`w-48 h-6 rounded bg-gradient-to-r ${getHeatmapColor()}`}></div>
                    <span className="text-xs text-slate-500">High</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Warmer colors = Higher user activity • Cooler colors = Lower activity
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default HeatmapVisualizationEnhanced;
