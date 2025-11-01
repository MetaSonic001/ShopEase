/**
 * PagePulse Analytics SDK
 * Lightweight tracking script for client websites
 * Usage: <script src="https://yourserver.com/pagepulse.js" data-project-id="your-project-id"></script>
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    apiUrl: window.PAGEPULSE_API_URL || 'http://localhost:5000/api',
    projectId: document.currentScript?.getAttribute('data-project-id') || 'default',
    sessionId: null,
    userId: null,
    autoTrack: true,
  };

  // Utility functions
  const utils = {
    generateId: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    getDeviceInfo: () => {
      const ua = navigator.userAgent;
      let deviceType = 'desktop';
      
      if (/mobile/i.test(ua)) deviceType = 'mobile';
      else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

      return {
        type: deviceType,
        browser: navigator.userAgent.split(' ').pop(),
        os: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
      };
    },

    getLocation: () => {
      // In production, use IP geolocation service
      return {
        country: 'Unknown',
        city: 'Unknown',
        ip: 'Unknown',
      };
    },

    getUTMParams: () => {
      const params = new URLSearchParams(window.location.search);
      return {
        utmSource: params.get('utm_source'),
        utmMedium: params.get('utm_medium'),
        utmCampaign: params.get('utm_campaign'),
      };
    },

    sendBeacon: async (endpoint, data) => {
      try {
        const url = `${config.apiUrl}${endpoint}`;
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, JSON.stringify(data));
        } else {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true,
          });
        }
      } catch (error) {
        console.error('PagePulse tracking error:', error);
      }
    },
  };

  // Session management
  const session = {
    start: async () => {
      // Check if session exists in localStorage
      const storedSessionId = localStorage.getItem('pagepulse_session');
      const storedUserId = localStorage.getItem('pagepulse_user');
      
      if (storedSessionId) {
        config.sessionId = storedSessionId;
        config.userId = storedUserId;
        return;
      }

      // Create new session
      config.sessionId = utils.generateId();
      config.userId = storedUserId || utils.generateId();

      localStorage.setItem('pagepulse_session', config.sessionId);
      localStorage.setItem('pagepulse_user', config.userId);

      // Send session start event
      await utils.sendBeacon('/sessions/start', {
        userId: config.userId,
        projectId: config.projectId,
        entryPage: window.location.href,
        referrer: document.referrer,
        ...utils.getUTMParams(),
        device: utils.getDeviceInfo(),
        location: utils.getLocation(),
      });
    },

    update: async (pageData) => {
      if (!config.sessionId) return;

      await utils.sendBeacon(`/sessions/${config.sessionId}`, {
        pageURL: pageData.url || window.location.href,
        pageTitle: pageData.title || document.title,
        timeOnPage: pageData.timeOnPage || 0,
        scrollDepth: pageData.scrollDepth || 0,
        exitPage: pageData.exitPage || false,
      });
    },

    end: async () => {
      if (!config.sessionId) return;

      await utils.sendBeacon(`/sessions/${config.sessionId}/end`, {});
      
      // Clear session
      localStorage.removeItem('pagepulse_session');
    },
  };

  // Page tracking
  const pageTracker = {
    startTime: Date.now(),
    maxScroll: 0,

    init: () => {
      // Track page view
      pageTracker.track();

      // Track scroll depth
      window.addEventListener('scroll', pageTracker.trackScroll);

      // Track time on page before leaving
      window.addEventListener('beforeunload', pageTracker.beforeUnload);
    },

    track: () => {
      session.update({
        url: window.location.href,
        title: document.title,
      });
    },

    trackScroll: () => {
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrolled / height) * 100;

      if (scrollPercent > pageTracker.maxScroll) {
        pageTracker.maxScroll = scrollPercent;
      }
    },

    beforeUnload: () => {
      const timeOnPage = Math.floor((Date.now() - pageTracker.startTime) / 1000);
      
      session.update({
        url: window.location.href,
        title: document.title,
        timeOnPage,
        scrollDepth: Math.round(pageTracker.maxScroll),
        exitPage: true,
      });
    },
  };

  // Event tracking
  const eventTracker = {
    init: () => {
      // Track clicks
      document.addEventListener('click', eventTracker.trackClick);

      // Track form submissions
      document.addEventListener('submit', eventTracker.trackFormSubmit);
    },

    trackClick: (e) => {
      const target = e.target;
      
      utils.sendBeacon('/analytics/events', {
        sessionId: config.sessionId,
        userId: config.userId,
        projectId: config.projectId,
        eventType: 'click',
        eventName: 'Element Clicked',
        pageURL: window.location.href,
        metadata: {
          element: target.tagName,
          id: target.id,
          className: target.className,
          text: target.innerText?.substring(0, 50),
          x: e.clientX,
          y: e.clientY,
          vw: window.innerWidth,
          vh: window.innerHeight,
        },
      });
    },

    trackFormSubmit: (e) => {
      const form = e.target;
      
      utils.sendBeacon('/analytics/events', {
        sessionId: config.sessionId,
        userId: config.userId,
        projectId: config.projectId,
        eventType: 'form_submit',
        eventName: 'Form Submitted',
        pageURL: window.location.href,
        metadata: {
          formId: form.id,
          formAction: form.action,
        },
      });
    },

    track: (eventName, metadata = {}) => {
      utils.sendBeacon('/analytics/events', {
        sessionId: config.sessionId,
        userId: config.userId,
        projectId: config.projectId,
        eventType: 'custom',
        eventName,
        pageURL: window.location.href,
        metadata,
      });
    },
  };

  // Performance tracking
  const performanceTracker = {
    init: () => {
      window.addEventListener('load', performanceTracker.track);
    },

    track: () => {
      if (!window.performance || !window.performance.timing) return;

      const timing = window.performance.timing;
      const navigationStart = timing.navigationStart;

      const metrics = {
        sessionId: config.sessionId,
        userId: config.userId,
        projectId: config.projectId,
        pageURL: window.location.href,
        loadTime: timing.loadEventEnd - navigationStart,
        domReadyTime: timing.domContentLoadedEventEnd - navigationStart,
        firstPaint: timing.responseStart - navigationStart,
        dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
        ttfb: timing.responseStart - timing.requestStart,
      };

      setTimeout(() => {
        utils.sendBeacon('/analytics/performance', metrics);
      }, 1000);
    },
  };

  // Public API
  window.PagePulse = {
    init: (options = {}) => {
      Object.assign(config, options);
      
      // Start session
      session.start().then(() => {
        if (config.autoTrack) {
          pageTracker.init();
          eventTracker.init();
          performanceTracker.init();
        }
      });
    },

    track: (eventName, metadata) => {
      eventTracker.track(eventName, metadata);
    },

    identify: (userId, properties = {}) => {
      config.userId = userId;
      localStorage.setItem('pagepulse_user', userId);
      
      eventTracker.track('User Identified', {
        userId,
        ...properties,
      });
    },

    page: (pageName, properties = {}) => {
      pageTracker.track();
      
      eventTracker.track('Page View', {
        pageName: pageName || document.title,
        ...properties,
      });
    },
  };

  // Auto-initialize if script has data-project-id
  if (document.currentScript?.getAttribute('data-project-id')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.PagePulse.init();
      });
    } else {
      window.PagePulse.init();
    }
  }
})();
