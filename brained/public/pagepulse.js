/*
 PagePulse SDK
 Lightweight, privacy‑minded analytics with optional rrweb session recording (lazy‑loaded),
 heatmap API, real‑time admin triggers, and Web Vitals (TTFB, FCP, LCP, CLS, INP/FID).
 Usage:
   <script src="https://YOUR_API_HOST/pagepulse.js"
           data-project-id="default"
           data-api-base="https://YOUR_API_HOST"
           data-autotrack="true"
           data-enable-recording="admin"      <!-- values: false|true|admin|manual -->
           data-enable-live="true"            <!-- listen for admin start/stop via WebSocket -->
           data-mask-inputs="true"            <!-- rrweb: mask all inputs -->
           data-block-selectors=".pp-block,.no-record"  <!-- rrweb: block these selectors -->
   ></script>
   JS API on window.PagePulse: init, page, track, identify, setSuperProperties, optOut, optIn,
   startRecording, stopRecording, showHeatmap, hideHeatmap, enableLiveTriggers, disableLiveTriggers.
*/
(function () {
  var PagePulse = window.PagePulse || {};
  var _sessionId = null;
  var _userId = null;
  var _projectId = 'default';
  var _apiBase = '';
  var _autotrack = true;
  var _trackedPerformance = false;
  var _superProps = {};
  var _enableRecording = 'false'; // 'false' | 'true' | 'admin' | 'manual'
  var _enableLive = false; // listen to admin triggers
  var _maskAllInputs = true;
  var _blockSelectors = [];
  var _rrStop = null; // rrweb stop function
  var _rrBuffer = []; // buffered rrweb events when socket unavailable
  var _socket = null;
  var _socketConnected = false;
  var _heatmapCanvas = null;
  var _heatmapCtx = null;

  // --- utils ---
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function shouldTrack() {
    try { if (localStorage.getItem('analytics_opt_out') === 'true') return false; } catch (e) {}
    return true;
  }

  function currentScript() {
    var s = document.currentScript; if (s) return s;
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  }

  function initFromTag() {
    var script = currentScript();
    var src = script && script.getAttribute('src');
    var origin = '';
    try { origin = new URL(src, window.location.href).origin; } catch (e) {}
    _apiBase = script.getAttribute('data-api-base') || origin;
    _projectId = script.getAttribute('data-project-id') || 'default';
    var at = script.getAttribute('data-autotrack');
    _autotrack = at == null ? true : at === 'true';
    _enableRecording = (script.getAttribute('data-enable-recording') || 'false').toLowerCase();
    _enableLive = (script.getAttribute('data-enable-live') || (_enableRecording === 'admin' ? 'true' : 'false')).toLowerCase() === 'true';
    _maskAllInputs = (script.getAttribute('data-mask-inputs') || 'true').toLowerCase() === 'true';
    var bs = script.getAttribute('data-block-selectors');
    _blockSelectors = bs ? bs.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
  }

  function ensureSession() {
    try {
      var s = localStorage.getItem('pagepulse_session');
      if (!s) { s = uuid(); localStorage.setItem('pagepulse_session', s); }
      _sessionId = s;
      var u = localStorage.getItem('pagepulse_userId');
      if (u) _userId = u;
    } catch (e) { _sessionId = uuid(); }
  }

  function postJSON(url, body) {
    try {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
        credentials: 'include'
      }).catch(function () {});
    } catch (e) {}
  }

  function loadScriptOnce(url, globalName) {
    return new Promise(function (resolve, reject) {
      if (globalName && window[globalName]) return resolve(window[globalName]);
      var el = document.createElement('script');
      el.src = url; el.async = true; el.onload = function () { resolve(window[globalName]); };
      el.onerror = reject; document.head.appendChild(el);
    });
  }

  function applyBlockSelectors() {
    if (!_blockSelectors || !_blockSelectors.length) return;
    try {
      _blockSelectors.forEach(function (sel) {
        try { document.querySelectorAll(sel).forEach(function (n) { n.setAttribute('data-rr-block', ''); }); } catch (e) {}
      });
    } catch (e) {}
  }

  // --- core event capture ---
  function captureEvent(payload) {
    if (!shouldTrack()) return;
    payload = payload || {};
    var body = {
      sessionId: _sessionId,
      userId: _userId || 'anonymous',
      projectId: _projectId,
      eventType: payload.eventType || payload.eventName || 'custom',
      eventName: payload.eventName || payload.eventType || 'custom',
      pageURL: payload.pageURL || window.location.href,
      metadata: Object.assign({}, payload.metadata || {}, _superProps || {}),
      timestamp: new Date().toISOString()
    };
    postJSON(_apiBase + '/api/tracking/interactions', body);
  }

  function onClick(e) {
    var t = e.target || e.srcElement; if (!t || !shouldTrack()) return;
    captureEvent({
      eventType: 'click', eventName: 'click', pageURL: window.location.href,
      metadata: {
        element: (t.tagName || '').toLowerCase(), id: t.id || undefined, className: t.className || undefined,
        text: (t.innerText || '').slice(0, 80), x: e.clientX, y: e.clientY,
        vw: Math.round((e.clientX / (window.innerWidth || 1)) * 100),
        vh: Math.round((e.clientY / (window.innerHeight || 1)) * 100)
      }
    });
  }

  function onScroll() {
    if (!shouldTrack()) return;
    if (onScroll._t) clearTimeout(onScroll._t);
    onScroll._t = setTimeout(function () {
      var max = Math.max(1, (document.documentElement.scrollHeight || 1) - (window.innerHeight || 0));
      var depth = Math.round(((window.scrollY || window.pageYOffset || 0) / max) * 100);
      captureEvent({ eventType: 'scroll', eventName: 'scroll', metadata: { scrollDepth: depth } });
    }, 500);
  }

  function onSubmit(e) {
    var form = e.target || e.srcElement; if (!form || !shouldTrack()) return;
    try {
      var fd = new FormData(form); var data = {};
      fd.forEach(function (v, k) { var key = String(k || '').toLowerCase(); if (key.indexOf('password') >= 0 || key.indexOf('card') >= 0) return; data[k] = v; });
      captureEvent({ eventType: 'submit', eventName: 'form_submit', metadata: { element: 'form', id: form.id || undefined, className: form.className || undefined, formData: data } });
    } catch (e) {}
  }

  function capturePageView() {
    captureEvent({ eventType: 'pageview', eventName: 'pageview', metadata: { referrer: document.referrer || undefined, title: document.title } });
  }

  // --- performance (TTFB, FCP, LCP, CLS, INP/FID) ---
  function sendPerformance() {
    if (_trackedPerformance || !shouldTrack()) return;
    _trackedPerformance = true;
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      var metrics = {
        sessionId: _sessionId, userId: _userId || 'anonymous', projectId: _projectId, pageURL: window.location.href,
        TTFB: nav ? nav.responseStart - nav.requestStart : undefined,
        FCP: undefined, LCP: undefined, CLS: 0, INP: 0, FID: 0,
        loadTime: nav ? nav.loadEventEnd - nav.fetchStart : undefined,
        domReadyTime: nav ? nav.domContentLoadedEventEnd - nav.fetchStart : undefined,
        dnsTime: nav ? nav.domainLookupEnd - nav.domainLookupStart : undefined,
        jsErrors: [], apiCalls: [],
        deviceInfo: { device: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop', browser: navigator.userAgent, os: navigator.platform },
        timestamp: new Date().toISOString()
      };

      try {
        if ('PerformanceObserver' in window) {
          var lcpObs = new PerformanceObserver(function (list) { var es = list.getEntries(); var last = es[es.length - 1]; if (last) metrics.LCP = last.renderTime || last.loadTime; });
          lcpObs.observe({ entryTypes: ['largest-contentful-paint'] });

          var fcpObs = new PerformanceObserver(function (list) { var es = list.getEntries(); for (var i = 0; i < es.length; i++) { if (es[i].name === 'first-contentful-paint') metrics.FCP = es[i].startTime; } });
          fcpObs.observe({ entryTypes: ['paint'] });

          var clsObs = new PerformanceObserver(function (list) {
            var cls = 0, sv = 0, se = [];
            list.getEntries().forEach(function (entry) {
              if (!entry.hadRecentInput) {
                if (sv && entry.startTime - (se[se.length - 1] || { startTime: 0 }).startTime < 1000 && entry.startTime - (se[0] || { startTime: 0 }).startTime < 5000) { sv += entry.value; se.push(entry); }
                else { sv = entry.value; se = [entry]; }
                if (sv > cls) cls = sv;
              }
            }); metrics.CLS = cls;
          });
          clsObs.observe({ entryTypes: ['layout-shift'] });

          try {
            var fidObs = new PerformanceObserver(function (list) { var es = list.getEntries(); if (es && es[0]) metrics.FID = es[0].processingStart - es[0].startTime; fidObs.disconnect(); });
            fidObs.observe({ entryTypes: ['first-input'] });
          } catch (e) {}
          try {
            var inpObs = new PerformanceObserver(function (list) { list.getEntries().forEach(function (e) { if (e.duration > (metrics.INP || 0)) metrics.INP = e.duration; }); });
            inpObs.observe({ entryTypes: ['event'], buffered: true });
          } catch (e) {}
        }
      } catch (e) {}

      // Basic API/fetch error logging
      try {
        var ofetch = window.fetch; window.fetch = function () { var start = performance.now(); var args = arguments; return ofetch.apply(this, args).then(function (res) { var dur = performance.now() - start; metrics.apiCalls.push({ url: (typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url)) || '', method: (args[1] && args[1].method) || 'GET', status: res.status, duration: dur, timestamp: new Date().toISOString() }); return res; }).catch(function (err) { var dur = performance.now() - start; metrics.apiCalls.push({ url: (typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url)) || '', method: (args[1] && args[1].method) || 'GET', status: 0, error: String(err && err.message || err), duration: dur, timestamp: new Date().toISOString() }); throw err; }); };
      } catch (e) {}

      window.addEventListener('error', function (ev) { metrics.jsErrors.push({ message: ev.message, source: ev.filename, line: ev.lineno, column: ev.colno, stack: ev.error && ev.error.stack, timestamp: new Date().toISOString() }); });
      window.addEventListener('unhandledrejection', function (ev) { metrics.jsErrors.push({ message: 'Unhandled Promise Rejection: ' + ev.reason, source: 'Promise', timestamp: new Date().toISOString() }); });

      setTimeout(function () { postJSON(_apiBase + '/api/analytics/performance', metrics); }, 2000);
    } catch (e) {}
  }

  // --- rrweb recording (lazy) + admin triggers ---
  function loadRRWeb() { return loadScriptOnce('https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js', 'rrweb'); }
  function loadSocketIO() { return loadScriptOnce((_apiBase || location.origin) + '/socket.io/socket.io.js', 'io'); }

  function connectSocketIfNeeded() {
    if (!_enableLive) return Promise.resolve();
    return loadSocketIO().then(function () {
      if (_socket && _socketConnected) return;
      try {
        _socket = window.io(_apiBase, { transports: ['websocket', 'polling'] });
        _socket.on('connect', function () {
          _socketConnected = true;
          try { _socket.emit('sdk:register', { projectId: _projectId, sessionId: _sessionId, userId: _userId || 'anonymous', pageURL: window.location.href }); } catch (e) {}
          // flush buffered rrweb
          if (_rrBuffer.length) { var buf = _rrBuffer.slice(); _rrBuffer.length = 0; buf.forEach(function (ev) { try { _socket.emit('recording:event', ev); } catch (e) {} }); }
        });
        _socket.on('disconnect', function () { _socketConnected = false; });
        // Support multiple event names from server
        var startHandlers = ['recording-start', 'start-recording', 'recording:start', 'admin:recording:start'];
        var stopHandlers = ['recording-stop', 'stop-recording', 'recording:stop', 'admin:recording:stop'];
        startHandlers.forEach(function (n) { _socket.on(n, function (p) { if (_enableRecording === 'admin' || _enableRecording === 'true') startRecording(p && p.options); }); });
        stopHandlers.forEach(function (n) { _socket.on(n, function () { stopRecording(); }); });
        // Heatmap overlay live triggers
        var showHM = ['heatmap-show', 'admin:heatmap:show'];
        var hideHM = ['heatmap-hide', 'admin:heatmap:hide'];
        showHM.forEach(function (n) { _socket.on(n, function (opts) { try { PagePulse.showHeatmap(opts || {}); } catch (e) {} }); });
        hideHM.forEach(function (n) { _socket.on(n, function () { try { PagePulse.hideHeatmap(); } catch (e) {} }); });
      } catch (e) {}
    }).catch(function () {});
  }

  function startRecording(options) {
    if (_rrStop) return; // already recording
    return loadRRWeb().then(function () {
      applyBlockSelectors();
      try {
        _rrStop = window.rrweb.record({
          emit: function (event) {
            var payload = { projectId: _projectId, sessionId: _sessionId, userId: _userId || 'anonymous', pageURL: window.location.href, event: event, timestamp: Date.now() };
            if (_socket && _socketConnected) {
              try { _socket.emit('recording:event', payload); } catch (e) {}
            } else {
              _rrBuffer.push(payload);
            }
          },
          maskAllInputs: _maskAllInputs,
          blockClass: 'pp-block',
          ignoreClass: 'pp-ignore',
          maskTextClass: 'pp-mask',
          recordCanvas: false,
          sampling: { mousemove: 50, scroll: 100 },
        });
      } catch (e) { _rrStop = null; }
    });
  }

  function stopRecording() {
    try { if (_rrStop) _rrStop(); } catch (e) {}
    _rrStop = null;
  }

  // --- Heatmap overlay API ---
  function ensureHeatmapCanvas() {
    if (_heatmapCanvas) return;
    var c = document.createElement('canvas');
    c.style.position = 'fixed'; c.style.top = '0'; c.style.left = '0';
    c.style.width = '100%'; c.style.height = '100%'; c.style.pointerEvents = 'none'; c.style.zIndex = '2147483647';
    document.body.appendChild(c);
    _heatmapCanvas = c; _heatmapCtx = c.getContext('2d');
    function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
  }

  function drawHeatmap(points, opts) {
    if (!_heatmapCanvas || !_heatmapCtx) return;
    var ctx = _heatmapCtx; var w = _heatmapCanvas.width; var h = _heatmapCanvas.height;
    ctx.clearRect(0, 0, w, h);
    var radius = (opts && opts.radius) || 30; var maxAlpha = (opts && opts.maxAlpha) || 0.35;
    points.forEach(function (p) {
      var x = (typeof p.vw === 'number') ? Math.round((p.vw / 100) * w) : (p.x || 0);
      var y = (typeof p.vh === 'number') ? Math.round((p.vh / 100) * h) : (p.y || 0);
      var weight = p.count || p.weight || 1;
      var grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grd.addColorStop(0, 'rgba(255,0,0,' + Math.min(maxAlpha, 0.1 * weight) + ')');
      grd.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    });
  }

  function fetchAndRenderHeatmap(opts) {
    var url = _apiBase + '/api/analytics/heatmap?projectId=' + encodeURIComponent(_projectId) + '&pageURL=' + encodeURIComponent(window.location.href);
    fetch(url, { credentials: 'include' }).then(function (r) { return r.json(); }).then(function (data) {
      var points = (data && (data.points || data.clicks || data.items)) || [];
      drawHeatmap(points, opts);
    }).catch(function () {});
  }

  // --- public API ---
  PagePulse.init = function (opts) {
    opts = opts || {};
    _apiBase = opts.apiBase || _apiBase || (location.origin);
    _projectId = opts.projectId || _projectId || 'default';
    _autotrack = typeof opts.autotrack === 'boolean' ? opts.autotrack : _autotrack;
    _superProps = Object.assign({}, opts.superProperties || {});
    if (typeof opts.enableRecording !== 'undefined') _enableRecording = String(opts.enableRecording);
    if (typeof opts.enableLive !== 'undefined') _enableLive = !!opts.enableLive;
    if (typeof opts.maskAllInputs === 'boolean') _maskAllInputs = opts.maskAllInputs;
    if (Array.isArray(opts.blockSelectors)) _blockSelectors = opts.blockSelectors.slice();
    ensureSession();

    if (_autotrack) {
      if (document.readyState === 'complete' || document.readyState === 'interactive') { capturePageView(); sendPerformance(); }
      else { window.addEventListener('DOMContentLoaded', function () { capturePageView(); sendPerformance(); }); }
      document.addEventListener('click', onClick, true);
      document.addEventListener('scroll', onScroll, { passive: true });
      document.addEventListener('submit', onSubmit, true);
      document.addEventListener('visibilitychange', function () { captureEvent({ eventType: 'custom', eventName: document.hidden ? 'page_hidden' : 'page_visible' }); });
    }

    // Admin‑triggered live control
    connectSocketIfNeeded().then(function () {
      if (_enableRecording === 'true') startRecording();
    });
  };

  PagePulse.track = function (name, properties) { captureEvent({ eventType: 'custom', eventName: name, metadata: properties || {} }); };
  PagePulse.page = function (name, properties) { captureEvent({ eventType: 'pageview', eventName: name || 'pageview', metadata: properties || {} }); };
  PagePulse.identify = function (userId, properties) { _userId = userId; try { localStorage.setItem('pagepulse_userId', userId); } catch (e) {} if (shouldTrack()) { postJSON(_apiBase + '/api/analytics/identify', { userId: userId, properties: properties || {} }); } };
  PagePulse.setSuperProperties = function (props) { _superProps = Object.assign({}, _superProps || {}, props || {}); };
  PagePulse.optOut = function () { try { localStorage.setItem('analytics_opt_out', 'true'); } catch (e) {} };
  PagePulse.optIn = function () { try { localStorage.removeItem('analytics_opt_out'); } catch (e) {} };

  // Recording API
  PagePulse.startRecording = function (opts) { _enableRecording = _enableRecording || 'manual'; _enableLive = _enableLive || false; return startRecording(opts); };
  PagePulse.stopRecording = function () { return stopRecording(); };

  // Heatmap overlay API
  PagePulse.showHeatmap = function (opts) { ensureHeatmapCanvas(); fetchAndRenderHeatmap(opts || {}); };
  PagePulse.hideHeatmap = function () { if (_heatmapCanvas) { try { _heatmapCtx.clearRect(0, 0, _heatmapCanvas.width, _heatmapCanvas.height); } catch (e) {} _heatmapCanvas.remove(); _heatmapCanvas = null; _heatmapCtx = null; } };

  // Live triggers control
  PagePulse.enableLiveTriggers = function () { _enableLive = true; return connectSocketIfNeeded(); };
  PagePulse.disableLiveTriggers = function () { _enableLive = false; try { if (_socket) _socket.close(); } catch (e) {} _socket = null; _socketConnected = false; };

  // Auto init
  try { initFromTag(); ensureSession(); PagePulse.init(); } catch (e) {}
  window.PagePulse = PagePulse;
})();
