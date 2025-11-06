const express = require('express');
const router = express.Router();
const cohortController = require('../controllers/cohortController');

// Cohort routes
router.post('/', cohortController.createCohort);
router.get('/', cohortController.getCohorts);
router.get('/:id', cohortController.getCohortById);
router.put('/:id', cohortController.updateCohort);
router.delete('/:id', cohortController.deleteCohort);
router.get('/:id/analyze', cohortController.analyzeCohort);
router.get('/:id/export/csv', cohortController.exportCohortCSV);
router.get('/:id/export/pdf', cohortController.exportCohortPDF);

module.exports = router;
