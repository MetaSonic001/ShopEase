const AlertRule = require('../models/AlertRule');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const UserInteraction = require('../models/UserInteraction');
const { sendSlackWebhook, sendGenericWebhook } = require('../utils/webhooks');

let intervalHandle = null;

function compare(val, comparator, threshold) {
  switch (comparator) {
    case '>': return val > threshold;
    case '>=': return val >= threshold;
    case '<': return val < threshold;
    case '<=': return val <= threshold;
    case '==': return val == threshold; // eslint-disable-line eqeqeq
    case '!=': return val != threshold; // eslint-disable-line eqeqeq
    default: return false;
  }
}

async function computeMetric(metric, projectId, windowMinutes) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  switch (metric) {
    case 'events_per_minute': {
      const count = await UserInteraction.countDocuments({
        projectId,
        timestamp: { $gte: since }
      });
      return count / windowMinutes; // average events per minute
    }
    case 'lcp_p75':
    case 'cls_p75':
    case 'inp_p75': {
      const field = metric.split('_')[0].toUpperCase(); // LCP/CLS/INP
      const docs = await PerformanceMetrics.find({
        projectId,
        timestamp: { $gte: since }
      }).select(field).lean();
      const values = docs.map(d => d[field]).filter(v => typeof v === 'number');
      if (!values.length) return 0;
      values.sort((a,b)=>a-b);
      const idx = Math.floor(0.75 * (values.length - 1));
      return values[idx];
    }
    case 'js_errors_per_minute': {
      const docs = await PerformanceMetrics.find({
        projectId,
        timestamp: { $gte: since },
        jsErrors: { $exists: true, $ne: [] }
      }).select('jsErrors').lean();
      const totalErrors = docs.reduce((sum, d) => sum + (Array.isArray(d.jsErrors) ? d.jsErrors.length : 0), 0);
      return totalErrors / windowMinutes;
    }
    default:
      return 0;
  }
}

async function evaluateRules() {
  try {
    const activeRules = await AlertRule.find({ isActive: true });
    for (const rule of activeRules) {
      const value = await computeMetric(rule.metric, rule.projectId, rule.windowMinutes);
      const shouldTrigger = compare(value, rule.comparator, rule.threshold);
      const now = Date.now();
      const last = rule.lastTriggeredAt ? rule.lastTriggeredAt.getTime() : 0;
      const cooledDown = now - last >= (rule.cooldownMs || 0);
      if (shouldTrigger && cooledDown) {
        const msg = `Alert '${rule.name}' (${rule.metric}) value=${value.toFixed(2)} ${rule.comparator} ${rule.threshold}`;
        try {
          if (rule.channel === 'slack' && rule.slackWebhook) {
            await sendSlackWebhook(rule.slackWebhook, { text: msg });
          } else if (rule.channel === 'webhook' && rule.webhookUrl) {
            await sendGenericWebhook(rule.webhookUrl, { message: msg, metric: rule.metric, value });
          }
          rule.lastTriggeredAt = new Date();
          await rule.save();
        } catch (e) {
          console.error('[AlertsScheduler] Failed delivering alert', e.message);
        }
      }
    }
  } catch (e) {
    console.error('[AlertsScheduler] evaluation error', e);
  }
}

function start(intervalMs = 60 * 1000) {
  if (intervalHandle) return;
  intervalHandle = setInterval(evaluateRules, intervalMs);
  console.log('[AlertsScheduler] started');
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[AlertsScheduler] stopped');
  }
}

module.exports = { start, stop, evaluateRules };
