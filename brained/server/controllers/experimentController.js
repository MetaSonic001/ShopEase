const Experiment = require('../models/Experiment');
const UserEvent = require('../models/UserEvent');

// Create a new experiment
exports.createExperiment = async (req, res) => {
  try {
    const { name, description, variants, targetMetric, status, projectId } = req.body;

    if (!name || !variants || variants.length < 2) {
      return res.status(400).json({ error: 'Experiment name and at least 2 variants are required' });
    }

    // Validate that weights sum to 100
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      return res.status(400).json({ error: 'Variant weights must sum to 100%' });
    }

    const experiment = new Experiment({
      name,
      description,
      variants,
      targetMetric: targetMetric || 'conversion',
      status: status || 'draft',
      projectId: projectId || 'default',
    });

    await experiment.save();

    res.status(201).json({ success: true, experiment });
  } catch (error) {
    console.error('Error creating experiment:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
};

// Get all experiments
exports.getExperiments = async (req, res) => {
  try {
    const { projectId, status } = req.query;

    const query = {};
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;

    const experiments = await Experiment.find(query).sort({ createdAt: -1 });

    res.json({ success: true, experiments });
  } catch (error) {
    console.error('Error fetching experiments:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
};

// Get experiment by ID
exports.getExperimentById = async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await Experiment.findById(id);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({ success: true, experiment });
  } catch (error) {
    console.error('Error fetching experiment:', error);
    res.status(500).json({ error: 'Failed to fetch experiment' });
  }
};

// Update experiment
exports.updateExperiment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, variants, targetMetric, status } = req.body;

    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (variants) updateData.variants = variants;
    if (targetMetric) updateData.targetMetric = targetMetric;
    if (status) {
      updateData.status = status;
      if (status === 'running' && !updateData.startDate) {
        updateData.startDate = new Date();
      } else if (status === 'completed' && !updateData.endDate) {
        updateData.endDate = new Date();
      }
    }

    const experiment = await Experiment.findByIdAndUpdate(id, updateData, { new: true });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({ success: true, experiment });
  } catch (error) {
    console.error('Error updating experiment:', error);
    res.status(500).json({ error: 'Failed to update experiment' });
  }
};

// Delete experiment
exports.deleteExperiment = async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await Experiment.findByIdAndDelete(id);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({ success: true, message: 'Experiment deleted successfully' });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    res.status(500).json({ error: 'Failed to delete experiment' });
  }
};

// Analyze experiment
exports.analyzeExperiment = async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await Experiment.findById(id);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Calculate results for each variant
    const results = [];

    // Use experiment start date or 30 days ago
    const startDate = experiment.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const variant of experiment.variants) {
      // In a real implementation, you would track which users saw which variant
      // For now, we'll simulate data based on variant weights

      // Get events for this experiment
      const query = {
        projectId: experiment.projectId,
        timestamp: { $gte: startDate },
        // In production, you'd filter by: experimentId: experiment._id, variantName: variant.name
      };

      const totalEvents = await UserEvent.countDocuments(query);
      
      // Simulate impressions based on weight
      const impressions = Math.round((totalEvents * variant.weight) / 100);
      
      // Simulate conversions based on target metric
      let conversions = 0;
      
      if (experiment.targetMetric === 'conversion') {
        // Simulate conversion rate between 2-10%
        const baseRate = 0.05;
        const variance = (Math.random() - 0.5) * 0.04; // ±2%
        conversions = Math.round(impressions * (baseRate + variance));
      } else if (experiment.targetMetric === 'clicks') {
        const baseRate = 0.15;
        const variance = (Math.random() - 0.5) * 0.1;
        conversions = Math.round(impressions * (baseRate + variance));
      } else if (experiment.targetMetric === 'engagement') {
        const baseRate = 0.3;
        const variance = (Math.random() - 0.5) * 0.2;
        conversions = Math.round(impressions * (baseRate + variance));
      }

      const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0;

      results.push({
        name: variant.name,
        impressions,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        confidence: 0,
        isWinner: false,
      });
    }

    // Calculate statistical confidence and determine winner
    if (results.length >= 2) {
      // Sort by conversion rate
      const sorted = [...results].sort((a, b) => b.conversionRate - a.conversionRate);
      
      // Mark the best performing variant as winner
      const winner = sorted[0];
      const winnerIndex = results.findIndex(r => r.name === winner.name);
      
      if (winnerIndex !== -1) {
        results[winnerIndex].isWinner = true;
        
        // Calculate confidence based on sample size and difference
        const control = sorted[1];
        const diff = Math.abs(winner.conversionRate - control.conversionRate);
        const avgImpressions = (winner.impressions + control.impressions) / 2;
        
        // Simple confidence calculation (in production, use proper statistical tests)
        let confidence = 0;
        if (avgImpressions > 1000) {
          confidence = Math.min(99, 70 + (diff * 5) + (avgImpressions / 100));
        } else if (avgImpressions > 500) {
          confidence = Math.min(95, 60 + (diff * 4) + (avgImpressions / 100));
        } else if (avgImpressions > 100) {
          confidence = Math.min(90, 50 + (diff * 3) + (avgImpressions / 100));
        } else {
          confidence = Math.min(80, 40 + (diff * 2));
        }
        
        results[winnerIndex].confidence = Math.round(confidence * 10) / 10;
        
        // Set confidence for other variants
        results.forEach((r, i) => {
          if (i !== winnerIndex) {
            r.confidence = Math.max(0, results[winnerIndex].confidence - 20 - Math.random() * 30);
          }
        });
      }
    }

    // Generate trend data (last 7 days)
    const trends = [];
    const days = 7;

    for (let day = days - 1; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0];

      const trendPoint = { date: dateStr };

      results.forEach(result => {
        // Simulate daily trend (in production, get actual daily data)
        const dailyRate = result.conversionRate + (Math.random() - 0.5) * 2;
        trendPoint[result.name] = Math.max(0, Math.round(dailyRate * 100) / 100);
      });

      trends.push(trendPoint);
    }

    res.json({ success: true, results, trends });
  } catch (error) {
    console.error('Error analyzing experiment:', error);
    res.status(500).json({ error: 'Failed to analyze experiment' });
  }
};

// Assign variant to user (for implementing A/B tests)
exports.assignVariant = async (req, res) => {
  try {
    const { experimentId, userId } = req.body;

    const experiment = await Experiment.findById(experimentId);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (experiment.status !== 'running') {
      return res.status(400).json({ error: 'Experiment is not running' });
    }

    // Assign variant based on weights
    const random = Math.random() * 100;
    let cumulative = 0;
    let assignedVariant = experiment.variants[0];

    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        assignedVariant = variant;
        break;
      }
    }

    res.json({ success: true, variant: assignedVariant });
  } catch (error) {
    console.error('Error assigning variant:', error);
    res.status(500).json({ error: 'Failed to assign variant' });
  }
};
