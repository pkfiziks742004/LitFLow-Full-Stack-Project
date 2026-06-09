import { Router } from 'express';

import { getSiteConfig } from '../controllers/siteConfigController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/site-config', asyncHandler(getSiteConfig));

export default router;
