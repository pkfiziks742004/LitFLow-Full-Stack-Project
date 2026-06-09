import { Router } from 'express';

import adminRoutes from '../admin/routes/index.js';
import authRoutes from './authRoutes.js';
import billingRoutes from './billingRoutes.js';
import paperRoutes from './paperRoutes.js';
import publicOverviewRoutes from './publicOverviewRoutes.js';
import siteConfigRoutes from './siteConfigRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.use(authRoutes);
router.use(publicOverviewRoutes);
router.use(siteConfigRoutes);
router.use(paperRoutes);
router.use(userRoutes);
router.use(billingRoutes);
router.use('/admin', adminRoutes);

export default router;
