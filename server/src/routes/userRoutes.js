import { Router } from 'express';

import { getUserData } from '../controllers/userController.js';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/get-user-data', requireAuth, asyncHandler(getUserData));

export default router;

