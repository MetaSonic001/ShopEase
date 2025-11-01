const Funnel = require('../models/Funnel');
const UserEvent = require('../models/UserEvent');

// Create a new funnel
exports.createFunnel = async (req, res) => {
  try {
    const { name, description, steps, projectId } = req.body;

    if (!name || !steps || steps.length < 2) {
      return res.status(400).json({ error: 'Funnel name and at least 2 steps are required' });
    }

    const funnel = new Funnel({
      name,
      description,
      steps,
      projectId: projectId || 'default',
    });

    await funnel.save();

    res.status(201).json({ success: true, funnel });
  } catch (error) {
    console.error('Error creating funnel:', error);
    res.status(500).json({ error: 'Failed to create funnel' });
  }
};

// Get all funnels
exports.getFunnels = async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = {};
    if (projectId) query.projectId = projectId;

    const funnels = await Funnel.find(query).sort({ createdAt: -1 });

    res.json({ success: true, funnels });
  } catch (error) {
    console.error('Error fetching funnels:', error);
    res.status(500).json({ error: 'Failed to fetch funnels' });
  }
};

// Get funnel by ID
exports.getFunnelById = async (req, res) => {
  try {
    const { id } = req.params;

    const funnel = await Funnel.findById(id);

    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    res.json({ success: true, funnel });
  } catch (error) {
    console.error('Error fetching funnel:', error);
    res.status(500).json({ error: 'Failed to fetch funnel' });
  }
};

// Update funnel
exports.updateFunnel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, steps } = req.body;

    const funnel = await Funnel.findByIdAndUpdate(
      id,
      { name, description, steps, updatedAt: new Date() },
      { new: true }
    );

    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    res.json({ success: true, funnel });
  } catch (error) {
    console.error('Error updating funnel:', error);
    res.status(500).json({ error: 'Failed to update funnel' });
  }
};

// Delete funnel
exports.deleteFunnel = async (req, res) => {
  try {
    const { id } = req.params;

    const funnel = await Funnel.findByIdAndDelete(id);

    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    res.json({ success: true, message: 'Funnel deleted successfully' });
  } catch (error) {
    console.error('Error deleting funnel:', error);
    res.status(500).json({ error: 'Failed to delete funnel' });
  }
};

// Analyze funnel
exports.analyzeFunnel = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;

    const funnel = await Funnel.findById(id);

    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    // Calculate date filter
    let startDate = new Date();
    if (dateRange === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (dateRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (dateRange === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    }

    const analysis = [];
    let previousStepUsers = null;

    // Analyze each step
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      
      // Build query for this step
      const query = {
        projectId: funnel.projectId,
        timestamp: { $gte: startDate },
        eventType: step.eventType,
      };

      if (step.pageURL) {
        query.pageURL = step.pageURL;
      }

      if (step.elementSelector) {
        query.$or = [
          { elementClass: { $regex: step.elementSelector.replace('.', ''), $options: 'i' } },
          { elementId: { $regex: step.elementSelector.replace('#', ''), $options: 'i' } },
        ];
      }

      // Get unique users who completed this step
      const users = await UserEvent.distinct('userId', query);
      const userCount = users.length;

      // Calculate conversion rate
      let conversionRate = 100;
      let dropoffRate = 0;

      if (i === 0) {
        previousStepUsers = userCount;
      } else {
        conversionRate = previousStepUsers > 0 ? (userCount / previousStepUsers) * 100 : 0;
        dropoffRate = 100 - conversionRate;
        previousStepUsers = userCount;
      }

      // Calculate average time to next step
      let avgTimeToNext = null;
      if (i < funnel.steps.length - 1) {
        const nextStep = funnel.steps[i + 1];
        
        // Find events for this step and next step
        const currentStepEvents = await UserEvent.find(query)
          .select('userId timestamp')
          .sort({ timestamp: 1 });

        const nextStepQuery = {
          projectId: funnel.projectId,
          timestamp: { $gte: startDate },
          eventType: nextStep.eventType,
        };

        if (nextStep.pageURL) nextStepQuery.pageURL = nextStep.pageURL;

        const nextStepEvents = await UserEvent.find(nextStepQuery)
          .select('userId timestamp')
          .sort({ timestamp: 1 });

        // Calculate time differences
        const timeDiffs = [];
        currentStepEvents.forEach(currentEvent => {
          const nextEvent = nextStepEvents.find(
            ne => ne.userId === currentEvent.userId && ne.timestamp > currentEvent.timestamp
          );
          if (nextEvent) {
            const diff = (nextEvent.timestamp - currentEvent.timestamp) / 1000; // in seconds
            timeDiffs.push(diff);
          }
        });

        if (timeDiffs.length > 0) {
          avgTimeToNext = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
        }
      }

      analysis.push({
        stepName: step.name,
        users: userCount,
        conversionRate: Math.round(conversionRate * 10) / 10,
        dropoffRate: Math.round(dropoffRate * 10) / 10,
        avgTimeToNext: avgTimeToNext ? Math.round(avgTimeToNext) : null,
      });
    }

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Error analyzing funnel:', error);
    res.status(500).json({ error: 'Failed to analyze funnel' });
  }
};
