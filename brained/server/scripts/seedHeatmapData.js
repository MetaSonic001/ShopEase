const mongoose = require('mongoose');
const SessionRecording = require('../models/SessionRecording');
const HeatmapData = require('../models/HeatmapData');
const UserInteraction = require('../models/UserInteraction');

// Pages to generate data for
// Define realistic pages to seed data for (PagePulse customer-facing routes)
const PAGES = [
  { 
    url: 'http://localhost:5173/', 
    title: 'PagePulse - Home',
    viewport: { width: 1920, height: 1080 }
  },
  { 
    url: 'http://localhost:5173/products', 
    title: 'PagePulse - Products',
    viewport: { width: 1920, height: 1080 }
  },
  { 
    url: 'http://localhost:5173/about', 
    title: 'PagePulse - About Us',
    viewport: { width: 1920, height: 1080 }
  },
  { 
    url: 'http://localhost:5173/cart', 
    title: 'PagePulse - Shopping Cart',
    viewport: { width: 1920, height: 1080 }
  },
  { 
    url: 'http://localhost:5173/product/1', 
    title: 'PagePulse - Product Details',
    viewport: { width: 1920, height: 1080 }
  },
  { 
    url: 'http://localhost:5173/categories', 
    title: 'PagePulse - Categories',
    viewport: { width: 1920, height: 1080 }
  },
  { 
    url: 'http://localhost:5173/checkout', 
    title: 'PagePulse - Checkout',
    viewport: { width: 1920, height: 1080 }
  },
];

