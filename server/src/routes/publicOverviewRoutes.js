import { Router } from 'express';

import { getPublicOverview } from '../controllers/publicOverviewController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/public/overview', asyncHandler(getPublicOverview));

export default router;
