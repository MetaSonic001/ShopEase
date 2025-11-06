# PagePulse SDK Cookbook

This guide covers advanced integration patterns for the PagePulse analytics SDK across different frameworks and use cases.

## Table of Contents

- [SPA Router Integrations](#spa-router-integrations)
- [Consent Management](#consent-management)
- [Error Boundaries](#error-boundaries)
- [Performance Monitoring](#performance-monitoring)

---

## SPA Router Integrations

### React Router (v6+)

```javascript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    if (window.PagePulse) {
      window.PagePulse.trackPageView({
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
      });
    }
  }, [location.pathname]);

  return null;
}

// In your App.jsx
function App() {
  return (
    <Router>
      <AnalyticsTracker />
      <Routes>
        {/* your routes */}
      </Routes>
    </Router>
  );
}
```

### Next.js (App Router)

```javascript
// app/providers.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function AnalyticsProvider({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = `${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    
    if (window.PagePulse) {
      window.PagePulse.trackPageView({
        url: window.location.origin + url,
        title: document.title,
      });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
```

```javascript
// app/layout.tsx
import { AnalyticsProvider } from './providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://your-domain.com/pagepulse.js" async />
      </head>
      <body>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

### Next.js (Pages Router)

```javascript
// pages/_app.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (window.PagePulse) {
        window.PagePulse.trackPageView({
          url: window.location.origin + url,
          title: document.title,
        });
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);

  return <Component {...pageProps} />;
}

export default MyApp;
```

### Vue Router

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [/* your routes */],
});

router.afterEach((to, from) => {
  if (window.PagePulse) {
    window.PagePulse.trackPageView({
      url: window.location.href,
      title: document.title,
      referrer: from.fullPath ? window.location.origin + from.fullPath : document.referrer,
    });
  }
});

export default router;
```

---

## Consent Management

### GDPR Cookie Consent Pattern

```javascript
// Initialize PagePulse with consent control
window.PagePulseConfig = {
  apiUrl: 'https://your-api.com',
  projectId: 'default',
  recordSessions: false, // Start disabled
  captureConsole: false,
  captureNetwork: false,
};

// Wait for user consent
function initializeTracking() {
  const consent = localStorage.getItem('analytics-consent');
  
  if (consent === 'granted') {
    if (window.PagePulse) {
      window.PagePulse.enableRecording();
      window.PagePulse.startRecording();
    }
  }
}

// Call after consent banner interaction
function handleConsentGranted() {
  localStorage.setItem('analytics-consent', 'granted');
  initializeTracking();
}

function handleConsentDenied() {
  localStorage.setItem('analytics-consent', 'denied');
  // Disable all tracking
  if (window.PagePulse) {
    window.PagePulse.disableRecording();
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeTracking);
```

### Opt-Out Pattern

```javascript
// Add opt-out mechanism
function optOutOfTracking() {
  localStorage.setItem('pagepulse-opt-out', 'true');
  
  if (window.PagePulse) {
    window.PagePulse.disableRecording();
    window.PagePulse.stopRecording();
  }
}

function optInToTracking() {
  localStorage.removeItem('pagepulse-opt-out');
  
  if (window.PagePulse) {
    window.PagePulse.enableRecording();
    window.PagePulse.startRecording();
  }
}

// Check opt-out status on init
window.PagePulseConfig = {
  apiUrl: 'https://your-api.com',
  projectId: 'default',
  recordSessions: !localStorage.getItem('pagepulse-opt-out'),
};
```

### Data Masking

```javascript
// Mask sensitive form fields
window.PagePulseConfig = {
  apiUrl: 'https://your-api.com',
  projectId: 'default',
  maskInputSelectors: [
    'input[type="password"]',
    'input[name*="credit"]',
    'input[name*="card"]',
    'input[name*="ssn"]',
    '.sensitive-data',
    '[data-sensitive]',
  ],
  // Block specific elements from recording
  blockSelectors: [
    '.confidential',
    '#admin-panel',
    '[data-private]',
  ],
};
```

---

## Error Boundaries

### React Error Boundary with PagePulse

```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to PagePulse
    if (window.PagePulse) {
      window.PagePulse.trackError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        type: 'react-error-boundary',
      });
    }

    // Also log to console
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

## Performance Monitoring

### Custom Performance Marks

```javascript
// Track custom performance metrics
function trackFeatureLoad(featureName) {
  const mark = `feature-${featureName}-load`;
  performance.mark(mark);
  
  if (window.PagePulse) {
    window.PagePulse.trackEvent({
      eventType: 'performance',
      eventName: 'feature-load',
      metadata: {
        feature: featureName,
        timestamp: performance.now(),
      },
    });
  }
}

// Usage
async function loadDashboard() {
  performance.mark('dashboard-start');
  
  await fetchDashboardData();
  
  performance.mark('dashboard-end');
  performance.measure('dashboard-load', 'dashboard-start', 'dashboard-end');
  
  trackFeatureLoad('dashboard');
}
```

### API Call Tracking

```javascript
// Wrap fetch to auto-track API calls
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const startTime = performance.now();
  const url = typeof args[0] === 'string' ? args[0] : args[0].url;
  
  try {
    const response = await originalFetch(...args);
    const duration = performance.now() - startTime;
    
    if (window.PagePulse) {
      window.PagePulse.trackEvent({
        eventType: 'api-call',
        eventName: 'fetch',
        metadata: {
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
        },
      });
    }
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    if (window.PagePulse) {
      window.PagePulse.trackEvent({
        eventType: 'api-error',
        eventName: 'fetch-error',
        metadata: {
          url,
          error: error.message,
          duration,
        },
      });
    }
    
    throw error;
  }
};
```

---

## Advanced Patterns

### User Identification

```javascript
// Identify logged-in users
function identifyUser(userId, traits = {}) {
  if (window.PagePulse) {
    window.PagePulse.identify(userId, {
      ...traits,
      identifiedAt: new Date().toISOString(),
    });
  }
}

// Usage after login
async function handleLogin(credentials) {
  const user = await loginUser(credentials);
  
  identifyUser(user.id, {
    email: user.email,
    name: user.name,
    plan: user.subscription.plan,
  });
}
```

### Custom Event Tracking

```javascript
// Track business-critical events
function trackCheckout(orderId, amount, items) {
  if (window.PagePulse) {
    window.PagePulse.trackEvent({
      eventType: 'checkout',
      eventName: 'order-completed',
      metadata: {
        orderId,
        amount,
        itemCount: items.length,
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price })),
        timestamp: Date.now(),
      },
    });
  }
}

// Track feature usage
function trackFeatureUsage(featureName, action) {
  if (window.PagePulse) {
    window.PagePulse.trackEvent({
      eventType: 'feature-usage',
      eventName: action,
      metadata: {
        feature: featureName,
        timestamp: Date.now(),
      },
    });
  }
}
```

---

## TypeScript Definitions

```typescript
// pagepulse.d.ts
interface PagePulseConfig {
  apiUrl: string;
  projectId: string;
  recordSessions?: boolean;
  captureConsole?: boolean;
  captureNetwork?: boolean;
  maskInputSelectors?: string[];
  blockSelectors?: string[];
  sessionSampleRate?: number;
}

interface PagePulseEvent {
  eventType: string;
  eventName: string;
  metadata?: Record<string, any>;
}

interface PagePulse {
  trackPageView(data: { url: string; title?: string; referrer?: string }): void;
  trackEvent(event: PagePulseEvent): void;
  trackError(error: { message: string; stack?: string; type?: string }): void;
  identify(userId: string, traits?: Record<string, any>): void;
  startRecording(): void;
  stopRecording(): void;
  enableRecording(): void;
  disableRecording(): void;
}

declare global {
  interface Window {
    PagePulse: PagePulse;
    PagePulseConfig: PagePulseConfig;
  }
}

export {};
```

---

## Best Practices

1. **Lazy Load the SDK**: Load PagePulse asynchronously to avoid blocking page load.
2. **Respect User Privacy**: Always implement consent management for GDPR/CCPA compliance.
3. **Mask Sensitive Data**: Use `maskInputSelectors` and `blockSelectors` to protect PII.
4. **Sample Sessions**: Use `sessionSampleRate` (0-1) to reduce data volume in high-traffic apps.
5. **Monitor Bundle Size**: Keep the SDK script async to maintain performance.
6. **Test Before Deploy**: Verify tracking works in dev/staging before production.

---

## Support

For issues or questions:
- GitHub: [PagePulse Repository](https://github.com/brained-app/NEURATHON-PagePulse)
- Email: support@pagepulse.io
