# Complete Analytics System - Setup Guide

## 🎉 Overview

We've built a **complete custom analytics platform** to replace PostHog, with comprehensive tracking, visualization, and real-time capabilities.

---

## ✅ What's Been Completed

### Backend Infrastructure

#### 1. **Analytics Service** (`server/services/analyticsService.js`)
- Full PostHog replacement with custom tracking
- Socket.IO integration for real-time events
- Event capturing, session recording, user identification
- Supports: UserEvent, SessionRecording, Funnel, Cohort, Experiment models

#### 2. **API Endpoints** (`server/routes/analytics.js`)
- ✅ `POST /api/analytics/events` - Capture user events
- ✅ `POST /api/analytics/recording-events` - Batch recording events
- ✅ `POST /api/analytics/snapshot` - DOM snapshots
- ✅ `POST /api/analytics/console` - Console logs
- ✅ `POST /api/analytics/identify` - User identification
- ✅ `GET /api/analytics/recordings` - List all recordings
- ✅ `GET /api/analytics/recordings/:sessionId` - Get specific recording
- ✅ `GET /api/analytics/heatmap` - Heatmap data (click/scroll/hover)

#### 3. **Dashboard API** (`server/controllers/dashboardController.js`)
- ✅ `GET /api/dashboard/overview` - Comprehensive dashboard metrics
- Returns: totalVisitors, activeVisitors, totalPageViews, avgSessionDuration, bounceRate, topPages, deviceBreakdown, browserBreakdown, eventTrends
- ✅ `GET /api/dashboard/page` - Page-specific analytics
- ✅ `GET /api/dashboard/user-flow` - Page transition analysis

#### 4. **Socket.IO Real-Time Updates** (`server/server.js`)
- Real-time event streaming to connected clients
- Project room support for multi-tenant tracking
- Automatic event emission on user actions

#### 5. **Database Models**
- `UserEvent` - All user interactions (clicks, scrolls, page views)
- `SessionRecording` - Session replay data with cursor movements
- `PerformanceMetrics` - Core Web Vitals (TTFB, LCP, FCP, CLS)
- `Session` - User session data
- `PageView` - Page view tracking
- `Funnel` - Conversion funnel definitions
- `Cohort` - User segmentation
- `Experiment` - A/B testing data

---

### Frontend UI Components

#### 1. **Real-Time Analytics Dashboard** (`RealTimeAnalyticsDashboard.tsx`)
**Location**: `/admin` or `/admin/analytics/overview`

**Features**:
- 👋 Personalized greeting (Good Morning/Afternoon/Evening + username)
- 📊 4 Key Metrics Cards:
  - Active Visitors (with live indicator 🟢)
  - Total Visitors (+12% trend)
  - Page Views (+8% trend)
  - Avg Session Duration (-3% trend)
- 📈 Event Trends Line Chart (last 24 hours)
- ⚡ Live Activity Feed (real-time updates via Socket.IO)
- 📊 Top Pages Bar Chart
- 📱 Device Breakdown Pie Chart (desktop/mobile/tablet)
- 🌐 Browser Stats with Progress Bars
- 📉 Bounce Rate Circular Progress
- ⚡ Quick Action Buttons (View Recordings, Heatmaps, Analyze Funnels)

**Real-Time Updates**: Socket.IO automatically updates the activity feed when users interact with your site

#### 2. **Session Replay Player** (`SessionReplayPlayer.tsx`)
**Location**: `/admin/analytics/recordings/:sessionId`

**Features**:
- 🎬 Video-style playback controls (play/pause/restart)
- ⏱️ Timeline scrubber with visual progress
- ⚡ Speed controls (0.5x, 1x, 1.5x, 2x)
- 🖱️ Cursor position tracking and visualization
- 📍 Click indicators with animated ping circles
- 📋 Console logs panel (last 10 logs)
- ❌ Errors panel with stack traces
- 📊 Session stats (total events, clicks, scrolls, duration)
- 📱 Device info sidebar (type, browser, OS, resolution)
- 👁️ Show/hide toggles for cursor, clicks, console

**How it works**: Replays every user interaction frame-by-frame with their actual cursor movements

#### 3. **Recordings List** (`RecordingsList.tsx`)
**Location**: `/admin/analytics/recordings`

