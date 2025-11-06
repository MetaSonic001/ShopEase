# PagePulse - Dynamic DOM Recreation & Live Recording Implementation Plan

## Overview
This document outlines the implementation strategy for:
1. **Dynamic Heatmap with DOM Recreation** (PostHog/Hotjar-style)
2. **Admin-Triggered Live Session Recording**
3. **Data Accumulation & Cross-Page Analytics**

---

## 1. HEATMAP WITH DYNAMIC DOM RECREATION

### Current Issue:
- Static HTML templates used in heatmap visualization
- Cannot show actual user's browsed pages

### Solution: Use rrweb Snapshots for DOM Recreation

#### Architecture:
```
User Session → rrweb records DOM snapshots → Stored in DB
                                                ↓
Admin views heatmap → Fetch session snapshots → Replay DOM with rrweb
                                                ↓
                          Overlay heatmap canvas on reconstructed DOM
```

#### Implementation Steps:

**A. Update HeatmapVisualization.tsx**

```typescript
// Instead of static HTML, fetch session snapshots:
const fetchPageDOM = async (pageURL: string) => {
  // Get all sessions for this page
  const response = await axios.get(`/api/tracking/sessions`, {
    params: { pageURL, limit: 1 } // Get most recent session
  });
  
  const session = response.data.sessions[0];
  
  // Use rrweb to reconstruct DOM
  if (session && session.events) {
    const events = unpackEvents(session.events);
    const snapshot = events.find(e => e.type === 2); // FullSnapshot type
    return snapshot;
  }
};

// Render with rrweb Replayer (frozen frame)
const renderPageDOM = (snapshot) => {
  const replayer = new Replayer([snapshot], {
    root: iframeRef.current,
    speed: 1,
    skipInactive: false,
    // Freeze at snapshot
  });
  
  replayer.pause(0); // Show first frame only
};

// Then overlay heatmap canvas
const overlayHeatmap = () => {
  // Same canvas drawing logic but on top of replayer iframe
};
```

**Key Points:**
- Use rrweb's `Replayer` class to reconstruct DOM from snapshots
- Pause at first frame (like a screenshot)
- Overlay heatmap canvas with `position: absolute` and `pointer-events-none`
- Aggregate heatmap points from multiple sessions on same page

---

## 2. ADMIN-TRIGGERED LIVE RECORDING

### Architecture:
```
Admin Dashboard               User Browser (Any Device)
      ↓                              ↓
Click "Start Recording"      Normal browsing continues
      ↓                              ↓
WebSocket: admin-start-recording → rrweb.record() activated
      ↓                              ↓
Receives events in real-time ←─ WebSocket: emit events
      ↓                              ↓
Displays live replay          User actions captured
      ↓                              ↓
Click "Stop Recording"        rrweb.record() stopped
      ↓                              ↓
Save session to DB            Session metadata saved
```

### Implementation:

#### **A. Backend WebSocket Events (server/server.js)**

```javascript
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  
  // Admin starts recording for all users
  socket.on('admin-start-recording', ({ projectId, adminId }) => {
    console.log('[Admin] Starting recording session');
    
    // Broadcast to all user clients in project
    io.to(`project-${projectId}`).emit('recording-start', {
      recordingId: generateRecordingId(),
      startedBy: adminId,
      timestamp: Date.now()
    });
    
    socket.join(`recording-admin-${recordingId}`);
  });
  
  // Admin stops recording
  socket.on('admin-stop-recording', ({ recordingId }) => {
    io.to(`project-${projectId}`).emit('recording-stop', {
      recordingId,
      timestamp: Date.now()
    });
  });
  
  // User sends events during recording
  socket.on('recording-event', ({ recordingId, event }) => {
    // Forward to admin dashboard in real-time
    io.to(`recording-admin-${recordingId}`).emit('live-event', {
      recordingId,
      event,
      timestamp: Date.now()
    });
    
    // Also save to database
    saveEventToDB(recordingId, event);
  });
  
  // User joins project room
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
  });
});
```

#### **B. User-Side Recording Client (App.tsx or tracking SDK)**

