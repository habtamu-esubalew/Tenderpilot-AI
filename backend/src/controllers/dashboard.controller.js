const { prisma } = require('../config/prisma');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { startOfDay } = require('../utils/dateUtils');
const { tenderIncludeList, formatTenderListItem } = require('../services/tender.service');

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const fromToday = startOfDay(new Date());

  const [
    totalTenders,
    proceedCount,
    cautionCount,
    doNotBidCount,
    highRiskCount,
    upcomingDeadlines,
    completedChecklistItems,
    pendingChecklistItems,
    totalAgentActions,
    emailsSent,
    calendarRemindersCreated,
    recentTenders,
    recentAgentActions,
  ] = await Promise.all([
    prisma.tender.count(),
    prisma.tender.count({ where: { recommendation: 'proceed' } }),
    prisma.tender.count({ where: { recommendation: 'proceed_with_caution' } }),
    prisma.tender.count({ where: { recommendation: 'do_not_bid' } }),
    prisma.tender.count({ where: { riskLevel: 'high' } }),
    prisma.tender.count({
      where: {
        deadline: { not: null, gte: fromToday },
      },
    }),
    prisma.checklistItem.count({ where: { status: 'completed' } }),
    prisma.checklistItem.count({ where: { status: 'pending' } }),
    prisma.agentActionLog.count(),
    prisma.tender.count({ where: { emailSent: true } }),
    prisma.agentActionLog.count({
      where: { actionType: 'calendar_reminder_created' },
    }),
    prisma.tender.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: tenderIncludeList,
    }),
    prisma.agentActionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        tender: { select: { id: true, title: true, client: true } },
      },
    }),
  ]);

  return sendSuccess(res, 'Dashboard stats', {
    totalTenders,
    proceedCount,
    cautionCount,
    doNotBidCount,
    highRiskCount,
    upcomingDeadlines,
    pendingChecklistItems,
    completedChecklistItems,
    totalAgentActions,
    emailsSent,
    calendarRemindersCreated,
    recentTenders: recentTenders.map(formatTenderListItem),
    recentAgentActions,
  });
});
