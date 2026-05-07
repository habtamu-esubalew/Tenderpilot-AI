const express = require('express');
const agentController = require('../controllers/agent.controller');

const router = express.Router();

router.post('/run-deadline-check', agentController.runDeadlineCheck);

module.exports = router;
