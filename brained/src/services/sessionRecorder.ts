/**
 * Session Recorder using rrweb
 * 
 * Handles DOM recording, event capture, privacy filtering, and batched uploads
 * for session replay functionality.
 * 
 * Features:
 * - Full rrweb recording with privacy filtering
 * - Console log capture via official plugin
 * - Network request tracking
 * - Error capture
 * - Checkout for error recovery
 * - Event compression for bandwidth optimization
 * - Font and image inlining
 */

import { record, pack } from 'rrweb';
import { getRecordConsolePlugin } from '@rrweb/rrweb-plugin-console-record';
import axios from 'axios';
import { maskInputOptions, maskTextOptions } from './privacyFilter.js';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface RecorderOptions {
  sessionId: string;
  userId?: string;
  projectId?: string;
  onError?: (error: Error) => void;
  checkoutEveryNms?: number; // Checkout every N milliseconds for error recovery
}

interface SessionMetadata {
  url: string;
  title: string;
  device: {
    deviceType: string;
    browser: string;
    os: string;
    screen: string;
  };
}

// Checkout management - store multiple event arrays for error recovery
interface CheckoutState {
  eventsMatrix: any[][];
  currentIndex: number;
}

class SessionRecorder {
  private stopFn: (() => void) | undefined;
  private eventBuffer: any[] = [];
  private consoleLogs: any[] = [];
  private networkRequests: any[] = [];
  private errors: any[] = [];
  
  // Checkout state for error recovery
  private checkoutState: CheckoutState = {
    eventsMatrix: [[]],
    currentIndex: 0,
  };
  
  private sessionId: string;
  private userId?: string;
  private projectId: string;
  private flushInterval: number = 10000; // Flush every 10 seconds
  private flushTimer: number | null = null;
  private maxBufferSize: number = 100; // Auto-flush after 100 events
  private checkoutEveryNms?: number; // Checkout interval
  private checkoutTimer: number | null = null;
  
  private isRecording: boolean = false;
  private onError?: (error: Error) => void;
  
  constructor(options: RecorderOptions) {
    this.sessionId = options.sessionId;
    this.userId = options.userId;
    this.projectId = options.projectId || 'default';
    this.onError = options.onError;
    this.checkoutEveryNms = options.checkoutEveryNms;
  }
  
  /**
   * Start recording with rrweb
   */
  public start(): void {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return;
    }
    
