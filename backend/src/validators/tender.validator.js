const { z } = require('zod');

const defaultCompanyProfile = {
  companyName: 'Nova Printing and Advertising PLC',
  industry: 'Printing and Advertising',
  services: [
    'Printing',
    'Branding',
    'Advertising materials',
    'Digital printing',
    'Large format printing',
  ],
  location: 'Addis Ababa, Ethiopia',
};

const companyProfileSchema = z.object({
  companyName: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  services: z.array(z.string().min(1)).optional(),
  location: z.string().min(1).optional(),
});

const analyzeTenderSchema = z.object({
  rawText: z
    .string({ required_error: 'rawText is required' })
    .min(50, 'rawText must be at least 50 characters'),
  companyProfile: companyProfileSchema.optional(),
});

const checklistStatusSchema = z.object({
  status: z.enum(['pending', 'completed']),
});

const emailTenderSchema = z.object({
  to: z.string().email('to must be a valid email address'),
});

const checklistCategorySchema = z.enum([
  'document',
  'financial',
  'technical',
  'eligibility',
  'submission',
  'review',
  'communication',
]);

//****** Gemini JSON response schema (Zod) **************//

const geminiAnalysisSchema = z.object({
  tenderSummary: z.object({
    title: z.string().min(1),
    client: z.string().min(1),
    industry: z.string().min(1),
    category: z.string().min(1),
    location: z.union([z.string().min(1), z.null()]),
    deadline: z.union([z.string(), z.null()]),
    submissionMethod: z.union([z.string(), z.null()]),
    cpoRequirement: z.union([z.string(), z.null()]),
    estimatedEffort: z.enum(['low', 'medium', 'high']),
    urgencyLevel: z.enum(['low', 'medium', 'high']),
  }),
  companyFit: z.object({
    matchedServices: z.array(z.string().min(1)),
    unmatchedRequirements: z.array(z.string().min(1)),
    fitExplanation: z.string().min(1),
  }),
  decision: z.object({
    bidFitScore: z.number().int().min(0).max(100),
    recommendation: z.enum(['proceed', 'proceed_with_caution', 'do_not_bid']),
    confidence: z.enum(['low', 'medium', 'high']),
    reasoning: z.string().min(1),
  }),
  requirements: z.object({
    requiredDocuments: z.array(z.string().min(1)),
    eligibilityCriteria: z.array(z.string().min(1)),
    financialRequirements: z.array(z.string().min(1)),
    technicalRequirements: z.array(z.string().min(1)),
  }),
  riskAssessment: z.object({
    riskLevel: z.enum(['low', 'medium', 'high']),
    riskFlags: z.array(
      z.object({
        title: z.string().min(1),
        severity: z.enum(['low', 'medium', 'high']),
        description: z.string(),
      }),
    ),
    missingInformation: z.array(z.string()),
  }),
  executionPlan: z.object({
    nextBestAction: z.string().min(1),
    checklist: z.array(
      z.object({
        title: z.string().min(1),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
        category: checklistCategorySchema,
        dueDate: z.union([z.string(), z.null()]),
      }),
    ),
  }),
  automationPlan: z.object({
    calendarReminderNeeded: z.boolean(),
    emailSummaryNeeded: z.boolean(),
    followUpReminderNeeded: z.boolean(),
    suggestedReminderDate: z.union([z.string(), z.null()]),
    stakeholdersToNotify: z.array(z.string()),
  }),
});

module.exports = {
  defaultCompanyProfile,
  analyzeTenderSchema,
  checklistStatusSchema,
  emailTenderSchema,
  geminiAnalysisSchema,
  checklistCategorySchema,
};