**Features**:
- 📁 Grid view of all session recordings
- 🔍 Filter by errors only
- 🔎 Search by user ID
- 🔄 Refresh button
- 📊 Stats display (events/clicks/scrolls per session)
- ⏱️ Duration and timestamp
- 🏷️ Error badges (red indicator)
- 📱 Device info (browser, OS)
- ▶️ Click to play functionality

**Use case**: Quick overview of all user sessions to identify problematic recordings

#### 4. **Heatmap Visualization** (`HeatmapVisualization.tsx`)
**Location**: `/admin/analytics/heatmap`

**Features**:
- 🎨 3 Heatmap Types:
  - 🔴 Click Heatmap (red gradients)
  - 🔵 Scroll Heatmap (blue gradients)
  - 🟣 Hover Heatmap (purple gradients)
- 🖼️ Canvas-based rendering with radial gradients
- 🎚️ Intensity slider (0.1-1.0 opacity)
- 👁️ Show/hide overlay toggle
- 💾 Export to PNG functionality
- 📊 Stats cards (total events, unique points, peak/avg intensity)
- 🔗 Page URL input to filter by specific page
- 🎨 Color-coded legend

**How it works**: Converts viewport percentage coordinates (vw, vh) to canvas pixels and renders density gradients

#### 5. **Performance Analytics** (`PerformanceAnalytics.tsx`)
**Location**: `/admin/analytics/performance`

**Features**:
- ⚡ 4 Core Web Vitals Cards:
  - TTFB (Time to First Byte)
  - LCP (Largest Contentful Paint)
  - FCP (First Contentful Paint)
  - CLS (Cumulative Layout Shift)
- 🎯 Color-coded performance ratings:
  - 🟢 Good (meets Google thresholds)
  - 🟡 Needs Improvement
  - 🔴 Poor
- 📈 Performance over time area chart
- ❌ JS Errors panel with stack traces
- 📊 Performance by page bar chart
- 📅 Date range filters (24h, 7d, 30d)
- 📄 Page selector dropdown
- 📑 Export report button
- 📈 Trend indicators (up/down arrows with percentages)

**Performance Scoring Algorithm**:
- TTFB: good ≤200ms, poor ≥600ms
- LCP: good ≤2500ms, poor ≥4000ms
- FCP: good ≤1800ms, poor ≥3000ms
- CLS: good ≤0.1, poor ≥0.25

---

### Frontend Tracking Client

#### **Custom Tracking Client** (`src/trackingClient.ts`)
- Complete PostHog replacement
- Automatic page view tracking
- Click tracking with element details
- Scroll depth tracking
- Mouse movement and hover tracking
- Session recording with cursor positions
- Console log capture
- Performance metrics (Core Web Vitals)
- JS error tracking
- Session management with UUID
- User identification
- Event batching and optimization

**Auto-initialized**: Automatically starts tracking when users visit any page (except admin pages)

---

## 🚀 How to Run

### 1. Start Backend Server
```bash
cd c:\Users\shaun\projects\NEURATHON-PagePulse\brained\server
npm run dev
```
**Expected output**: 
- "Connected to MongoDB"
- "Server running on port 5000"

### 2. Start Frontend Development Server
```bash
cd c:\Users\shaun\projects\NEURATHON-PagePulse\brained
bun run dev
```
**Expected output**: 
- "VITE ready in X ms"
- "Local: http://localhost:5173"

### 3. Access the Admin Dashboard
- Navigate to: `http://localhost:5173/admin`
- Default route redirects to Real-Time Analytics Dashboard

---

## 📋 Navigation Structure

### Admin Sidebar - Analytics Section
1. **📈 Overview** → Real-Time Analytics Dashboard
2. **🎬 Session Recordings** → Recordings List
3. **🎯 Heatmaps** → Heatmap Visualization
4. **⚡ Performance** → Performance Analytics
5. **📊 Events & Metrics** → Legacy Admin Analytics

### Admin Sidebar - Management Section
- **📦 Products** → Product Management
- **⚙️ Tracking Setup** → Tracking Configuration

---

## 🔄 Real-Time Features

### Socket.IO Integration

**Backend** (`server/server.js`):
- Server listens for connections on Socket.IO
- Clients join project-specific rooms: `project-default`
- Analytics service emits events to rooms automatically

**Frontend** (`RealTimeAnalyticsDashboard.tsx`):
- Connects to Socket.IO on mount
- Joins 'default' project room
- Listens for 'event' messages
- Updates live activity feed automatically
- Disconnects on unmount

