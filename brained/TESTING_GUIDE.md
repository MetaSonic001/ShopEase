# Quick Testing Guide

## Prerequisites

Make sure both servers are running:

```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend  
npm run dev
```

---

## Test 1: Session Recording Works

### Step 1: Admin Browser (Incognito)
1. Open **Incognito/Private Window**
2. Go to `http://localhost:3000/admin`
3. Login as admin
4. Navigate to **Analytics → Recordings** (`/admin/analytics/recordings`)
5. **Leave this window open**

### Step 2: User Browser (Normal)
1. Open **Normal Browser Window**
2. Go to `http://localhost:3000`
3. **Open Developer Console** (F12)
4. Look for this log: `[App] Starting session recording for user`
5. Browse the website:
   - Click navigation links
   - Scroll pages
   - Hover over elements
   - Type in any input fields
   - Navigate to different pages

### Step 3: Verify Recording
1. Go back to **Admin window** (incognito)
2. **Refresh** the recordings page
3. You should see a new session appear
4. Click on the session
5. **Play the video** - you should see the user's actions replayed

**✅ Success**: Video plays and shows all user interactions

---

## Test 2: Heatmap Works

### Step 1: Generate Heatmap Data
1. In **User Browser** (normal window)
2. Go to `http://localhost:3000/products` (or any page)
3. Click around multiple times on different areas
4. Scroll up and down
5. Hover over elements

### Step 2: View Heatmap
1. In **Admin window** (incognito)
2. Navigate to **Analytics → Heatmap** (`/admin/analytics/heatmap`)
3. Select the page URL: `/products`
4. Select interaction type: **Click**
5. Click "Generate Heatmap"

**✅ Success**: You see red/orange/yellow dots where you clicked

---

## Test 3: Real-Time Dashboard Updates

### Step 1: Open Dashboard
1. In **Admin window** (incognito)
2. Navigate to **Dashboard** (`/admin/dashboard`)
3. Note the current stats (active users, page views, etc.)

### Step 2: Generate Activity
1. In **User Browser** (normal window)
2. Navigate between pages rapidly:
   - Home → Products → About → Contact
3. Click multiple elements
4. Scroll pages

### Step 3: Check Updates
1. Go back to **Admin window**
2. **Refresh** the dashboard
3. Numbers should have increased

**✅ Success**: Dashboard shows updated metrics

---

## Test 4: Performance Metrics

### Step 1: Generate Performance Data
1. In **User Browser** (normal window)
2. Navigate to several pages
3. Let each page fully load (wait 2-3 seconds)
4. Repeat for 5-10 different pages

### Step 2: View Performance Dashboard
1. In **Admin window** (incognito)
2. Navigate to **Analytics → Performance** (`/admin/analytics/performance`)
3. Select date range: **Last 24 hours**
4. Click **Refresh**

**✅ Success**: You see metrics like:
- TTFB (Time to First Byte)
- LCP (Largest Contentful Paint)
- FCP (First Contentful Paint)
- CLS (Cumulative Layout Shift)

---

## Test 5: Activity Feed

### Step 1: Generate Events
1. In **User Browser** (normal window)
2. Perform various actions:
   - Click buttons
   - Fill forms
   - Navigate pages
   - Add items to cart (if applicable)

### Step 2: View Activity Feed
1. In **Admin window** (incognito)
2. Navigate to **Analytics → Activity** (`/admin/analytics/activity`)
3. You should see a live feed of events

**✅ Success**: Events appear showing user actions

---

## Debugging Tips

### If Recording Doesn't Start:

**Check Browser Console (User Browser):**
```
Look for: "[App] Starting session recording for user"
If missing: Recording didn't start
```

**Check Network Tab (User Browser):**
```
Look for: POST requests to "http://localhost:5000/api/tracking/session"
Should happen every 10 seconds
```

**Check localStorage:**
```javascript
// In browser console (User Browser):
localStorage.getItem('tracking_enabled')  // Should NOT be 'false'
localStorage.getItem('analytics_opt_out') // Should NOT be 'true'
```

**Check Admin Status:**
```javascript
// In browser console (User Browser):
// This should be FALSE (you're not admin)
console.log(auth?.user?.role === 'admin')
```

### If No Sessions Appear in Admin:

1. **Check backend logs** for errors
2. **Check MongoDB** - query the sessions collection:
   ```javascript
   db.sessionrecordings.find().sort({startTime: -1}).limit(5)
   ```
3. **Verify backend endpoint**:
   ```bash
   curl http://localhost:5000/api/tracking/sessions
   ```

### If Heatmap is Empty:

1. Make sure you clicked on the **exact page URL**
2. Check the page URL includes the leading slash: `/products` not `products`
3. Try different interaction types (click/scroll/hover)
4. Check if events were sent:
   - Network tab → Look for POST to `/api/tracking/event`

### If Performance Metrics are Missing:

1. Wait for pages to **fully load** (load event must fire)
2. Check if browser supports Performance API:
   ```javascript
   // In browser console:
   console.log(window.performance)
   ```
3. Make sure `analyticsManager` is initialized properly

---

## Expected Data Flow

```
User Opens Page
   ↓
[App.tsx] Checks: isAdmin? → NO
   ↓
[App.tsx] Calls: trackingClient.startRecording()
   ↓
[trackingClient.ts] Checks: shouldTrack() → YES
   ↓
[sessionRecorder.ts] Starts rrweb recording
   ↓
User interacts with page
   ↓
[rrweb] Captures DOM changes
   ↓
[sessionRecorder.ts] Buffers events
   ↓
Every 10 seconds OR 100 events
   ↓
[sessionRecorder.ts] Packs events with rrweb.pack()
   ↓
POST /api/tracking/session with packed data
   ↓
[Backend] Saves to MongoDB SessionRecording collection
   ↓
Admin opens recordings page
   ↓
GET /api/tracking/sessions
   ↓
[Backend] Returns all sessions
   ↓
Admin clicks a session
   ↓
GET /api/tracking/sessions/:sessionId
   ↓
[Backend] Returns packed events
   ↓
[SessionReplayPlayer] Unpacks with rrweb.unpack()
   ↓
[rrweb.Replayer] Plays back the session
```

---

## Success Criteria

✅ **All Tests Pass:**
1. Session recording captures user actions
2. Admin can play back recordings
3. Heatmaps show interaction data
4. Real-time dashboard updates
5. Performance metrics display
6. Activity feed shows events

✅ **Data Flow Works:**
- Events sent from user browser
- Backend receives and stores data
- Admin can retrieve and view data

✅ **Privacy Controls Work:**
- Admin is NOT recorded
- Admin routes are NOT tracked
- Users can opt-out
- Sensitive inputs are masked

---

## Next Steps After Testing

If all tests pass:
1. ✅ Core functionality is working
2. ✅ Ready for production testing
3. Consider adding:
   - User session search/filter
   - Export recordings
   - Share recordings with team
   - Alert on errors/anomalies
   - A/B test integration
   - Funnel visualization

If tests fail:
1. Check backend logs
2. Check browser console
3. Verify MongoDB connection
4. Check API endpoints with curl/Postman
5. Review the `RECORDING_STATUS.md` document
