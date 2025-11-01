const UAParser = require('ua-parser-js');

// Middleware to parse user-agent headers into a deviceInfo object
module.exports = function deviceInfo(req, res, next) {
  try {
    const ua = req.headers['user-agent'] || '';
    const parser = new UAParser(ua);
    const result = parser.getResult();

    req.deviceInfo = {
      device: result.device && result.device.model ? `${result.device.vendor || ''} ${result.device.model}`.trim() : (result.device.type || 'unknown'),
      browser: result.browser && result.browser.name ? `${result.browser.name} ${result.browser.version || ''}`.trim() : 'unknown',
      os: result.os && result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'unknown',
      raw: {
        ua,
        parsed: result
      }
    };
  } catch (err) {
    req.deviceInfo = { device: 'unknown', browser: 'unknown', os: 'unknown', raw: {} };
  }
  next();
};