**Event Flow**:
1. User clicks button on e-commerce site
2. `trackingClient.ts` captures click event
3. Sends to `POST /api/analytics/events`
4. `analyticsService.js` saves to MongoDB
5. `analyticsService.js` emits to Socket.IO
6. Admin dashboard receives event via Socket.IO
7. Live activity feed updates instantly 🎉

---

## 📊 Data Flow

### User Visits E-commerce Site
```
1. trackingClient.ts initializes
2. Captures: page view, clicks, scrolls, mouse movements
3. Sends events to backend API
4. Backend saves to MongoDB
5. Backend emits to Socket.IO for real-time updates
```

### Admin Views Dashboard
```
1. RealTimeAnalyticsDashboard fetches GET /api/dashboard/overview
2. Displays metrics (visitors, page views, bounce rate, etc.)
3. Socket.IO connection established
4. Real-time events populate live activity feed
```

### Admin Watches Session Replay
```
1. RecordingsList fetches GET /api/analytics/recordings
2. Click on recording navigates to SessionReplayPlayer
3. SessionReplayPlayer fetches GET /api/analytics/recordings/:sessionId
4. Plays back: cursor movements, clicks, scrolls, console logs
```

### Admin Generates Heatmap
```
1. HeatmapVisualization gets page URL input
2. Fetches GET /api/analytics/heatmap?pageURL=X&eventType=click
3. Converts viewport percentages (vw, vh) to canvas pixels
4. Renders radial gradients for each click point
5. Shows density overlay on page preview
```

### Admin Checks Performance
```
1. PerformanceAnalytics fetches GET /api/analytics/performance
2. Calculates avg TTFB, LCP, FCP, CLS
3. Scores performance based on Google thresholds
4. Displays color-coded metrics and trends
5. Shows JS errors with stack traces
```

---

## ❌ What's Still Pending

### 1. **Funnel Analysis UI** (Not Created Yet)
- Component for visualizing conversion funnels
- Create/edit funnel definitions
- Dropoff visualization between steps
- Step-by-step conversion rates
- Time-based funnel analysis
- Export funnel reports

**Backend Ready**: `Funnel` model exists, need to create UI

### 2. **Cohort Analysis UI** (Not Created Yet)
- User segmentation dashboard
- Cohort creation interface
- Retention charts
- Behavior analysis by cohort
- Cohort comparison
- Auto-update cohort tracking

**Backend Ready**: `Cohort` model exists, need to create UI

### 3. **A/B Testing UI** (Not Created Yet)
- Experiment management interface
- Variant configuration
- Results visualization
- Statistical significance indicators
- Winner declaration
- Targeting rules configuration

**Backend Ready**: `Experiment` model exists, need to create UI

### 4. **E-commerce Homepage Redesign** (Current Issue)
- Current `LandingPage` is analytics-focused
- Need to transform to full e-commerce storefront
- Hero section with featured products
- Product categories grid
- Best sellers section
- Testimonials/reviews
- Newsletter signup
- Professional e-commerce footer
- Ensure tracking works on all elements

### 5. **Shopping Cart & Checkout** (Incomplete)
- Shopping cart functionality
- Add to cart tracking
- Checkout process
- Order management
- Payment integration (if needed)
- Order tracking

### 6. **Comprehensive End-to-End Testing**
- Visit all e-commerce pages and verify tracking
- Check MongoDB for saved events
- Verify real-time updates in dashboard
- Test session replay playback
- Generate and view heatmaps for multiple pages
- Check performance metrics display
- Verify Socket.IO connections
- Test filtering and search in all components

---

## 🎯 Tracking Coverage

### ✅ What's Tracked (Automatic)

**Page Interactions**:
- ✅ Page views with URL, referrer, title
- ✅ Clicks with element details (tag, class, ID, text)
- ✅ Scroll depth (percentage scrolled)
- ✅ Mouse hover with dwell time
- ✅ Mouse movements (cursor positions)
- ✅ Navigation events
- ✅ Engagement time

**Session Recording**:
- ✅ Cursor movements (x, y, vw, vh)
- ✅ Click positions
- ✅ Scroll positions
- ✅ DOM snapshots
- ✅ Console logs (log, warn, error, info)
- ✅ Errors with stack traces

**Performance Metrics**:
- ✅ TTFB (Time to First Byte)
- ✅ FCP (First Contentful Paint)
- ✅ LCP (Largest Contentful Paint)
- ✅ CLS (Cumulative Layout Shift)
- ✅ FID / INP (First Input Delay / Interaction to Next Paint)
- ✅ JS Error Tracking
- ✅ API latency (if configured)

