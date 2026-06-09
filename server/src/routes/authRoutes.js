import { Router } from 'express';

import { sendOtp, sendOtpSchema, verifyOtp, verifyOtpSchema } from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/send-otp', validate(sendOtpSchema), asyncHandler(sendOtp));
router.post('/verify-otp', validate(verifyOtpSchema), asyncHandler(verifyOtp));

export default router;

