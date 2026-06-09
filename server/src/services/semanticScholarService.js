import axios from 'axios';

import { env } from '../config/env.js';
import { localGraphEdges, localPaperCatalog } from '../data/localResearchCatalog.js';
import { ApiError } from '../utils/apiError.js';

const searchFields = [
  'paperId',
  'title',
  'abstract',
  'year',
  'authors',
  'venue',
  'url',
  'openAccessPdf',
  'citationCount',
  'referenceCount',
  'influentialCitationCount',
  'fieldsOfStudy',
  'externalIds'
].join(',');

const referenceFields = [
  'citedPaper.paperId',
  'citedPaper.title',
  'citedPaper.abstract',
  'citedPaper.year',
  'citedPaper.authors',
  'citedPaper.venue',
  'citedPaper.url',
  'citedPaper.openAccessPdf'
].join(',');

const citationFields = [
  'citingPaper.paperId',
  'citingPaper.title',
  'citingPaper.abstract',
  'citingPaper.year',
  'citingPaper.authors',
  'citingPaper.venue',
  'citingPaper.url',
  'citingPaper.openAccessPdf'
].join(',');

const semanticScholarClient = axios.create({
  baseURL: env.semanticScholarBaseUrl,
  timeout: 20000,
  headers: env.semanticScholarApiKey
    ? {
        'x-api-key': env.semanticScholarApiKey
      }
    : {}
});

const localPaperIndex = new Map(localPaperCatalog.map((paper) => [paper.paperId, paper]));

function mapAuthor(author = {}) {
  return {
    authorId: author.authorId || '',
    name: author.name || 'Unknown author'
  };
}

function mapPaper(paper = {}) {
  return {
    paperId: paper.paperId || '',
    title: paper.title || 'Untitled paper',
    abstract: paper.abstract || 'Abstract not available.',
    year: paper.year || null,
    authors: (paper.authors || []).map(mapAuthor),
    venue: paper.venue || '',
    url: paper.url || '',
    pdfUrl: paper.openAccessPdf?.url || '',
    citationCount: paper.citationCount || 0,
    referenceCount: paper.referenceCount || 0,
    influentialCitationCount: paper.influentialCitationCount || 0,
    fieldsOfStudy: paper.fieldsOfStudy || [],
    externalIds: paper.externalIds || {}
  };
}

function matchesFilters(paper, { author, keywords }) {
  const normalizedAuthor = author?.trim().toLowerCase();
  const keywordList = `${keywords || ''}`
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);

  const authorMatches = !normalizedAuthor
    ? true
    : paper.authors.some((entry) => entry.name.toLowerCase().includes(normalizedAuthor));

  const keywordTarget = `${paper.title} ${paper.abstract} ${(paper.fieldsOfStudy || []).join(' ')}`
    .toLowerCase()
    .trim();

  const keywordMatches =
    keywordList.length === 0 || keywordList.every((keyword) => keywordTarget.includes(keyword));

  return authorMatches && keywordMatches;
}

function addGraphNode(nodes, paper, kind = 'seed') {
  if (!paper?.paperId || nodes.has(paper.paperId)) {
    return;
  }

  nodes.set(paper.paperId, {
    id: paper.paperId,
    kind,
    title: paper.title,
    year: paper.year,
    authors: paper.authors,
    abstract: paper.abstract,
    url: paper.url,
    pdfUrl: paper.pdfUrl,
    citationCount: paper.citationCount || 0
  });
}

function addGraphEdge(edges, source, target, relation) {
  if (!source || !target) {
    return;
  }

  const id = `${source}-${target}-${relation}`;

  if (!edges.has(id)) {
    edges.set(id, { id, source, target, relation });
  }
}

