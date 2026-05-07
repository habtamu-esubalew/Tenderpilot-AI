const express = require('express');
const tenderController = require('../controllers/tender.controller');

const router = express.Router();

router.post('/analyze', tenderController.analyzeTender);
router.get('/', tenderController.listTenders);
router.get('/:id', tenderController.getTenderById);
router.patch('/:id/checklist/:itemId', tenderController.patchChecklistItem);
router.post('/:id/calendar', tenderController.createCalendar);
router.post('/:id/email', tenderController.emailSummary);
router.delete('/:id', tenderController.deleteTender);

module.exports = router;