    try {
      console.log('[SessionRecorder] Starting recording for session:', this.sessionId);
      
      // Start rrweb recording with privacy options
      this.stopFn = record({
        emit: (event, isCheckout) => {
          // Handle checkout events for error recovery
          if (isCheckout) {
            this.handleCheckout();
          }
          
          // Add event to current checkout buffer
          const currentEvents = this.checkoutState.eventsMatrix[this.checkoutState.currentIndex];
          currentEvents.push(event);
          
          // Also add to main buffer for regular flushing
          this.eventBuffer.push(event);
          
          if (import.meta.env.DEV) {
            console.log('[rrweb event]', event.type, event);
          }
          
          // Auto-flush if buffer is too large
          if (this.eventBuffer.length >= this.maxBufferSize) {
            this.flush();
          }
        },
        
        // Privacy settings - mask sensitive inputs
        maskInputOptions: maskInputOptions,
        
        // Mask sensitive text content
        maskTextSelector: maskTextOptions.textSelector,
        
        // Block certain elements from being recorded
        blockClass: 'rr-block',
        ignoreClass: 'rr-ignore',
        
        // Capture canvas content (disabled for performance)
        recordCanvas: false,
        
        // Capture input values (masked by maskInputOptions)
        maskAllInputs: false,
        
        // Font collection for accurate replay
        collectFonts: true,
        
        // Inline images for complete replay
        inlineImages: true,
        
        // Inline stylesheets
        inlineStylesheet: true,
        
        // Performance settings
        sampling: {
          // Throttle mouse movement to reduce events
          mousemove: true,
          // Only capture significant scroll events
          scroll: 150, // ms
          // Capture all media interactions
          media: 800,
        },
        
        // Slim DOM options to reduce data
        slimDOMOptions: {
          script: true, // Remove script tags
          comment: true, // Remove comments
          headFavicon: true,
          headWhitespace: true,
          headMetaSocial: true,
          headMetaRobots: true,
          headMetaHttpEquiv: true,
          headMetaAuthorship: true,
        },
        
        // Capture iframe content (disabled for security)
        recordCrossOriginIframes: false,
        
        // Checkout for error recovery (every 5 minutes)
        checkoutEveryNms: this.checkoutEveryNms || 5 * 60 * 1000,
        
        // Plugins
        plugins: [
          // Official console recording plugin
          getRecordConsolePlugin({
            level: ['log', 'warn', 'error', 'info', 'debug'],
            lengthThreshold: 10000,
            stringifyOptions: {
              stringLengthLimit: 1000,
              numOfKeysLimit: 50,
              depthOfLimit: 10,
            },
          }),
        ],
        
        // Hooks for custom event handling
        hooks: {
          // Custom mutation handling can be added here if needed
        },
        
        // Don't pack during recording - we'll pack before sending to backend
        // packFn: pack,
      });
      
      this.isRecording = true;
      
      // Setup network request capture (still needed for network tab)
      this.setupNetworkCapture();
      
      // Setup error capture
      this.setupErrorCapture();
      
      // Start flush timer
      this.flushTimer = window.setInterval(() => {
        this.flush();
      }, this.flushInterval);
      
      // Flush on page unload
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      
      console.log('[SessionRecorder] Recording started successfully with full rrweb features');
      
    } catch (error) {
      console.error('[SessionRecorder] Failed to start recording:', error);
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }
    }
  }
  
  /**
   * Handle checkout event for error recovery
   */
  private handleCheckout(): void {
    console.log('[SessionRecorder] Checkpoint created for error recovery');
    
    // Create a new events array for the next checkpoint period
    this.checkoutState.eventsMatrix.push([]);
    this.checkoutState.currentIndex++;
    
    // Keep only the last 2 checkpoints to manage memory
    // This gives us the last 5-10 minutes of events (depending on checkoutEveryNms)
    if (this.checkoutState.eventsMatrix.length > 2) {
      this.checkoutState.eventsMatrix.shift();
      this.checkoutState.currentIndex = this.checkoutState.eventsMatrix.length - 1;
    }
  }
  
  /**
   * Get events from last N checkouts (for error recovery)
   */
  public getLastCheckoutEvents(): any[] {
    // Return events from the last 2 checkout periods
    if (this.checkoutState.eventsMatrix.length >= 2) {
      const len = this.checkoutState.eventsMatrix.length;
      return [
        ...this.checkoutState.eventsMatrix[len - 2],
        ...this.checkoutState.eventsMatrix[len - 1],
      ];
    }
    return this.checkoutState.eventsMatrix[this.checkoutState.currentIndex] || [];
  }
  
  /**
   * Stop recording and flush remaining events
   */
  public stop(): void {
    if (!this.isRecording) {
      return;
    }
    
    console.log('[SessionRecorder] Stopping recording');
    
    // Stop rrweb recording
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = undefined;
    }
    
    // Clear flush timer
    if (this.flushTimer) {
      window.clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Clear checkout timer
    if (this.checkoutTimer) {
      window.clearInterval(this.checkoutTimer);
      this.checkoutTimer = null;
    }
    
    // Remove event listeners
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.removeNetworkCapture();
    this.removeErrorCapture();
    
    // Flush remaining events
    this.flush();
    
    // Mark session as complete
    this.markSessionComplete();
    
    this.isRecording = false;
    
    console.log('[SessionRecorder] Recording stopped');
  }
  
  /**
   * Flush events to backend
   */
  private flush = async (): Promise<void> => {
    if (this.eventBuffer.length === 0 && this.consoleLogs.length === 0 && this.networkRequests.length === 0) {
      return;
    }
    
    const events = [...this.eventBuffer];
    const consoleLogs = [...this.consoleLogs];
    const networkRequests = [...this.networkRequests];
    
    // Clear buffers
    this.eventBuffer = [];
    this.consoleLogs = [];
    this.networkRequests = [];
    
    try {
      const metadata = this.getSessionMetadata();
      
      // Pack events for compression before sending
      const packedEvents = events.length > 0 ? pack(events) : '';
      
      await axios.post(`${API_URL}/api/tracking/session`, {
        sessionId: this.sessionId,
        userId: this.userId || 'anonymous',
        projectId: this.projectId,
        packedEvents, // Send as packed string
        consoleLogs,
        networkRequests,
        metadata,
      });
      
      if (import.meta.env.DEV) {
        console.log('[SessionRecorder] Flushed', events.length, 'events (packed),', consoleLogs.length, 'logs,', networkRequests.length, 'requests');
      }
      
    } catch (error) {
      console.error('[SessionRecorder] Failed to flush events:', error);
      
      // Put events back in buffer on failure
      this.eventBuffer.unshift(...events);
      this.consoleLogs.unshift(...consoleLogs);
      this.networkRequests.unshift(...networkRequests);
      
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }
    }
  };
  
  /**
   * Get current session metadata
   */
  private getSessionMetadata(): SessionMetadata {
    // Simple device detection
    const getDeviceType = (): string => {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
      }
      if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
      }
      return 'desktop';
    };
    
    const getBrowser = (): string => {
      const ua = navigator.userAgent;
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Edg')) return 'Edge';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
      return 'Unknown';
    };
    
    const getOS = (): string => {
      const ua = navigator.userAgent;
      if (ua.includes('Win')) return 'Windows';
      if (ua.includes('Mac')) return 'MacOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
      return 'Unknown';
    };
    
    return {
      url: window.location.href,
      title: document.title,
      device: {
        deviceType: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        screen: `${window.screen.width}x${window.screen.height}`,
      },
    };
  }
  
  /**
   * Setup network request capture
   */
  private originalFetch = window.fetch;
  private originalXHROpen = XMLHttpRequest.prototype.open;
  private originalXHRSend = XMLHttpRequest.prototype.send;
  
  private setupNetworkCapture(): void {
    // Capture fetch requests
    const self = this;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
      const method = args[1]?.method || 'GET';
      
      try {
        const response = await self.originalFetch.apply(window, args);
        const duration = Date.now() - startTime;
        
        self.networkRequests.push({
          timestamp: startTime,
          method,
          url,
          status: response.status,
          duration,
          type: 'fetch',
        });
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        self.networkRequests.push({
          timestamp: startTime,
          method,
          url,
          status: 0,
          duration,
          type: 'fetch',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        throw error;
      }
    };
    
    // Capture XMLHttpRequest
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      (this as any)._rrwebStartTime = Date.now();
      (this as any)._rrwebMethod = method;
      (this as any)._rrwebUrl = url;
      return self.originalXHROpen.apply(this, [method, url, ...args] as any);
    };
    
    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this;
      
      xhr.addEventListener('loadend', function() {
        const duration = Date.now() - (xhr as any)._rrwebStartTime;
        
        self.networkRequests.push({
          timestamp: (xhr as any)._rrwebStartTime,
          method: (xhr as any)._rrwebMethod,
          url: (xhr as any)._rrwebUrl,
          status: xhr.status,
          duration,
          type: 'xhr',
        });
      });
      
      return self.originalXHRSend.apply(this, [body]);
    };
  }
  
  private removeNetworkCapture(): void {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    XMLHttpRequest.prototype.send = this.originalXHRSend;
  }
  
  /**
   * Setup error capture
   */
  private errorHandler = (event: ErrorEvent): void => {
    this.errors.push({
      timestamp: Date.now(),
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      type: 'error',
    });
  };
  
  private rejectionHandler = (event: PromiseRejectionEvent): void => {
    this.errors.push({
      timestamp: Date.now(),
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      type: 'unhandledrejection',
    });
  };
  
  private setupErrorCapture(): void {
    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.rejectionHandler);
  }
  
  private removeErrorCapture(): void {
    window.removeEventListener('error', this.errorHandler);
    window.removeEventListener('unhandledrejection', this.rejectionHandler);
  }
  
  /**
   * Handle page unload
   */
  private handleBeforeUnload = (): void => {
    // Flush remaining events synchronously
    if (this.eventBuffer.length > 0 || this.consoleLogs.length > 0 || this.networkRequests.length > 0) {
      // Use sendBeacon for reliable delivery on page unload
      const metadata = this.getSessionMetadata();
      const payload = {
        sessionId: this.sessionId,
        userId: this.userId || 'anonymous',
        projectId: this.projectId,
        events: this.eventBuffer,
        consoleLogs: this.consoleLogs,
        networkRequests: this.networkRequests,
        metadata,
      };
      
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/api/tracking/session`, blob);
      
      this.eventBuffer = [];
      this.consoleLogs = [];
      this.networkRequests = [];
    }
  };
  
  /**
   * Mark session as complete
   */
  private async markSessionComplete(): Promise<void> {
    try {
      await axios.post(`${API_URL}/api/tracking/session/${this.sessionId}/complete`);
    } catch (error) {
      console.error('[SessionRecorder] Failed to mark session complete:', error);
    }
  }
  
  /**
   * Get recording status
   */
  public isActive(): boolean {
    return this.isRecording;
  }
  
  /**
   * Get current event count
   */
  public getEventCount(): number {
    return this.eventBuffer.length;
  }
}

export default SessionRecorder;
export type { RecorderOptions, SessionMetadata };
