import rateLimit from 'express-rate-limit';
import { Router } from 'express';

import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';
import { requireAdminAuth } from '../middlewares/adminAuth.js';
import { adminLogin, adminLoginSchema, getAdminProfile } from '../controllers/authController.js';
import { getAdminDashboard } from '../controllers/dashboardController.js';
import {
  deleteAdminUser,
  getAdminUserDetails,
  listAdminUsers,
  listUsersSchema,
  toggleBlockUser,
  blockUserSchema,
  updateAdminUserPlan,
  updateUserPlanSchema,
  userIdSchema
} from '../controllers/usersController.js';
import {
  createAdminManualPayment,
  deletePaymentSchema,
  getAdminPayments,
  listPaymentsSchema,
  manualPaymentSchema,
  removeAdminPayment
} from '../controllers/paymentsController.js';
import { getAdminAiUsage, getAdminAnalytics } from '../controllers/analyticsController.js';
import {
  deleteSettingSchema,
  getAdminControls,
  removeAdminSetting,
  updateAdminFeatureControl,
  updateAdminSetting,
  updateFeatureSchema,
  updateSettingSchema
} from '../controllers/controlsController.js';
import {
  deleteContentSchema,
  deleteSavedPaperSchema,
  getAdminContent,
  listContentSchema,
  removeAdminSavedPaper,
  removeAdminContentPaper,
  saveAdminContentPaper,
  upsertContentPaperSchema
} from '../controllers/contentController.js';
import { getAdminLogs, listLogsSchema } from '../controllers/logsController.js';

const router = Router();

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin login attempts. Try again later.'
  }
});

router.post('/login', adminLoginLimiter, validate(adminLoginSchema), asyncHandler(adminLogin));

router.use(requireAdminAuth);

router.get('/me', asyncHandler(getAdminProfile));
router.get('/dashboard', asyncHandler(getAdminDashboard));
router.get('/users', validate(listUsersSchema), asyncHandler(listAdminUsers));
router.get('/users/:userId', validate(userIdSchema), asyncHandler(getAdminUserDetails));
router.patch('/users/:userId/block', validate(blockUserSchema), asyncHandler(toggleBlockUser));
router.patch('/users/:userId/plan', validate(updateUserPlanSchema), asyncHandler(updateAdminUserPlan));
router.delete('/users/:userId', validate(userIdSchema), asyncHandler(deleteAdminUser));

router.get('/payments', validate(listPaymentsSchema), asyncHandler(getAdminPayments));
router.post('/payments/manual', validate(manualPaymentSchema), asyncHandler(createAdminManualPayment));
router.delete('/payments/:id', validate(deletePaymentSchema), asyncHandler(removeAdminPayment));

router.get('/analytics', asyncHandler(getAdminAnalytics));
router.get('/analytics/ai', asyncHandler(getAdminAiUsage));

router.get('/controls', asyncHandler(getAdminControls));
router.patch('/controls/:key', validate(updateFeatureSchema), asyncHandler(updateAdminFeatureControl));
router.patch('/settings/:key', validate(updateSettingSchema), asyncHandler(updateAdminSetting));
router.delete('/settings/:key', validate(deleteSettingSchema), asyncHandler(removeAdminSetting));

router.get('/content', validate(listContentSchema), asyncHandler(getAdminContent));
router.post('/content', validate(upsertContentPaperSchema), asyncHandler(saveAdminContentPaper));
router.delete('/content/:id', validate(deleteContentSchema), asyncHandler(removeAdminContentPaper));
router.delete('/content/saved/:id', validate(deleteSavedPaperSchema), asyncHandler(removeAdminSavedPaper));

router.get('/logs', validate(listLogsSchema), asyncHandler(getAdminLogs));

export default router;
