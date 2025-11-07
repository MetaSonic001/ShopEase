import axios from 'axios';
import SessionRecorder from './sessionRecorder';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface AnalyticsEvent {
  eventType: 'click' | 'hover' | 'scroll' | 'scroll_depth' | 'mousemove' | 'input' | 'submit' | 'pageview' | 'custom';
  eventName: string;
  pageURL: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

interface AnalyticsManagerConfig {
  batchSize?: number;
  flushInterval?: number;
  mouseMoveThrottle?: number;
  scrollThrottle?: number;
  enableSessionRecording?: boolean;
  enableHeatmaps?: boolean;
  privacy?: {
    maskAllInputs?: boolean;
    maskTextClass?: string;
    blockClass?: string;
  };
}

class AnalyticsManager {
  private sessionId: string;
  private userId: string | null = null;
  private projectId: string = 'default';

  // Event batching
  private eventQueue: AnalyticsEvent[] = [];
  private batchSize: number = 20;
  private flushInterval: number = 5000;
  private flushTimer: number | null = null;

  // Throttling
  private lastMouseMove: number = 0;
  private lastScroll: number = 0;
  private mouseMoveThrottle: number = 100;
  private scrollThrottle: number = 500;
  private maxScrollDepth: number = 0; // track maximum depth reached during page lifecycle

  // Session recording (rrweb)
  private sessionRecorder: SessionRecorder | null = null;

  // Engagement tracking
  private pageLoadTime: number = 0;
  private lastActivityTime: number = 0;
  private isPageVisible: boolean = true;
  private activeTime: number = 0;
  private activeTimeInterval: number | null = null;

  // Hover tracking
  private hoverStartTime: Map<HTMLElement, number> = new Map();
  private hoverThreshold: number = 1000; // 1 second
  private lastHoverEmitTime: WeakMap<HTMLElement, number> = new WeakMap();
  private minHoverEmitGapMs: number = 1500; // avoid spamming same element

  // Config
  private config: AnalyticsManagerConfig;

  constructor(config: AnalyticsManagerConfig = {}) {
    this.config = {
      batchSize: 20,
      flushInterval: 5000,
      mouseMoveThrottle: 100,
      scrollThrottle: 500,
      enableSessionRecording: true,
      enableHeatmaps: true,
      privacy: {
        maskAllInputs: true,
        maskTextClass: 'mask',
        blockClass: 'block',
      },
      ...config,
    };

    this.batchSize = this.config.batchSize!;
    this.flushInterval = this.config.flushInterval!;
    this.mouseMoveThrottle = this.config.mouseMoveThrottle!;
    this.scrollThrottle = this.config.scrollThrottle!;

    this.sessionId = this.getOrCreateSessionId();
    this.userId = this.loadUserIdFromStorage();
    this.pageLoadTime = Date.now();
    this.lastActivityTime = Date.now();

    this.initialize();
  }

  private initialize(): void {
    // Only initialize in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('AnalyticsManager can only be initialized in browser environment');
      return;
    }

    // Don't track admin dashboard activities
    if (this.isAdminPath()) {
      console.log('Analytics tracking disabled for admin dashboard');
      return;
    }

    this.setupEventListeners();
    this.startFlushTimer();
    this.startEngagementTracking();
    this.trackPageView();

    // Start session recording if enabled (SessionRecorder handles console/network interception)
    if (this.config.enableSessionRecording) {
      this.startSessionRecording();
    }
  }

  private isAdminPath(): boolean {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    return path.startsWith('/admin') || path.startsWith('/login');
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private loadUserIdFromStorage(): string | null {
    return localStorage.getItem('analytics_user_id') || null;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private setupEventListeners(): void {
    // Click tracking
    document.addEventListener('click', (e) => this.handleClick(e), true);

    // Mouse move tracking (for heatmaps)
    if (this.config.enableHeatmaps) {
      document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    // Scroll tracking
    document.addEventListener('scroll', () => this.handleScroll(), true);

    // Hover tracking
    document.addEventListener('mouseover', (e) => this.handleMouseOver(e), true);
    document.addEventListener('mouseout', (e) => this.handleMouseOut(e), true);

    // Form input tracking
    document.addEventListener('input', (e) => this.handleInput(e), true);

    // Form submit tracking
    document.addEventListener('submit', (e) => this.handleSubmit(e), true);

    // Page visibility tracking
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

    // Beforeunload - flush before leaving
    window.addEventListener('beforeunload', () => {
      this.flushEvents(true);
      this.stopSessionRecording();
    });

    // Page resize
    window.addEventListener('resize', () => this.handleResize());

    // Error tracking
    window.addEventListener('error', (e) => this.handleError(e));
    window.addEventListener('unhandledrejection', (e) => this.handlePromiseRejection(e));
  }

  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    this.queueEvent({
      eventType: 'click',
      eventName: 'click',
      pageURL: window.location.href,
      metadata: {
        element: target.tagName.toLowerCase(),
        elementId: target.id || undefined,
        className: target.className || undefined,
        text: target.innerText?.substring(0, 100) || undefined,
        x: e.clientX,
        y: e.clientY,
        vw: (e.clientX / window.innerWidth) * 100,
        vh: (e.clientY / window.innerHeight) * 100,
        pageTitle: document.title,
        device: this.getDeviceType(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
    });

    this.updateLastActivity();
  }

  private handleMouseMove(e: MouseEvent): void {
    const now = Date.now();
    if (now - this.lastMouseMove < this.mouseMoveThrottle) return;

    this.lastMouseMove = now;

    if (this.config.enableHeatmaps) {
      this.queueEvent({
        eventType: 'mousemove',
        eventName: 'mousemove',
        pageURL: window.location.href,
        metadata: {
          x: e.clientX,
          y: e.clientY,
          device: this.getDeviceType(),
        },
      });
    }

    this.updateLastActivity();
  }

  private handleScroll(): void {
    const now = Date.now();
    if (now - this.lastScroll < this.scrollThrottle) return;

    this.lastScroll = now;

    const scrollDepth = this.getScrollDepth();

    // Update max scroll depth for milestone emission & final engagement summary
    if (scrollDepth > this.maxScrollDepth) {
      this.maxScrollDepth = scrollDepth;
      this.emitScrollDepthMilestone(this.maxScrollDepth);
    }

    this.queueEvent({
      eventType: 'scroll',
      eventName: 'scroll',
      pageURL: window.location.href,
      metadata: {
        scrollDepth: Math.round(scrollDepth),
        scrollTop: window.scrollY,
        scrollLeft: window.scrollX,
        pageTitle: document.title,
        device: this.getDeviceType(),
      },
    });

    this.updateLastActivity();
  }

  /**
   * Emit a milestone event when user surpasses specific scroll depth thresholds.
   * Milestones: 25, 50, 75, 90, 100
   */
  private emitScrollDepthMilestone(depth: number): void {
    const rounded = Math.floor(depth);
    const milestones = [25, 50, 75, 90, 100];
    if (!milestones.includes(rounded)) return;

    this.queueEvent({
      eventType: 'scroll_depth',
      eventName: 'scroll_depth_milestone',
      pageURL: window.location.href,
      metadata: {
        milestone: rounded,
        pageTitle: document.title,
        device: this.getDeviceType(),
      },
    });
  }

  private handleMouseOver(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Skip if already tracking this element
    if (this.hoverStartTime.has(target)) return;

    this.hoverStartTime.set(target, Date.now());
  }

  private handleMouseOut(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const startTime = this.hoverStartTime.get(target);

    if (!startTime) return;

    const hoverDuration = Date.now() - startTime;
    this.hoverStartTime.delete(target);

    // Only track hovers longer than threshold
    if (hoverDuration < this.hoverThreshold) return;

    // De-duplicate rapid repeat hover events on same element
    const lastEmit = this.lastHoverEmitTime.get(target) || 0;
    if (Date.now() - lastEmit < this.minHoverEmitGapMs) return;
    this.lastHoverEmitTime.set(target, Date.now());

    const attrs = this.extractElementAttributes(target);
    const selector = this.computeSelector(target);

    this.queueEvent({
      eventType: 'hover',
      eventName: 'hover',
      pageURL: window.location.href,
      metadata: {
        element: target.tagName.toLowerCase(),
        elementId: target.id || undefined,
        className: target.className || undefined,
        selector,
        role: attrs.role,
        ariaLabel: attrs.ariaLabel,
        dataTrack: attrs.dataTrack,
        dataTestId: attrs.dataTestId,
        name: attrs.name,
        type: attrs.type,
        text: target.innerText?.substring(0, 100) || undefined,
        hoverDuration,
        pageTitle: document.title,
        device: this.getDeviceType(),
      },
    });
  }

  private handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;

    // Skip password inputs for security
    if (target.type === 'password' || target.type === 'hidden') return;

    this.queueEvent({
      eventType: 'input',
      eventName: 'input',
      pageURL: window.location.href,
      metadata: {
        element: target.tagName.toLowerCase(),
        elementId: target.id || undefined,
        inputType: target.type,
        // Don't capture actual value for privacy
        hasValue: target.value.length > 0,
        pageTitle: document.title,
        device: this.getDeviceType(),
      },
    });

    this.updateLastActivity();
  }

  private handleSubmit(e: Event): void {
    const target = e.target as HTMLFormElement;

    this.queueEvent({
      eventType: 'submit',
      eventName: 'form_submit',
      pageURL: window.location.href,
      metadata: {
        element: 'form',
        elementId: target.id || undefined,
        className: target.className || undefined,
        action: target.action,
        method: target.method,
        pageTitle: document.title,
        device: this.getDeviceType(),
      },
    });
  }

  private handleVisibilityChange(): void {
    this.isPageVisible = !document.hidden;

    this.queueEvent({
      eventType: 'custom',
      eventName: document.hidden ? 'page_hidden' : 'page_visible',
      pageURL: window.location.href,
      metadata: {
        pageTitle: document.title,
        timeOnPage: this.getTimeOnPage(),
        activeTimeSeconds: this.getActiveTime(),
        maxScrollDepth: Math.round(this.maxScrollDepth),
      },
    });
  }

  private handleResize(): void {
    this.queueEvent({
      eventType: 'custom',
      eventName: 'resize',
      pageURL: window.location.href,
      metadata: {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
    });
  }

  private handleError(e: ErrorEvent): void {
    this.queueEvent({
      eventType: 'custom',
      eventName: 'error',
      pageURL: window.location.href,
      metadata: {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      },
    });
  }

  private handlePromiseRejection(e: PromiseRejectionEvent): void {
    this.queueEvent({
      eventType: 'custom',
      eventName: 'promise_rejection',
      pageURL: window.location.href,
      metadata: {
        reason: String(e.reason),
      },
    });
  }

  private updateLastActivity(): void {
    this.lastActivityTime = Date.now();
  }

  private getScrollDepth(): number {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;

    if (documentHeight <= windowHeight) return 100;

    return (scrollTop / (documentHeight - windowHeight)) * 100;
  }

  private getTimeOnPage(): number {
    return Math.floor((Date.now() - this.pageLoadTime) / 1000);
  }

  // Build a short but stable-ish selector for an element
  private computeSelector(el: HTMLElement): string {
    try {
      const parts: string[] = [];
      let node: HTMLElement | null = el;
      let depth = 0;
      while (node && depth < 5) {
        const tag = node.tagName.toLowerCase();
        const id = node.id ? `#${node.id}` : '';
        const cls = (node.className && typeof node.className === 'string')
          ? '.' + node.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        parts.unshift(`${tag}${id}${cls}`);
        node = node.parentElement;
        depth++;
      }
      return parts.join(' > ');
    } catch {
      return el.tagName.toLowerCase();
    }
  }

  // Extract commonly useful attributes for analytics
  private extractElementAttributes(el: HTMLElement): Record<string, any> {
    return {
      role: el.getAttribute('role') || undefined,
      ariaLabel: el.getAttribute('aria-label') || undefined,
      dataTrack: el.getAttribute('data-pagepulse-track') || el.getAttribute('data-pp-track') || undefined,
      dataTestId: el.getAttribute('data-testid') || undefined,
      name: (el as HTMLInputElement).name || undefined,
      type: (el as HTMLInputElement).type || undefined,
    };
  }

  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }

  private queueEvent(event: AnalyticsEvent): void {
    event.timestamp = Date.now();
    this.eventQueue.push(event);

    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  private flushEvents(sync: boolean = false): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    const payload = {
      sessionId: this.sessionId,
      userId: this.userId,
      projectId: this.projectId,
      interactions: events.map((e) => ({
        sessionId: this.sessionId,
        userId: this.userId,
        projectId: this.projectId,
        eventType: e.eventType,
        eventName: e.eventName,
        pageURL: e.pageURL,
        metadata: e.metadata,
        timestamp: e.timestamp,
      })),
    };

    if (sync) {
      // Use sendBeacon for synchronous sending on page unload
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/api/tracking/interactions/batch`, blob);
    } else {
      axios
        .post(`${API_URL}/api/tracking/interactions/batch`, payload)
        .catch((err) => {
          console.error('Failed to flush events:', err);
          // Put events back in queue on failure
          this.eventQueue.unshift(...events);
        });
    }
  }

  private startEngagementTracking(): void {
    this.activeTimeInterval = window.setInterval(() => {
      if (this.isPageVisible) {
        const timeSinceLastActivity = Date.now() - this.lastActivityTime;
        // Consider user idle after 30 seconds of no activity
        if (timeSinceLastActivity < 30000) {
          this.activeTime += 1;
        }
      }
    }, 1000);
  }

  // Session recording methods (using SessionRecorder)
  private startSessionRecording(): void {
    if (this.sessionRecorder) {
      console.log('[AnalyticsManager] Session recording already started');
      return;
    }

    try {
      this.sessionRecorder = new SessionRecorder({
        sessionId: this.sessionId,
        userId: this.userId || undefined,
        projectId: this.projectId,
        checkoutEveryNms: 5 * 60 * 1000, // Checkpoint every 5 minutes for error recovery
      });
      this.sessionRecorder.start();
      console.log('[AnalyticsManager] Session recording started via SessionRecorder with checkpoints');
    } catch (error) {
      console.error('[AnalyticsManager] Failed to start session recording:', error);
      this.sessionRecorder = null;
    }
  }

  private stopSessionRecording(): void {
    if (!this.sessionRecorder) {
      return;
    }

    try {
      this.sessionRecorder.stop();
      this.sessionRecorder = null;
      console.log('[AnalyticsManager] Session recording stopped');
    } catch (error) {
      console.error('[AnalyticsManager] Failed to stop session recording:', error);
    }
  }

  // Public API
  public trackPageView(url?: string): void {
    // Don't track admin pages
    if (this.isAdminPath()) {
      return;
    }

    this.pageLoadTime = Date.now();
    this.maxScrollDepth = 0; // reset per pageview

    this.queueEvent({
      eventType: 'pageview',
      eventName: 'pageview',
      pageURL: url || window.location.href,
      metadata: {
        referrer: document.referrer || undefined,
        pageTitle: document.title,
        device: this.getDeviceType(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
    });
  }

  public trackCustomEvent(eventName: string, properties?: Record<string, any>): void {
    // Don't track admin pages
    if (this.isAdminPath()) {
      return;
    }

    this.queueEvent({
      eventType: 'custom',
      eventName,
      pageURL: window.location.href,
      metadata: {
        ...properties,
        pageTitle: document.title,
        device: this.getDeviceType(),
      },
    });
  }

  public identify(userId: string, properties?: Record<string, any>): void {
    // Don't identify admin users or on admin paths
    if (this.isAdminPath() || properties?.role === 'admin') {
      console.log('Skipping identification for admin user');
      return;
    }

    this.userId = userId;
    localStorage.setItem('analytics_user_id', userId);

    this.trackCustomEvent('identify', {
      userId,
      ...properties,
    });
  }

  public reset(): void {
    this.userId = null;
    localStorage.removeItem('analytics_user_id');
    this.sessionId = this.generateUUID();
    sessionStorage.setItem('analytics_session_id', this.sessionId);
    this.eventQueue = [];
    this.stopSessionRecording();
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.activeTimeInterval) {
      clearInterval(this.activeTimeInterval);
    }
    // Emit final engagement & scroll depth summary before teardown
    this.queueEvent({
      eventType: 'custom',
      eventName: 'engagement_summary',
      pageURL: window.location.href,
      metadata: {
        activeTimeSeconds: this.getActiveTime(),
        totalTimeSeconds: this.getTimeOnPage(),
        maxScrollDepth: Math.round(this.maxScrollDepth),
        pageTitle: document.title,
        device: this.getDeviceType(),
      },
    });
    this.flushEvents(true);
    this.stopSessionRecording();
  }

  // Getters
  public getSessionId(): string {
    return this.sessionId;
  }

  public getUserId(): string | null {
    return this.userId;
  }

  public getActiveTime(): number {
    return this.activeTime;
  }

  /**
   * Helper for external callers to manually flush engagement summary without destroying manager
   */
  public emitEngagementSnapshot(): void {
    this.queueEvent({
      eventType: 'custom',
      eventName: 'engagement_snapshot',
      pageURL: window.location.href,
      metadata: {
        activeTimeSeconds: this.getActiveTime(),
        totalTimeSeconds: this.getTimeOnPage(),
        maxScrollDepth: Math.round(this.maxScrollDepth),
        pageTitle: document.title,
        device: this.getDeviceType(),
      },
    });
  }
}

// Export singleton instance
const analyticsManager = new AnalyticsManager({
  batchSize: 20,
  flushInterval: 5000,
  // IMPORTANT: disable rrweb session recording by default.
  // Live recording is controlled via the admin "Start Recording" action.
  enableSessionRecording: false,
  enableHeatmaps: true,
});

export default analyticsManager;
export { AnalyticsManager };
