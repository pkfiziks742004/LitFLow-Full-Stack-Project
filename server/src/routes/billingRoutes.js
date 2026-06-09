import { Router } from 'express';

import {
  createSubscription,
  getCheckoutConfig,
  syncSubscriptionStatus,
  verifySubscription,
  verifySubscriptionSchema
} from '../controllers/billingController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/billing/checkout-config', asyncHandler(getCheckoutConfig));
router.post('/billing/create-subscription', requireAuth, asyncHandler(createSubscription));
router.post(
  '/billing/verify-subscription',
  requireAuth,
  validate(verifySubscriptionSchema),
  asyncHandler(verifySubscription)
);
router.get('/billing/sync-subscription', requireAuth, asyncHandler(syncSubscriptionStatus));

export default router;
