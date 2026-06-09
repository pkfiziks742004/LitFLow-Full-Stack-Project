import { z } from 'zod';

import { createAdminLog } from '../repositories/adminLogsRepository.js';
import {
  deleteSavedPaperById,
  deleteContentPaper,
  listContentPapers,
  listSavedPapersForAdmin,
  upsertContentPaper
} from '../repositories/systemRepository.js';

function getIpAddress(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
}

export const listContentSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    view: z.enum(['all', 'featured', 'trending']).optional().default('all')
  })
};

export async function getAdminContent(req, res) {
  const [savedPapers, curatedPapers] = await Promise.all([
    listSavedPapersForAdmin(req.query),
    listContentPapers({
      ...req.query,
      featuredOnly: req.query.view === 'featured',
      trendingOnly: req.query.view === 'trending'
    })
  ]);

  res.json({
    success: true,
    savedPapers,
    curatedPapers
  });
}

export const upsertContentPaperSchema = {
  body: z.object({
    id: z.number().optional(),
    paperId: z.string().optional().default(''),
    title: z.string().min(1),
    authors: z.array(z.object({ name: z.string(), authorId: z.string().optional().default('') })).optional().default([]),
    year: z.number().int().nullable().optional(),
    abstract: z.string().optional().default(''),
    venue: z.string().optional().default(''),
    url: z.string().optional().default(''),
    pdfUrl: z.string().optional().default(''),
    isTrending: z.boolean().optional().default(false),
    isFeatured: z.boolean().optional().default(false),
    source: z.string().optional().default('manual'),
    notes: z.string().optional().default('')
  })
};

export async function saveAdminContentPaper(req, res) {
  const contentPaper = await upsertContentPaper(req.body);

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'content_paper_saved',
    targetType: 'content_paper',
    targetId: `${contentPaper.id}`,
    ipAddress: getIpAddress(req),
    metadata: {
      title: contentPaper.title,
      isTrending: contentPaper.isTrending,
      isFeatured: contentPaper.isFeatured
    }
  });

  res.json({
    success: true,
    contentPaper
  });
}

export const deleteContentSchema = {
  params: z.object({
    id: z.coerce.number().int().positive()
  })
};

export async function removeAdminContentPaper(req, res) {
  await deleteContentPaper(req.params.id);

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'content_paper_deleted',
    targetType: 'content_paper',
    targetId: `${req.params.id}`,
    ipAddress: getIpAddress(req)
  });

  res.json({
    success: true,
    message: 'Content paper deleted successfully.'
  });
}

export const deleteSavedPaperSchema = {
  params: z.object({
    id: z.coerce.number().int().positive()
  })
};

export async function removeAdminSavedPaper(req, res) {
  await deleteSavedPaperById(req.params.id);

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'saved_paper_deleted',
    targetType: 'saved_paper',
    targetId: `${req.params.id}`,
    ipAddress: getIpAddress(req)
  });

  res.json({
    success: true,
    message: 'Saved paper deleted successfully.'
  });
}