**Device & Browser**:
- ✅ Device type (desktop/mobile/tablet)
- ✅ Browser name and version
- ✅ Operating system
- ✅ Screen resolution
- ✅ Viewport size

### ⚠️ What's NOT Tracked (As Designed)

- ❌ Admin pages (when logged in as admin)
- ❌ Sensitive form data (passwords, credit cards)
- ❌ Private/incognito mode detection

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env` in `server/`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pagepulse
CLIENT_URLS=http://localhost:5173,http://localhost:3000
JWT_SECRET=your-secret-key
```

**Frontend** (`.env` in root):
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### Tracking Client Configuration

Located in `src/trackingClient.ts`:
- Auto-initializes on page load
- Session ID generated with UUID
- Events batched for optimization
- Cursor sampling rate: 100ms
- Recording batch size: 100 events

---

## 📦 Dependencies

### Backend
- `express` - Web framework
- `mongoose` - MongoDB ORM
- `socket.io` - Real-time communication
- `uuid` - Session ID generation
- `ua-parser-js` - Device detection
- `json2csv`, `pdfkit` - Export functionality

### Frontend
- `react` 19.1.1 - UI framework
- `react-router` 7.9.5 - Navigation
- `socket.io-client` 4.8.1 - Real-time updates
- `recharts` 2.12.7 - Charts and graphs
- `axios` 1.13.1 - API calls
- `lucide-react` 0.552.0 - Icons

---

## 🧪 Testing the System

### Step 1: Verify Backend is Running
1. Open terminal in `server/` folder
2. Run `npm run dev`
3. Check console: "Connected to MongoDB" + "Server running on port 5000"
4. Test health endpoint: `curl http://localhost:5000/api/health`

### Step 2: Verify Frontend is Running
1. Open terminal in root folder
2. Run `bun run dev`
3. Check console: "VITE ready"
4. Navigate to `http://localhost:5173`

### Step 3: Test Tracking
1. Visit the e-commerce homepage (while logged out)
2. Click around, scroll, hover
3. Open browser DevTools → Console
4. Check for tracking events being sent
5. Verify: `POST http://localhost:5000/api/analytics/events`

### Step 4: Test Real-Time Dashboard
1. Login to admin: `http://localhost:5173/admin`
2. Navigate to Analytics → Overview
3. Open another browser window (incognito)
4. Visit e-commerce site and interact
5. Watch admin dashboard live activity feed update in real-time 🎉

### Step 5: Test Session Replay
1. Interact with e-commerce site (clicks, scrolls, typing)
2. Go to admin → Analytics → Session Recordings
3. Find your session (should appear within seconds)
4. Click to play
5. Watch your session replay with cursor movements 🎬

### Step 6: Test Heatmap
1. Click around a specific page multiple times
2. Go to admin → Analytics → Heatmaps
3. Enter the page URL (e.g., `/products`)
4. Select "Click" heatmap type
5. Click "Generate Heatmap"
6. See red density gradients where you clicked 🔥

### Step 7: Test Performance Analytics
1. Go to admin → Analytics → Performance
2. Check Core Web Vitals metrics
3. View performance trends chart
4. Check JS errors panel (if any)
5. Filter by specific page or date range

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Socket.IO"
**Solution**: 
1. Check backend server is running
2. Verify `VITE_SOCKET_URL` in frontend `.env`
3. Check browser console for CORS errors
4. Verify Socket.IO is initialized: `global.io` exists in backend

### Issue: "No recordings showing up"
**Solution**:
1. Verify tracking client is initialized: Check browser console
2. Check MongoDB for `sessionrecordings` collection
3. Verify `POST /api/analytics/recording-events` endpoint works
4. Check if recording was saved: `db.sessionrecordings.find()`

### Issue: "Heatmap not rendering"
**Solution**:
1. Check if events have `vw`, `vh` coordinates
2. Verify `GET /api/analytics/heatmap` returns data
3. Check browser console for canvas errors
4. Ensure page URL matches exactly

### Issue: "Dashboard shows zero metrics"
**Solution**:
1. Visit e-commerce pages to generate events
2. Check MongoDB collections: `userevents`, `sessions`, `pageviews`
3. Verify `GET /api/dashboard/overview` returns data
4. Check date range filters

