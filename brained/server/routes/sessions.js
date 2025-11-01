const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticate, authorize } = require('../controllers/authController');

// Public routes (for tracking script)
router.post('/start', sessionController.startSession);
router.put('/:sessionId', sessionController.updateSession);
router.post('/:sessionId/end', sessionController.endSession);

// Protected routes (for dashboard)
router.get('/active', authenticate, sessionController.getActiveSessions);
router.get('/analytics', authenticate, sessionController.getSessionAnalytics);

module.exports = router;
