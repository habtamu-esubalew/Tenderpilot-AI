const tenderService = require('../services/tender.service');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../middleware/error.middleware');
const {
  defaultCompanyProfile,
  analyzeTenderSchema,
  checklistStatusSchema,
  emailTenderSchema,
} = require('../validators/tender.validator');

function formatValidationError(zodError) {
  return zodError.issues.map((e) => ({
    field: e.path.join('.') || 'root',
    message: e.message,
  }));
}

exports.analyzeTender = asyncHandler(async (req, res) => {
  const parsed = analyzeTenderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Validation failed', 422, formatValidationError(parsed.error));
  }

  const mergedProfile = {
    ...defaultCompanyProfile,
    ...parsed.data.companyProfile,
  };

  const tender = await tenderService.analyzeAndCreateTender(
    parsed.data.rawText,
    mergedProfile,
  );

  return sendSuccess(res, 'Tender analyzed and saved', tender, 201);
});

exports.listTenders = asyncHandler(async (req, res) => {
  const tenders = await tenderService.listTenders(req.query);
  return sendSuccess(res, 'Tenders fetched', tenders);
});

exports.getTenderById = asyncHandler(async (req, res) => {
  const tender = await tenderService.getTenderById(req.params.id);
  if (!tender) {
    throw new AppError('Tender not found', 404);
  }
  return sendSuccess(res, 'Tender fetched', tender);
});

exports.patchChecklistItem = asyncHandler(async (req, res) => {
  const parsed = checklistStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Validation failed', 422, formatValidationError(parsed.error));
  }

  const item = await tenderService.patchChecklistItem(
    req.params.id,
    req.params.itemId,
    parsed.data.status,
  );
  return sendSuccess(res, 'Checklist item updated', item);
});

exports.createCalendar = asyncHandler(async (req, res) => {
  const result = await tenderService.addCalendarForTender(req.params.id);
  return sendSuccess(res, 'Calendar link or event prepared', result);
});

exports.emailSummary = asyncHandler(async (req, res) => {
  const parsed = emailTenderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Validation failed', 422, formatValidationError(parsed.error));
  }

  const outcome = await tenderService.sendEmailForTender(req.params.id, parsed.data.to);
  return sendSuccess(res, outcome.status === 'sent' ? 'Email sent' : 'Email preview (mock)', outcome);
});

exports.deleteTender = asyncHandler(async (req, res) => {
  await tenderService.deleteTender(req.params.id);
  return sendSuccess(res, 'Tender deleted', {});
});
