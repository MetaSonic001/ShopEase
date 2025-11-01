const express = require('express');
const router = express.Router();
const experimentController = require('../controllers/experimentController');

// Experiment routes
router.post('/', experimentController.createExperiment);
router.get('/', experimentController.getExperiments);
router.get('/:id', experimentController.getExperimentById);
router.patch('/:id', experimentController.updateExperiment);
router.delete('/:id', experimentController.deleteExperiment);
router.get('/:id/analyze', experimentController.analyzeExperiment);
router.post('/assign', experimentController.assignVariant);

module.exports = router;
