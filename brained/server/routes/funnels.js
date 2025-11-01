const express = require('express');
const router = express.Router();
const funnelController = require('../controllers/funnelController');

// Funnel routes
router.post('/', funnelController.createFunnel);
router.get('/', funnelController.getFunnels);
router.get('/:id', funnelController.getFunnelById);
router.put('/:id', funnelController.updateFunnel);
router.delete('/:id', funnelController.deleteFunnel);
router.get('/:id/analyze', funnelController.analyzeFunnel);

module.exports = router;