function normalizeSearchText(value = '') {
  return `${value}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreLocalPaper(paper, normalizedQuery) {
  if (!normalizedQuery) {
    return Math.log10((paper.citationCount || 0) + 10);
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const title = normalizeSearchText(paper.title);
  const abstract = normalizeSearchText(paper.abstract);
  const fields = normalizeSearchText((paper.fieldsOfStudy || []).join(' '));
  const authors = normalizeSearchText((paper.authors || []).map((author) => author.name).join(' '));
  const combined = `${title} ${abstract} ${fields} ${authors}`.trim();
  let score = 0;

  if (title === normalizedQuery) score += 18;
  if (title.includes(normalizedQuery)) score += 12;
  if (abstract.includes(normalizedQuery)) score += 6;
  if (fields.includes(normalizedQuery)) score += 5;
  if (authors.includes(normalizedQuery)) score += 4;

  queryTokens.forEach((token) => {
    if (title.includes(token)) score += 4;
    if (fields.includes(token)) score += 2.5;
    if (abstract.includes(token)) score += 1.5;
    if (authors.includes(token)) score += 1.5;
  });

  if (!combined.includes(normalizedQuery) && score === 0) {
    return 0;
  }

  return score + Math.min(6, Math.log10((paper.citationCount || 0) + 10));
}

function buildLocalGraph(seedPapers) {
  const nodes = new Map();
  const edges = new Map();
  const seedItems = seedPapers.slice(0, 6);
  const seedIds = new Set(seedItems.map((paper) => paper.paperId));

  seedItems.forEach((paper) => addGraphNode(nodes, paper, 'seed'));

  localGraphEdges.forEach((edge) => {
    if (!seedIds.has(edge.source) && !seedIds.has(edge.target)) {
      return;
    }

    const sourcePaper = localPaperIndex.get(edge.source);
    const targetPaper = localPaperIndex.get(edge.target);

    if (!sourcePaper || !targetPaper) {
      return;
    }

    addGraphNode(
      nodes,
      sourcePaper,
      seedIds.has(edge.source) ? 'seed' : edge.relation === 'related' ? 'related' : 'reference'
    );
    addGraphNode(
      nodes,
      targetPaper,
      seedIds.has(edge.target) ? 'seed' : edge.relation === 'related' ? 'related' : 'reference'
    );
    addGraphEdge(edges, edge.source, edge.target, edge.relation);
  });

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values())
  };
}

function searchLocalCatalog({ query, limit = 12, yearStart, yearEnd, author, keywords }) {
  const normalizedQuery = normalizeSearchText(query);
  const rankedPapers = localPaperCatalog
    .filter((paper) => {
      if (yearStart && paper.year && paper.year < yearStart) {
        return false;
      }

      if (yearEnd && paper.year && paper.year > yearEnd) {
        return false;
      }

      return matchesFilters(paper, { author, keywords });
    })
    .map((paper) => ({
      paper,
      score: scoreLocalPaper(paper, normalizedQuery)
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if ((right.paper.citationCount || 0) !== (left.paper.citationCount || 0)) {
        return (right.paper.citationCount || 0) - (left.paper.citationCount || 0);
      }

      return (right.paper.year || 0) - (left.paper.year || 0);
    });

  const papers = rankedPapers.slice(0, Math.min(limit, 12)).map(({ paper }) => paper);

  return {
    total: rankedPapers.length,
    papers,
    graph: buildLocalGraph(papers)
  };
}

async function fetchReferences(paperId) {
  const response = await semanticScholarClient.get(`/paper/${paperId}/references`, {
    params: {
      fields: referenceFields,
      limit: 5
    }
  });

  return response.data?.data || [];
}

async function fetchCitations(paperId) {
  const response = await semanticScholarClient.get(`/paper/${paperId}/citations`, {
    params: {
      fields: citationFields,
      limit: 5
    }
  });

  return response.data?.data || [];
}

async function buildGraph(seedPapers) {
  const nodes = new Map();
  const edges = new Map();

  seedPapers.forEach((paper) => addGraphNode(nodes, paper, 'seed'));

  await Promise.all(
    seedPapers.slice(0, 4).map(async (paper) => {
      const [referenceResult, citationResult] = await Promise.allSettled([
        fetchReferences(paper.paperId),
        fetchCitations(paper.paperId)
      ]);

      if (referenceResult.status === 'fulfilled') {
        referenceResult.value.forEach((entry) => {
          const citedPaper = mapPaper(entry.citedPaper);
          addGraphNode(nodes, citedPaper, 'reference');
          addGraphEdge(edges, paper.paperId, citedPaper.paperId, 'references');
        });
      }

      if (citationResult.status === 'fulfilled') {
        citationResult.value.forEach((entry) => {
          const citingPaper = mapPaper(entry.citingPaper);
          addGraphNode(nodes, citingPaper, 'citation');
          addGraphEdge(edges, citingPaper.paperId, paper.paperId, 'cites');
        });
      }
    })
  );

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values())
  };
}

export async function searchAcademicPapers({ query, limit = 12, yearStart, yearEnd, author, keywords }) {
  try {
    const response = await semanticScholarClient.get('/paper/search', {
      params: {
        query,
        limit: Math.min(limit, 12),
        fields: searchFields,
        year:
          yearStart || yearEnd
            ? `${yearStart || 1900}-${yearEnd || new Date().getFullYear()}`
            : undefined
      }
    });

    const papers = (response.data?.data || []).map(mapPaper).filter(Boolean);
    const filteredPapers = papers.filter((paper) => matchesFilters(paper, { author, keywords }));
    const graph = await buildGraph(filteredPapers.slice(0, 6));

    return {
      total: response.data?.total || filteredPapers.length,
      papers: filteredPapers,
      graph
    };
  } catch (error) {
    console.warn('Primary paper search unavailable, serving local catalog fallback.', error.code || error.message);

    try {
      return searchLocalCatalog({ query, limit, yearStart, yearEnd, author, keywords });
    } catch (fallbackError) {
      console.error('Local catalog fallback failed.', fallbackError);
    }

    throw new ApiError(
      502,
      'Paper search failed. Please try again in a moment or adjust your filters.'
    );
  }
}
