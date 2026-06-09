import { z } from 'zod';

import { listAdminLogs } from '../repositories/adminLogsRepository.js';
import { listAnalyticsEvents } from '../repositories/systemRepository.js';

export const listLogsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    action: z.string().optional().default(''),
    status: z.string().optional().default('')
  })
};

export async function getAdminLogs(req, res) {
  const [adminLogs, otpEvents, failedOtpEvents] = await Promise.all([
    listAdminLogs(req.query),
    listAnalyticsEvents({ eventType: 'otp_verify_success', limit: 50 }),
    listAnalyticsEvents({ eventType: 'otp_verify_failure', limit: 50 })
  ]);

  res.json({
    success: true,
    adminLogs,
    otpVerificationLogs: otpEvents,
    failedOtpAttempts: failedOtpEvents
  });
}