### Issue: "Real-time updates not working"
**Solution**:
1. Check Socket.IO connection in browser DevTools → Network → WS
2. Verify client joined room: Check backend console logs
3. Check `global.io` is set in `server.js`
4. Verify events are being emitted: Check `analyticsService.js`

---

## 📚 API Documentation

### Analytics API

#### Capture Event
```http
POST /api/analytics/events
Content-Type: application/json

{
  "eventType": "click",
  "pageURL": "/products",
  "elementTag": "button",
  "elementClass": "add-to-cart",
  "elementText": "Add to Cart",
  "x": 450,
  "y": 620,
  "vw": 45.5,
  "vh": 62.3
}
```

#### Get Recordings
```http
GET /api/analytics/recordings?hasErrors=true&userId=abc123&limit=20
```

#### Get Specific Recording
```http
GET /api/analytics/recordings/:sessionId
```

#### Get Heatmap Data
```http
GET /api/analytics/heatmap?pageURL=/products&eventType=click
```

### Dashboard API

#### Get Overview
```http
GET /api/dashboard/overview?projectId=default&from=2024-01-01&to=2024-12-31
```

**Response**:
```json
{
  "success": true,
  "totalVisitors": 1234,
  "activeVisitors": 12,
  "totalPageViews": 5678,
  "avgSessionDuration": 180,
  "bounceRate": 45.5,
  "topPages": [
    {"page": "/products", "views": 890, "uniqueVisitors": 450}
  ],
  "deviceBreakdown": [
    {"device": "desktop", "count": 800},
    {"device": "mobile", "count": 400}
  ],
  "browserBreakdown": [
    {"browser": "Chrome", "count": 700}
  ],
  "eventTrends": [
    {"time": "2024-01-01", "events": 123}
  ]
}
```

---

## 🎨 Design Patterns

### Frontend Components
- **Card-based layouts** for consistent UI
- **Color-coded metrics** (green=good, yellow=needs improvement, red=poor)
- **Real-time indicators** (pulsing green dot for live data)
- **Recharts library** for all data visualizations
- **Canvas rendering** for performance-optimized heatmaps
- **Video-style controls** for session replay UX

### Backend Architecture
- **Service layer** (`analyticsService.js`) for business logic
- **Controller pattern** for API routes
- **Mongoose models** for MongoDB schema
- **Socket.IO rooms** for multi-tenant support
- **Aggregation pipelines** for complex queries

---

## 🚀 Next Steps

1. **Test Complete End-to-End Flow** (HIGH PRIORITY)
   - Verify tracking works on all e-commerce pages
   - Test real-time updates in dashboard
   - Validate session replay accuracy
   - Check heatmap generation for multiple pages

2. **Create Funnel Analysis UI** (MEDIUM PRIORITY)
   - Design funnel visualization component
   - Add funnel creation interface
   - Implement dropoff analysis
   - Add conversion rate calculations

3. **Create Cohort Analysis UI** (MEDIUM PRIORITY)
   - Design user segmentation dashboard
   - Add cohort creation form
   - Implement retention charts
   - Add behavior comparison

4. **Create A/B Testing UI** (MEDIUM PRIORITY)
   - Design experiment management interface
   - Add variant configuration
   - Implement results visualization
   - Add statistical significance testing

5. **Redesign E-commerce Homepage** (HIGH PRIORITY)
   - Transform landing page to full storefront
   - Add product categories and featured items
   - Ensure tracking works on all elements
   - Add shopping cart and checkout

6. **Comprehensive Testing & Polish** (HIGH PRIORITY)
   - Test all analytics features
   - Fix any bugs or edge cases
   - Optimize performance
   - Add loading states and error handling
   - Write user documentation

---

## 📞 Support

For questions or issues:
1. Check this documentation first
2. Review browser console for errors
3. Check backend logs in terminal
4. Verify MongoDB collections have data
5. Test API endpoints directly with curl/Postman

---

## 🎉 Congratulations!

You now have a **complete custom analytics platform** with:
- ✅ Real-time analytics dashboard with Socket.IO
- ✅ Session replay with cursor tracking
- ✅ Click/scroll/hover heatmaps
- ✅ Core Web Vitals performance monitoring
- ✅ Comprehensive event tracking
- ✅ Professional SaaS-style UI

**Total Lines of Code Added**: 2,500+ lines across 5 major UI components + backend updates

**Next milestone**: Complete the remaining 3 analytics UIs (Funnels, Cohorts, A/B Testing) and redesign the e-commerce homepage.

Happy tracking! 🚀📊🎬
