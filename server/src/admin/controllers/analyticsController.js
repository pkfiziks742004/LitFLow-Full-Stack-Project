import { listAnalyticsEvents } from '../repositories/systemRepository.js';
import { getSavedPaperCounts, getAllUsersLite } from '../repositories/panelRepository.js';

function groupByDate(rows, valueGetter) {
  const map = new Map();

  rows.forEach((row) => {
    const key = row.dateKey || new Date(row.createdAt).toISOString().slice(0, 10);
    map.set(key, (map.get(key) || 0) + valueGetter(row));
  });

  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ date, value }));
}

function topKeywords(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const keyword = row.keyword?.trim();
    if (!keyword) return;
    map.set(keyword, (map.get(keyword) || 0) + 1);
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
}

function popularPapers(savedPapers) {
  const map = new Map();

  savedPapers.forEach((paper) => {
    const key = paper.paper_id || paper.title;
    if (!map.has(key)) {
      map.set(key, {
        paperId: paper.paper_id || '',
        title: paper.title,
        saves: 0
      });
    }

    map.get(key).saves += 1;
  });

  return Array.from(map.values())
    .sort((a, b) => b.saves - a.saves)
    .slice(0, 10);
}

export async function getAdminAnalytics(req, res) {
  const days = Number(req.query.days || 30);
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [searchEvents, activityEvents, aiEvents, savedPapers, users] = await Promise.all([
    listAnalyticsEvents({ eventType: 'search', fromDate }),
    listAnalyticsEvents({ fromDate }),
    listAnalyticsEvents({ eventType: 'ai_summary', fromDate }),
    getSavedPaperCounts(),
    getAllUsersLite()
  ]);

  const searchTrends = groupByDate(searchEvents, () => 1).map((entry) => ({
    date: entry.date,
    searches: entry.value
  }));

  const engagementMap = new Map();
  activityEvents.forEach((event) => {
    const key = event.dateKey;
    if (!engagementMap.has(key)) engagementMap.set(key, new Set());
    if (event.userId) engagementMap.get(key).add(event.userId);
  });

  const userEngagement = Array.from(engagementMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, set]) => ({ date, activeUsers: set.size }));

  res.json({
    success: true,
    metrics: {
      mostSearchedKeywords: topKeywords(searchEvents),
      popularResearchPapers: popularPapers(savedPapers),
      totalAiRequests: aiEvents.length,
      trackedUsers: users.length
    },
    charts: {
      searchTrends,
      userEngagement
    },
    recentActivity: activityEvents.slice(0, 20)
  });
}

export async function getAdminAiUsage(req, res) {
  const days = Number(req.query.days || 30);
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const aiEvents = await listAnalyticsEvents({ eventType: 'ai_summary', fromDate });

  const totalCost = aiEvents.reduce((sum, event) => sum + Number(event.payload?.estimatedCostInr || 0), 0);
  const byPlanMap = new Map();

  aiEvents.forEach((event) => {
    const plan = event.plan || 'UNKNOWN';
    if (!byPlanMap.has(plan)) {
      byPlanMap.set(plan, { plan, requests: 0, cost: 0 });
    }

    const current = byPlanMap.get(plan);
    current.requests += 1;
    current.cost += Number(event.payload?.estimatedCostInr || 0);
  });

  res.json({
    success: true,
    metrics: {
      totalRequests: aiEvents.length,
      totalCostInr: totalCost,
      averageCostInr: aiEvents.length ? totalCost / aiEvents.length : 0
    },
    breakdown: Array.from(byPlanMap.values()),
    requests: aiEvents.slice(0, 50)
  });
}