const devices = [
  { deviceType: 'desktop', browser: 'Chrome', os: 'Windows 11', screen: '1920x1080', viewport: '1920x969' },
  { deviceType: 'desktop', browser: 'Firefox', os: 'macOS 14', screen: '2560x1440', viewport: '2560x1328' },
  { deviceType: 'mobile', browser: 'Safari', os: 'iOS 17', screen: '390x844', viewport: '390x664' },
  { deviceType: 'tablet', browser: 'Safari', os: 'iPadOS 17', screen: '1024x1366', viewport: '1024x1294' },
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSessionId() {
  return `session_${Math.random().toString(36).substr(2, 12)}`;
}

function generateUserId() {
  return `user_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate realistic rrweb-compatible events as JSON strings (not packed - packing is client-side)
 * These events mimic what rrweb.record() produces before pack() is applied
 */
function generateRRWebEvents(page, duration, clickCoords = [], scrollCoords = [], hoverCoords = []) {
  const events = [];
  const baseTime = Date.now();
  const { width, height } = page.viewport;
  
  // Event type 2: Full snapshot (DOM snapshot at start)
  events.push(JSON.stringify({
    type: 2,
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 1,
            name: 'html',
            attributes: { lang: 'en' },
            childNodes: [
              {
                type: 1,
                name: 'head',
                childNodes: [
                  { type: 1, name: 'title', childNodes: [{ type: 3, textContent: page.title }] },
                  { type: 1, name: 'meta', attributes: { charset: 'UTF-8' } },
                ],
              },
              {
                type: 1,
                name: 'body',
                attributes: { class: 'min-h-screen bg-white' },
                childNodes: [
                  {
                    type: 1,
                    name: 'div',
                    attributes: { id: 'root', class: 'container mx-auto' },
                    childNodes: [
                      { type: 1, name: 'header', attributes: { class: 'header' } },
                      { type: 1, name: 'main', attributes: { class: 'main-content' } },
                      { type: 1, name: 'footer', attributes: { class: 'footer' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      initialOffset: { left: 0, top: 0 },
    },
    timestamp: baseTime,
  }));

  // Event type 4: Meta event (page info)
  events.push(JSON.stringify({
    type: 4,
    data: {
      href: page.url,
      width,
      height,
    },
    timestamp: baseTime + 50,
  }));

  // Event type 3, source 1: Mouse movements
  const moveCount = hoverCoords.length || 20;
  for (let i = 0; i < moveCount; i++) {
    const coord = hoverCoords[i] || {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
    };
    events.push(JSON.stringify({
      type: 3,
      data: {
        source: 1, // MouseMove
        positions: [{ x: coord.x, y: coord.y, timeOffset: 0 }],
      },
      timestamp: baseTime + 200 + i * 300,
    }));
  }

  // Event type 3, source 2: Mouse clicks
  for (let i = 0; i < clickCoords.length; i++) {
    const coord = clickCoords[i];
    events.push(JSON.stringify({
      type: 3,
      data: {
        source: 2, // MouseInteraction
        type: 2, // Click (0=mouseup, 1=mousedown, 2=click, etc.)
        id: Math.floor(Math.random() * 100) + 10, // DOM node id
        x: coord.x,
        y: coord.y,
      },
      timestamp: baseTime + 5000 + i * 1500,
    }));
  }

  // Event type 3, source 3: Scroll events
  for (let i = 0; i < scrollCoords.length; i++) {
    const coord = scrollCoords[i];
    events.push(JSON.stringify({
      type: 3,
      data: {
        source: 3, // Scroll
        id: 0, // Document or specific element
        x: coord.x || 0,
        y: coord.y,
      },
      timestamp: baseTime + 10000 + i * 800,
    }));
  }

  // Add some viewport resize events if mobile
  if (width < 768) {
    events.push(JSON.stringify({
      type: 4,
      data: {
        width,
        height,
      },
      timestamp: baseTime + 15000,
    }));
  }

  // Event type 3, source 5: Input events (text typing)
  if (Math.random() > 0.6) {
    events.push(JSON.stringify({
      type: 3,
      data: {
        source: 5, // Input
        text: '*', // Masked for privacy
        isChecked: false,
        id: Math.floor(Math.random() * 50) + 5,
      },
      timestamp: baseTime + 18000,
    }));
  }

  return events;
}

/**
 * Generate realistic heatmap interaction coordinates for a page
 */
function generateHeatmapCoordinates(page, device, count = 30) {
  const { width, height } = page.viewport;
  const coords = {
    clicks: [],
    scrolls: [],
    hovers: [],
  };

  // Common clickable areas (header, buttons, links)
  const hotspots = [
    { x: width * 0.1, y: 80, label: 'Logo' },
    { x: width * 0.7, y: 80, label: 'Nav Menu' },
    { x: width * 0.9, y: 80, label: 'User Menu' },
    { x: width * 0.5, y: height * 0.3, label: 'Hero CTA' },
    { x: width * 0.3, y: height * 0.5, label: 'Product Card 1' },
    { x: width * 0.5, y: height * 0.5, label: 'Product Card 2' },
    { x: width * 0.7, y: height * 0.5, label: 'Product Card 3' },
    { x: width * 0.5, y: height * 0.8, label: 'Footer Link' },
  ];

  // Generate clicks around hotspots
  for (let i = 0; i < count / 3; i++) {
    const hotspot = randomElement(hotspots);
    coords.clicks.push({
      x: Math.max(0, Math.min(width, Math.floor(hotspot.x + (Math.random() - 0.5) * 100))),
      y: Math.max(0, Math.min(height, Math.floor(hotspot.y + (Math.random() - 0.5) * 50))),
      value: 1,
    });
  }

  // Generate scroll positions (vertical progression)
  const scrollStops = 8;
  for (let i = 0; i < scrollStops; i++) {
    coords.scrolls.push({
      x: 0,
      y: Math.floor((i / scrollStops) * height * 2), // Allow scrolling beyond viewport
      value: Math.floor(Math.random() * 5) + 1,
    });
  }

  // Generate hover/move positions
  for (let i = 0; i < count; i++) {
    coords.hovers.push({
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
      value: 1,
    });
  }

  return coords;
}

/**
 * Seed session recordings with rrweb events and heatmap data
 */
async function seedHeatmapSessionRecordings(count = 30) {
  try {
    console.log(`🎥 Seeding ${count} Heatmap Session Recordings with rrweb events...`);

    const recordings = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const sessionId = generateSessionId();
      const userId = generateUserId();
      const device = randomElement(devices);
      const page = randomElement(PAGES);
      
      const startTime = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000); // last 7 days
      const duration = 30 + Math.random() * 180; // 30s - 3.5min
      const endTime = new Date(startTime.getTime() + duration * 1000);

      // Generate realistic coordinates
      const coords = generateHeatmapCoordinates(page, device, 40);

      // Generate rrweb events
      const events = generateRRWebEvents(page, duration, coords.clicks, coords.scrolls, coords.hovers);

      // Console logs
      const consoleLogs = Array.from({ length: Math.floor(Math.random() * 3) }, (_, idx) => ({
        timestamp: startTime.getTime() + idx * 5000,
        level: randomElement(['log', 'info', 'warn']),
        message: randomElement(['Component rendered', 'User action tracked', 'API call successful']),
      }));

      // Network requests
      const networkRequests = Array.from({ length: Math.floor(Math.random() * 8) + 2 }, (_, idx) => {
        const req = {
          timestamp: startTime.getTime() + idx * 2000,
          method: randomElement(['GET', 'POST']),
          url: `/api/${randomElement(['products', 'users', 'analytics'])}`,
          status: 200,
          duration: 50 + Math.random() * 300,
          type: 'fetch',
        };
        // Only add error field if needed
        if (Math.random() > 0.95) {
          req.error = 'Network timeout';
        }
        return req;
      });

      // Stats
      const totalEvents = events.length;
      const totalClicks = coords.clicks.length;
      const totalScrolls = coords.scrolls.length;
      const totalMoves = coords.hovers.length;

      const recording = {
        sessionId,
        userId,
        projectId: 'default',
        startTime,
        endTime,
        duration,
        entryURL: page.url,
        exitURL: page.url,
        pagesVisited: [page.url],
        device,
        metadata: {
          url: page.url,
          title: page.title,
          device,
        },
        events, // Array of JSON strings (rrweb format)
        consoleLogs,
        // networkRequests,
        // errors: [],
        stats: {
          totalEvents,
          totalClicks,
          totalScrolls,
          totalMoves,
          avgMouseSpeed: 150 + Math.random() * 300,
        },
        hasErrors: false,
        isComplete: true,
        tags: [device.deviceType, 'heatmap-ready'],
        isSeeded: true,
      };

      recordings.push(recording);
    }

    const result = await SessionRecording.insertMany(recordings);
    console.log(`✅ Seeded ${result.length} Heatmap Session Recordings`);
    return result;
  } catch (error) {
    console.error('❌ Error seeding Heatmap Session Recordings:', error);
    throw error;
  }
}

/**
 * Seed aggregated heatmap data points
 */
async function seedHeatmapAggregatedData() {
  try {
    console.log('🔥 Seeding Aggregated Heatmap Data...');

    const heatmaps = [];
    const now = Date.now();
    const dateRange = {
      start: new Date(now - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    for (const page of PAGES) {
      for (const type of ['click', 'scroll', 'move', 'hover']) {
        for (const device of ['desktop', 'mobile', 'tablet']) {
          const coords = generateHeatmapCoordinates(page, { deviceType: device }, 50);
          
          let points = [];
          if (type === 'click') points = coords.clicks;
          else if (type === 'scroll') points = coords.scrolls;
          else points = coords.hovers;

          const heatmap = {
            pageURL: page.url,
            projectId: 'default',
            type,
            points: points.map(p => ({
              x: p.x,
              y: p.y,
              value: Math.floor(Math.random() * 10) + 1,
              timestamp: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000),
            })),
            viewport: page.viewport,
            device,
            dateRange,
            metadata: {
              totalInteractions: points.length,
              uniqueUsers: Math.floor(Math.random() * 20) + 5,
              avgTimeOnPage: 60 + Math.random() * 120,
              sessionCount: Math.floor(Math.random() * 30) + 10,
              lastUpdated: new Date(),
            },
            sessionIds: [],
          };

          heatmaps.push(heatmap);
        }
      }
    }

    const result = await HeatmapData.insertMany(heatmaps);
    console.log(`✅ Seeded ${result.length} Aggregated Heatmap Data documents`);
    return result;
  } catch (error) {
    console.error('❌ Error seeding Aggregated Heatmap Data:', error);
    throw error;
  }
}

/**
 * Seed raw user interactions (for heatmap generation)
 */
async function seedRawUserInteractions(count = 500) {
  try {
    console.log(`👆 Seeding ${count} Raw User Interactions...`);

    const interactions = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const page = randomElement(PAGES);
      const device = randomElement(devices);
      const eventType = randomElement(['click', 'scroll', 'mousemove', 'hover']);
      const coords = generateHeatmapCoordinates(page, device, 1);
      
      let coord;
      if (eventType === 'click') coord = coords.clicks[0];
      else if (eventType === 'scroll') coord = coords.scrolls[0];
      else coord = coords.hovers[0];

      const interaction = {
        userId: generateUserId(),
        sessionId: generateSessionId(),
        projectId: 'default',
        eventType,
        eventName: `${eventType}_interaction`,
        pageURL: page.url,
        pageTitle: page.title,
        timestamp: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000),
        metadata: {
          x: coord.x,
          y: coord.y,
          device: device.deviceType,
          browser: device.browser,
          os: device.os,
          viewport: page.viewport,
          elementTag: randomElement(['button', 'a', 'div', 'span', 'input']),
          elementId: `elem_${Math.floor(Math.random() * 100)}`,
        },
      };

      interactions.push(interaction);
    }

    const result = await UserInteraction.insertMany(interactions);
    console.log(`✅ Seeded ${result.length} Raw User Interactions`);
    return result;
  } catch (error) {
    console.error('❌ Error seeding Raw User Interactions:', error);
    throw error;
  }
}

/**
 * Clear all seeded heatmap data
 */
async function clearSeededHeatmapData() {
  try {
    console.log('🗑️  Clearing seeded Heatmap data...');
    
    const sessionResult = await SessionRecording.deleteMany({ isSeeded: true, tags: 'heatmap-ready' });
    const heatmapResult = await HeatmapData.deleteMany({ projectId: 'default' });
    const interactionResult = await UserInteraction.deleteMany({ projectId: 'default' });

    console.log(`✅ Deleted ${sessionResult.deletedCount} session recordings`);
    console.log(`✅ Deleted ${heatmapResult.deletedCount} heatmap aggregations`);
    console.log(`✅ Deleted ${interactionResult.deletedCount} user interactions`);
    
    return {
      deletedCount: sessionResult.deletedCount + heatmapResult.deletedCount + interactionResult.deletedCount,
    };
  } catch (error) {
    console.error('❌ Error clearing seeded Heatmap data:', error);
    throw error;
  }
}

/**
 * Seed all heatmap-related data
 */
async function seedAllHeatmapData() {
  console.log('\n🚀 Starting comprehensive heatmap data seeding...\n');
  
  const sessions = await seedHeatmapSessionRecordings(30);
  const heatmaps = await seedHeatmapAggregatedData();
  const interactions = await seedRawUserInteractions(500);
  
  console.log('\n✅ Heatmap seeding complete!');
  console.log(`   - ${sessions.length} session recordings with rrweb events`);
  console.log(`   - ${heatmaps.length} aggregated heatmap data documents`);
  console.log(`   - ${interactions.length} raw user interactions\n`);
  
  return { sessions, heatmaps, interactions };
}

module.exports = {
  seedHeatmapSessionRecordings,
  seedHeatmapAggregatedData,
  seedRawUserInteractions,
  seedAllHeatmapData,
  clearSeededHeatmapData,
};