```typescript
// In App.tsx or tracking client
useEffect(() => {
  const socket = io(API_URL);
  
  socket.on('recording-start', ({ recordingId }) => {
    console.log('[User] Admin started recording');
    
    // Start rrweb recording
    const stopRecording = rrweb.record({
      emit(event) {
        // Send each event to server via WebSocket
        socket.emit('recording-event', {
          recordingId,
          event: pack(event) // Pack for compression
        });
      },
      recordCanvas: true,
      collectFonts: true,
      plugins: [
        getRecordConsolePlugin(),
        // ... other plugins
      ]
    });
    
    // Store stop function
    window.__activeRecording = stopRecording;
  });
  
  socket.on('recording-stop', () => {
    console.log('[User] Admin stopped recording');
    if (window.__activeRecording) {
      window.__activeRecording(); // Stop recording
      window.__activeRecording = null;
    }
  });
  
  // Join project room
  socket.emit('join-project', projectId);
  
  return () => socket.disconnect();
}, []);
```

#### **C. Admin Dashboard - Live Recording View**

Create new component: `LiveRecordingDashboard.tsx`

```typescript
const LiveRecordingDashboard: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const replayerRef = useRef<Replayer | null>(null);
  
  const socket = useRef<Socket>(io(API_URL));
  
  const startRecording = () => {
    const newRecordingId = uuidv4();
    setRecordingId(newRecordingId);
    setIsRecording(true);
    
    socket.current.emit('admin-start-recording', {
      projectId: 'default',
      adminId: currentUser.id,
      recordingId: newRecordingId
    });
    
    // Listen for live events
    socket.current.on('live-event', ({ event }) => {
      setLiveEvents(prev => {
        const updated = [...prev, event];
        
        // Update replayer with new events
        if (replayerRef.current && updated.length > 0) {
          // Destroy old replayer
          replayerRef.current.destroy();
          
          // Create new replayer with all events so far
          replayerRef.current = new Replayer(updated, {
            root: playerContainerRef.current,
            speed: 1,
            liveMode: true // Important: live mode
          });
          
          // Play to latest position
          replayerRef.current.play();
        }
        
        return updated;
      });
    });
  };
  
  const stopRecording = () => {
    socket.current.emit('admin-stop-recording', { recordingId });
    setIsRecording(false);
    
    // Save recording to database
    saveRecording(recordingId, liveEvents);
  };
  
  return (
    <div>
      <div className="controls">
        {!isRecording ? (
          <Button onClick={startRecording}>
            <Circle className="w-4 h-4 mr-2 text-red-500" />
            Start Live Recording
          </Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive">
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        )}
      </div>
      
      <div className="live-replay-container">
        <Badge variant="destructive" className="absolute top-4 left-4 z-10">
          <Circle className="w-3 h-3 mr-1 animate-pulse" />
          LIVE
        </Badge>
        
        <div ref={playerContainerRef} className="w-full h-full" />
      </div>
      
      <div className="event-feed">
        <h3>Live Events ({liveEvents.length})</h3>
        <ScrollArea className="h-96">
          {liveEvents.map((event, i) => (
            <div key={i}>
              {getEventTypeName(event.type)} - {new Date(event.timestamp).toLocaleTimeString()}
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  );
};
```

---

## 3. DATA ACCUMULATION & CROSS-PAGE ANALYTICS

### Requirements:
- Every recording session should feed into heatmaps
- Analytics charts update with new session data
- Filter by single session OR aggregate multiple sessions
- Show overtime metrics across all sidebar pages

### Database Schema Updates:

```javascript
// Ensure session_id is indexed for faster queries
SessionRecording.schema.index({ sessionId: 1 });
SessionRecording.schema.index({ pageURL: 1 });
SessionRecording.schema.index({ createdAt: -1 });

// Heatmap aggregates from multiple sessions
HeatmapData.schema = {
  pageURL: String,
  type: String, // click, scroll, hover, mousemove
  points: [{ x: Number, y: Number, value: Number }],
  sessionIds: [String], // Track which sessions contributed
  metadata: {
    totalInteractions: Number,
    uniqueUsers: Number,
    sessionCount: Number, // NEW: count of sessions aggregated
    lastUpdated: Date
  },
  createdAt: Date
};
```

