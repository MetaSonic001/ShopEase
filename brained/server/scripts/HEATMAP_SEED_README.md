# Heatmap Data Seeding

This script generates realistic session recordings with rrweb events and heatmap interaction data for testing and demonstration purposes.

## What Gets Seeded

### 1. Session Recordings (30 sessions)
- Complete rrweb event streams with DOM snapshots
- Mouse movements, clicks, scrolls, and interactions
- Realistic device and browser metadata
- Session duration: 30s - 3.5 minutes
- Pages: `/`, `/products`, `/products/laptop`, `/cart`, `/about`

### 2. Aggregated Heatmap Data (60 documents)
- Pre-aggregated heatmap points for faster visualization
- Types: click, scroll, move, hover
- Devices: desktop, mobile, tablet
- Includes metadata like total interactions and unique users

### 3. Raw User Interactions (500 interactions)
- Individual interaction events for analytics
- Used for generating custom heatmaps
- Includes precise coordinates and element metadata

## Usage

### Via API Endpoint

**Seed heatmap data:**
```bash
POST http://localhost:5000/api/seed/data/heatmap-data
```

**Clear heatmap data:**
```bash
DELETE http://localhost:5000/api/seed/data/heatmap-data
```

### Via Script (Direct)

```bash
cd server
node scripts/testSeedHeatmap.js
```

## Viewing Seeded Data

### Session Recordings Page
Navigate to `/admin/sessions` to see all seeded session recordings. Each recording includes:
- Session ID and metadata
- Device/browser information
- Duration and timestamp
- Number of events, clicks, scrolls

### Heatmap Visualization Page
Navigate to `/admin/analytics/heatmap` to view heatmaps:
1. Select a page URL from the dropdown (e.g., `/products`)
2. Choose heatmap type (click, scroll, move, hover)
3. Click "Generate Heatmap"
4. The rrweb snapshot will be reconstructed with heatmap overlay

## Data Format

### Session Recording Events
Each session contains an `events` array with JSON-stringified rrweb events:
```javascript
{
  type: 2, // Full snapshot
  data: {
    node: { /* DOM tree */ },
    initialOffset: { left: 0, top: 0 }
  },
  timestamp: 1234567890
}
```

### Heatmap Points
Aggregated heatmap data includes points array:
```javascript
{
  x: 450,
  y: 300,
  value: 5, // Intensity/count
  timestamp: Date
}
```

## Integration with Existing Seeds

This seed integrates with the existing seed infrastructure:
- Uses the same `/api/seed/data/:type` endpoint pattern
- Marks data with `isSeeded: true` for easy cleanup
- Appears in the seed status/stats endpoints
- Can be cleared independently from other seed data

## Notes

- All sessions include the `heatmap-ready` tag for easy filtering
- Sessions are distributed across the last 7 days
- Coordinates are generated around realistic "hotspots" (navigation, CTAs, etc.)
- Events follow the rrweb format but are not packed (packing happens client-side)
- Compatible with the rrweb Replayer for DOM reconstruction
