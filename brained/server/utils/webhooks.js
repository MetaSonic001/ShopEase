const fetch = require('node-fetch');

async function withRetry(fn, { retries = 3, delayMs = 500 }) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

async function sendGenericWebhook(url, body, headers = {}) {
  return withRetry(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body || {}),
      timeout: 10000,
    });
    if (!res.ok) throw new Error(`Webhook failed ${res.status}`);
    return res.status;
  }, { retries: 3, delayMs: 500 });
}

async function sendSlackWebhook(url, payload) {
  const body = { text: payload?.text || 'Alert', ...payload };
  return sendGenericWebhook(url, body);
}

module.exports = { sendSlackWebhook, sendGenericWebhook };