### Implementation:

#### **A. Heatmap Aggregation Service**

```javascript
// server/services/heatmapAggregation.js

const aggregateHeatmapFromSessions = async (pageURL, type, sessionIds = null) => {
  // If sessionIds provided, only use those sessions
  // Otherwise, use ALL sessions for this page
  
  const query = { pageURL };
  if (sessionIds) {
    query.sessionId = { $in: sessionIds };
  }
  
  const sessions = await SessionRecording.find(query);
  
  const allInteractions = [];
  sessions.forEach(session => {
    // Extract interactions from session events
    const interactions = extractInteractionsFromEvents(session.events, type);
    allInteractions.push(...interactions);
  });
  
  // Group by proximity (within 20px radius)
  const heatmapPoints = clusterInteractions(allInteractions, 20);
  
  // Save aggregated heatmap
  const heatmap = await HeatmapData.findOneAndUpdate(
    { pageURL, type },
    {
      points: heatmapPoints,
      sessionIds: sessions.map(s => s.sessionId),
      metadata: {
        totalInteractions: allInteractions.length,
        uniqueUsers: new Set(sessions.map(s => s.userId)).size,
        sessionCount: sessions.length,
        lastUpdated: new Date()
      }
    },
    { upsert: true, new: true }
  );
  
  return heatmap;
};

// Called after every session recording is saved
const onSessionRecorded = async (sessionId) => {
  const session = await SessionRecording.findOne({ sessionId });
  
  // Regenerate heatmaps for this page
  const pageURL = session.metadata?.url || session.pageURL;
  
  await aggregateHeatmapFromSessions(pageURL, 'click');
  await aggregateHeatmapFromSessions(pageURL, 'scroll');
  await aggregateHeatmapFromSessions(pageURL, 'hover');
  await aggregateHeatmapFromSessions(pageURL, 'mousemove');
  
  console.log(`[Heatmap] Updated heatmaps for ${pageURL} after session ${sessionId}`);
};
```

#### **B. Heatmap Visualization with Session Filtering**

```typescript
// HeatmapVisualization.tsx

const [filterMode, setFilterMode] = useState<'all' | 'single' | 'custom'>('all');
const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

const fetchHeatmapData = async () => {
  const params: any = { pageURL, type: heatmapType };
  
  if (filterMode === 'single' && selectedSessions.length === 1) {
    params.sessionId = selectedSessions[0];
  } else if (filterMode === 'custom') {
    params.sessionIds = selectedSessions.join(',');
  }
  // filterMode === 'all' → no session filter, use aggregated data
  
  const response = await axios.get('/api/tracking/heatmap', { params });
  setHeatmapData(response.data.heatmapData);
  setMetadata(response.data.metadata);
};

return (
  <div>
    {/* Session Filter UI */}
    <div className="filter-controls">
      <Select value={filterMode} onValueChange={setFilterMode}>
        <SelectItem value="all">All Sessions (Aggregated)</SelectItem>
        <SelectItem value="single">Single Session</SelectItem>
        <SelectItem value="custom">Custom Selection</SelectItem>
      </Select>
      
      {filterMode !== 'all' && (
        <SessionSelector
          selected={selectedSessions}
          onChange={setSelectedSessions}
          pageURL={pageURL}
        />
      )}
    </div>
    
    {/* Metadata showing session count */}
    {metadata && (
      <Card>
        <CardContent>
          <div>Sessions: {metadata.sessionCount}</div>
          <div>Users: {metadata.uniqueUsers}</div>
          <div>Interactions: {metadata.totalInteractions}</div>
        </CardContent>
      </Card>
    )}
    
    {/* DOM reconstruction using rrweb snapshot */}
    <div ref={containerRef} className="relative">
      {/* Replayer showing frozen snapshot */}
      <div ref={replayerRef} className="w-full h-full" />
      
      {/* Heatmap canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ mixBlendMode: 'multiply' }}
      />
    </div>
  </div>
);
```

#### **C. Cross-Page Analytics Updates**

Every analytics page should listen for new session recordings:

