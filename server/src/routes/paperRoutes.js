import { Router } from 'express';

import {
  deleteSavedPaper,
  deleteSavedPaperSchema,
  generatePaperSummary,
  savePaper,
  savePaperSchema,
  searchPapers,
  searchPapersSchema,
  summarizePaperSchema
} from '../controllers/paperController.js';
import { attachUserIfPresent, requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/search-papers', attachUserIfPresent, validate(searchPapersSchema), asyncHandler(searchPapers));
router.post('/save-paper', requireAuth, validate(savePaperSchema), asyncHandler(savePaper));
router.delete(
  '/save-paper/:paperId',
  requireAuth,
  validate(deleteSavedPaperSchema),
  asyncHandler(deleteSavedPaper)
);
router.post(
  '/ai/summarize-paper',
  requireAuth,
  validate(summarizePaperSchema),
  asyncHandler(generatePaperSummary)
);

export default router;
