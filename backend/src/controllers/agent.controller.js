const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { runManualDeadlineCheck } = require('../services/deadlineCheck.service');

exports.runDeadlineCheck = asyncHandler(async (req, res) => {
  const data = await runManualDeadlineCheck();
  
  return sendSuccess(res, 'Deadline check completed', data);
});