```typescript
// RealTimeAnalyticsDashboard.tsx
// EventsList.tsx
// PagePerformance.tsx
// etc.

useEffect(() => {
  const socket = io(API_URL);
  
  socket.on('session-recorded', ({ sessionId, pageURL, duration }) => {
    // Refresh current data
    refetchAnalytics();
    
    // Show notification
    toast.success('New session recorded!', {
      description: `${duration}s session on ${pageURL}`
    });
  });
  
  return () => socket.disconnect();
}, []);
```

#### **D. Analytics API Updates**

All analytics endpoints should support date range + session filtering:

```javascript
// GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  const { startDate, endDate, sessionIds, pageURL } = req.query;
  
  const query = {};
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (sessionIds) {
    query.sessionId = { $in: sessionIds.split(',') };
  }
  if (pageURL) {
    query.pageURL = pageURL;
  }
  
  const sessions = await SessionRecording.find(query);
  const analytics = calculateAnalytics(sessions);
  
  res.json(analytics);
});
```

---

## 4. FILE MODIFICATIONS REQUIRED

### Frontend Files:

1. **src/pages/Admin/HeatmapVisualization.tsx**
   - Replace static HTML with rrweb Replayer
   - Add session filtering UI
   - Use Replayer.pause(0) to show frozen snapshot
   - Overlay heatmap canvas on replayer iframe

2. **src/pages/Admin/SessionReplayPlayerNew.tsx**
   - Already correct, keep as-is
   - Ensure it handles packed events properly (already done)

3. **NEW: src/pages/Admin/LiveRecordingDashboard.tsx**
   - Admin-triggered live recording UI
   - Start/Stop recording buttons
   - Real-time event feed
   - Live rrweb replay

4. **src/App.tsx**
   - Add WebSocket listener for `recording-start` / `recording-stop`
   - Auto-start rrweb recording when admin triggers it

5. **All analytics pages**
   - Add WebSocket listener for `session-recorded` event
   - Auto-refresh data when new session recorded

### Backend Files:

1. **server/server.js**
   - Add WebSocket events: `admin-start-recording`, `admin-stop-recording`, `recording-event`
   - Broadcast to user clients
   - Forward events to admin dashboard

2. **server/routes/trackingRoutes.js**
   - Update POST `/events` to trigger heatmap regeneration
   - Emit `session-recorded` event via WebSocket when session completes

3. **NEW: server/services/heatmapAggregation.js**
   - Aggregation logic for multi-session heatmaps
   - Called after every session save

4. **server/models/HeatmapData.js**
   - Add `sessionIds` array field
   - Add `sessionCount` to metadata

---

## 5. TESTING CHECKLIST

- [ ] Heatmap shows actual DOM from rrweb snapshot (not static HTML)
- [ ] Admin can start/stop live recording from dashboard
- [ ] User's browser automatically starts recording when admin triggers it
- [ ] Events stream in real-time to admin dashboard
- [ ] Live replay updates as user browses
- [ ] Recording saves to database when stopped
- [ ] Heatmaps regenerate after new session recorded
- [ ] Can filter heatmap by single session vs. all sessions
- [ ] Analytics charts update when new session recorded
- [ ] Can select date range for analytics
- [ ] Cross-page metrics aggregate properly

---

## 6. DEPLOYMENT NOTES

### Environment Variables:
```env
SOCKET_URL=https://your-backend.com
ENABLE_LIVE_RECORDING=true
```

### Performance Considerations:
- Use event packing/compression for WebSocket transmission
- Implement rate limiting on `recording-event` WebSocket endpoint
- Cache heatmap aggregations (already implemented with 1-hour TTL)
- Use database indexes on `sessionId`, `pageURL`, `createdAt`

---

## Summary

**Key Changes:**
1. **Heatmap**: Use rrweb Replayer with frozen snapshot + overlay canvas (NOT static HTML)
2. **Live Recording**: Admin triggers via WebSocket → User's browser auto-starts rrweb
3. **Data Flow**: Every session → Updates heatmaps → Updates all analytics pages
4. **Filtering**: Support single-session view OR aggregated multi-session view

This matches how PostHog, Hotjar, and Sentry implement their session replay and heatmap features! 🚀
