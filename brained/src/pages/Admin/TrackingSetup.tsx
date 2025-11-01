import React, { useState } from 'react';
import { Copy, Check, Code, Zap } from 'lucide-react';

const TrackingSetup: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [projectId, setProjectId] = useState('default');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const trackingCode = `<!-- PagePulse Analytics -->
<script src="${apiUrl}/pagepulse.js" data-project-id="${projectId}"></script>
<!-- End PagePulse Analytics -->`;

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tracking Setup</h1>
        <p className="text-gray-600">Install PagePulse on your website to start tracking analytics</p>
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
          <h3 className="font-semibold text-gray-900 mb-2">Lightweight</h3>
          <p className="text-sm text-gray-600">
            Only 5KB gzipped, won't slow down your website or affect user experience
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Privacy Focused</h3>
          <p className="text-sm text-gray-600">
            GDPR compliant, respects user privacy, and works with consent management platforms
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrackingSetup;
