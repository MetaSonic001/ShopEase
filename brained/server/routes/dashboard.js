const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../controllers/authController');

// All dashboard routes require authentication
router.get('/overview', authenticate, dashboardController.getDashboardOverview);
router.get('/page', authenticate, dashboardController.getPageAnalytics);
router.get('/user-flow', authenticate, dashboardController.getUserFlow);

module.exports = router;
