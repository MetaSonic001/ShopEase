/**
 * Backfill stats for existing session recordings
 * This script calculates totalEvents, totalClicks, and totalScrolls
 * for recordings that don't have these stats populated
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SessionRecording = require('../models/SessionRecording');

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pagepulse';

async function backfillStats() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully');

        // Find recordings without stats or with incomplete stats
        const recordings = await SessionRecording.find({
            $or: [
                { 'stats.totalEvents': { $exists: false } },
                { 'stats.totalEvents': 0 },
                { 'stats.totalClicks': { $exists: false } },
                { 'stats.totalScrolls': { $exists: false } },
            ]
        }).select('sessionId events');

        console.log(`Found ${recordings.length} recordings to update`);

        let updated = 0;
        let skipped = 0;

        for (const recording of recordings) {
            try {
                if (!recording.events || recording.events.length === 0) {
                    console.log(`Skipping ${recording.sessionId} - no events`);
                    skipped++;
                    continue;
                }

                // Calculate stats from events
                let totalEvents = 0;
                let totalClicks = 0;
                let totalScrolls = 0;
                let totalMoves = 0;

                recording.events.forEach(event => {
                    totalEvents++;

                    // Handle both object and string event formats
                    let eventData = event;
                    if (typeof event === 'string') {
                        try {
                            eventData = JSON.parse(event);
                        } catch (e) {
                            return;
                        }
                    }

                    // Count by event type (rrweb event types)
                    // Type 3 = IncrementalSnapshot (contains user interactions)
                    if (eventData.type === 3 && eventData.data) {
                        const source = eventData.data.source;

                        // Source 2 = MouseInteraction (includes clicks)
                        if (source === 2) {
                            const interactionType = eventData.data.type;
                            // Type 2 = MouseUp (click completion)
                            if (interactionType === 2) {
                                totalClicks++;
                            }
                        }

                        // Source 3 = Scroll
                        if (source === 3) {
                            totalScrolls++;
                        }

                        // Source 1 = MouseMove
                        if (source === 1) {
                            totalMoves++;
                        }
                    }
                });

                // Update the recording with calculated stats
                await SessionRecording.updateOne(
                    { _id: recording._id },
                    {
                        $set: {
                            'stats.totalEvents': totalEvents,
                            'stats.totalClicks': totalClicks,
                            'stats.totalScrolls': totalScrolls,
                            'stats.totalMoves': totalMoves,
                        }
                    }
                );

                console.log(`✓ Updated ${recording.sessionId}: ${totalEvents} events, ${totalClicks} clicks, ${totalScrolls} scrolls`);
                updated++;
            } catch (err) {
                console.error(`Error updating ${recording.sessionId}:`, err.message);
            }
        }

        console.log('\n=== Summary ===');
        console.log(`Total recordings found: ${recordings.length}`);
        console.log(`Successfully updated: ${updated}`);
        console.log(`Skipped: ${skipped}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

// Run the script
backfillStats();
