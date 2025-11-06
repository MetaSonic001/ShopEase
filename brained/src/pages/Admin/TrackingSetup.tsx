import React, { useState, useEffect } from 'react';
import { Copy, Check, Code, Zap, Play, Pause, Info } from 'lucide-react';

const TrackingSetup: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [projectId, setProjectId] = useState('default');
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  useEffect(() => {
    // Load tracking state from localStorage
    const enabled = localStorage.getItem('tracking_enabled') !== 'false';
    setTrackingEnabled(enabled);
  }, []);

  const toggleTracking = () => {
    const newState = !trackingEnabled;
    setTrackingEnabled(newState);
    localStorage.setItem('tracking_enabled', String(newState));
    
    // Show notification
    const message = newState 
      ? '🎯 Tracking Enabled - All non-admin sessions are now being recorded'
      : '⏸️ Tracking Paused - Session recording stopped';
    
    // You could use a toast notification library here
    alert(message);
  };

  const apiUrl = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
  
  const trackingCode = `<!-- PagePulse SDK -->
<script
  src="${apiUrl}/pagepulse.js"
  data-project-id="${projectId}"
  data-api-base="${apiUrl}"
  data-autotrack="true"
  data-enable-recording="admin"   
  data-enable-live="true"         
  data-mask-inputs="true"         
  data-block-selectors=".pp-block,.sensitive"
></script>
<!-- End PagePulse SDK -->`;

  const customEventCode = `// Track custom events
PagePulse.track('Button Clicked', {
  buttonName: 'Sign Up',
  page: 'Landing'
});

// Identify users
PagePulse.identify('user-123', {
  email: 'user@example.com',
  plan: 'pro'
});

// Track page views
PagePulse.page('Product Page', {
  productId: '123',
  category: 'Electronics'
});`;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tracking Setup</h1>
          <p className="text-gray-600">Control and monitor PagePulse analytics tracking</p>
        </div>
        
        {/* Tracking Control Toggle */}
        <button
          onClick={toggleTracking}
          className={`flex items-center gap-3 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg ${
            trackingEnabled
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
        >
          {trackingEnabled ? (
            <>
              <Play className="w-5 h-5" />
              Tracking Active
            </>
          ) : (
            <>
              <Pause className="w-5 h-5" />
              Tracking Paused
            </>
          )}
        </button>
      </div>

      {/* Status Banner */}
      <div className={`mb-6 p-4 rounded-lg border ${
        trackingEnabled 
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${trackingEnabled ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <p className="font-medium">
            {trackingEnabled 
              ? '✅ All non-admin user sessions are being tracked and recorded'
              : '⏸️ Tracking is currently paused - No data is being collected'}
          </p>
        </div>
        <p className="text-sm mt-2 ml-5">
          {trackingEnabled
            ? 'View real-time analytics, session recordings, and heatmaps in the Analytics dashboard'
            : 'Click "Tracking Active" to resume data collection'}
        </p>
      </div>

      {/* Project ID Input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project ID (optional)
        </label>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="default"
        />
        <p className="text-sm text-gray-500 mt-2">
          Use different project IDs to track multiple websites separately
        </p>
      </div>

      {/* Installation Steps */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 mb-6 border border-blue-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-600" />
          Quick Installation
        </h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Copy the tracking code</h3>
                <p className="text-gray-600 mb-4">
                  Copy the JavaScript snippet below and paste it into your website's HTML
                </p>
                
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{trackingCode}</code>
                  </pre>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Place before closing &lt;/head&gt; tag</h3>
                <p className="text-gray-600">
                  Add the tracking code in your HTML, ideally before the closing &lt;/head&gt; tag for best performance
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Verify installation</h3>
                <p className="text-gray-600">
                  Visit your website and check the dashboard to see real-time data flowing in
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Code className="w-6 h-6 text-purple-600" />
          Track Custom Events
        </h2>
        <p className="text-gray-600 mb-4">
          Use the PagePulse JavaScript API to track custom events, identify users, and more
        </p>
        
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{customEventCode}</code>
        </pre>
      </div>

      {/* SDK Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          PagePulse SDK – What’s Included
        </h2>
        <div className="space-y-5 text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">What gets collected (by default)</h3>
            <ul className="list-disc ml-6 space-y-1 text-sm">
              <li>Page views (URL, title, referrer)</li>
              <li>Clicks (element tag/id/class, snippet of inner text, coordinates)</li>
              <li>Scroll depth (debounced)</li>
              <li>Form submits (key/value with sensitive fields masked)</li>
              <li>Performance metrics (TTFB, FCP, LCP, CLS, INP/FID, load/DOM timings)</li>
              <li>Optional: rrweb session recording (lazy‑loaded, masked) – admin‑triggered by default</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Script tag attributes</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm mb-2">
{`<script
  src="${apiUrl}/pagepulse.js"
  data-project-id="${projectId}"
  data-api-base="${apiUrl}"            // optional: override API base
  data-autotrack="true"                 // optional: disable with 'false'
  data-enable-recording="admin"         // 'false' | 'true' | 'admin' | 'manual'
  data-enable-live="true"               // connect to admin live triggers via WebSocket
  data-mask-inputs="true"               // rrweb: mask all input values
  data-block-selectors=".pp-block,.sensitive" // rrweb: don't record matching elements
></script>`}
            </pre>
            <p className="text-sm text-gray-600">
              If <code>data-api-base</code> is not provided, the SDK uses the script's origin.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">JavaScript API (global <code>PagePulse</code>)</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm mb-2">
{`// Initialize manually (only needed if you set data-autotrack="false")
PagePulse.init({
  apiBase: '${apiUrl}',
  projectId: '${projectId}',
  autotrack: true,
  superProperties: { plan: 'pro' }
});

// Identify current user
PagePulse.identify('user-123', { email: 'user@example.com' });

// Track a custom event
PagePulse.track('CTA Clicked', { button: 'Sign Up' });

// Track a SPA route change (call this on navigation)
PagePulse.page('Route Change', { path: location.pathname });

// Set persistent properties
PagePulse.setSuperProperties({ accountId: 'acc_42' });

// Opt out / Opt in (stored in localStorage)
PagePulse.optOut();
PagePulse.optIn();

// Recording (rrweb) – optional
// Start manually if you use data-enable-recording="manual"
PagePulse.startRecording();
// Stop when needed
PagePulse.stopRecording();

// Heatmap overlay (for admins viewing the site)
PagePulse.showHeatmap({ radius: 28, maxAlpha: 0.35 });
PagePulse.hideHeatmap();`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Single‑Page Apps (SPA)</h3>
            <p className="text-sm text-gray-700 mb-2">
              For client‑side routing, call <code>PagePulse.page()</code> on every route change to record a new page view.
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// React Router example
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function useAnalyticsPageViews() {
  const location = useLocation();
  useEffect(() => {
    if (window.PagePulse) {
      window.PagePulse.page('Page', { path: location.pathname });
    }
  }, [location.pathname]);
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">CORS & Allowed Domains</h3>
            <p className="text-sm text-gray-700">
              Your server restricts origins via environment variables. Ensure the websites you want to track are allowed:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-sm mt-2">
              <li><code>CLIENT_URLS</code>: comma‑separated list of full origins (e.g., <code>https://foo.com,https://bar.app</code>)</li>
              <li><code>CLIENT_URL_SUFFIXES</code>: domain suffixes allowed for preview envs (e.g., <code>vercel.app</code>)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Consent & Privacy</h3>
            <ul className="list-disc ml-6 space-y-1 text-sm">
              <li>Respects local opt‑out via <code>PagePulse.optOut()</code> and <code>localStorage</code></li>
              <li>Masks sensitive form fields (passwords, card data) by default</li>
              <li>Don’t paste the snippet on admin/internal pages if you don’t want them tracked</li>
              <li>Comply with your consent banner—only inject the script after consent if required</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Troubleshooting & Verification</h3>
            <ul className="list-disc ml-6 space-y-1 text-sm">
              <li>Open the browser Network tab and verify calls to <code>/api/tracking/interactions</code> and <code>/api/analytics/performance</code></li>
              <li>Check CORS errors; add your site to <code>CLIENT_URLS</code> or <code>CLIENT_URL_SUFFIXES</code> on the server</li>
              <li>SPA sites: ensure you call <code>PagePulse.page()</code> on route changes</li>
              <li>If using live admin triggers, confirm the script can load <code>/socket.io/socket.io.js</code> from your server origin</li>
              <li>Use the Admin dashboard to confirm live events, recordings, heatmaps, and metrics</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Auto-Tracking</h3>
          <p className="text-sm text-gray-600">
            Automatically tracks page views, clicks, form submissions, and performance metrics
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Code className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Lightweight & Lazy</h3>
          <p className="text-sm text-gray-600">
            Core is tiny; rrweb and sockets are lazy‑loaded only when recording is enabled or triggered
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Privacy Focused</h3>
          <p className="text-sm text-gray-600">
            GDPR friendly: masks inputs by default, supports block selectors, and works with consent platforms
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrackingSetup;
