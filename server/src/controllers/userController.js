import { listSavedPapersByUserId } from '../repositories/savedPapersRepository.js';
import { getEffectivePlanCapabilities, getQuotaSnapshot } from '../services/quotaService.js';

export async function getUserData(req, res) {
  const savedPapers = await listSavedPapersByUserId(req.user.id);
  const planCapabilities = await getEffectivePlanCapabilities(req.user.plan);

  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      plan: req.user.plan,
      billing: req.user.billing || null,
      createdAt: req.user.createdAt
    },
    savedPapers,
    quota: getQuotaSnapshot({ user: req.user }),
    planCapabilities
  });
}
