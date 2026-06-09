import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminClient } from '../api/http';
import AdminShell from '../components/AdminShell';
import ChartPanel from '../components/ChartPanel';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import WorkspaceLinkCard from '../components/WorkspaceLinkCard';
import useAdminLiveRefresh from '../hooks/useAdminLiveRefresh';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function AnalyticsPage({ pageView = 'overview' }) {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [aiUsage, setAiUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAnalytics(nextDays = days) {
    try {
      setLoading(true);
      const [{ data: analyticsResponse }, { data: aiResponse }] = await Promise.all([
        adminClient.analytics({ days: nextDays }),
        adminClient.aiAnalytics({ days: nextDays })
      ]);

      setAnalytics(analyticsResponse);
      setAiUsage(aiResponse);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  useAdminLiveRefresh(() => {
    loadAnalytics();
  });

  const keywordColumns = [
    { key: 'keyword', header: 'Keyword' },
    { key: 'count', header: 'Searches' }
  ];

  const paperColumns = [
    {
      key: 'title',
      header: 'Paper',
      render: (paper) => (
        <div className="table-title">
          <strong>{paper.title}</strong>
          <span>{paper.paperId || 'No paper id recorded'}</span>
        </div>
      )
    },
    { key: 'saves', header: 'Saved count' }
  ];

  const activityColumns = [
    {
      key: 'eventType',
      header: 'Event',
      render: (event) => (
        <div className="table-title">
          <strong>{event.eventType}</strong>
          <span>{event.keyword || event.paperId || 'No event metadata'}</span>
        </div>
      )
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (event) => <StatusBadge value={event.plan || 'UNKNOWN'} />
    },
    {
      key: 'createdAt',
      header: 'Time',
      render: (event) => formatDate(event.createdAt)
    }
  ];

  const aiColumns = [
    {
      key: 'plan',
      header: 'Plan',
      render: (entry) => <StatusBadge value={entry.plan} />
    },
    { key: 'requests', header: 'Requests' },
    {
      key: 'cost',
      header: 'Cost',
      render: (entry) => formatCurrency(entry.cost)
    }
  ];

  const isSearchView = pageView === 'search';
  const isAiView = pageView === 'ai';
  const pageTitle = isSearchView
    ? 'Search insights'
    : isAiView
      ? 'AI usage analytics'
      : 'Analytics and AI usage';
  const pageSubtitle = isSearchView
    ? 'Review search demand, paper discovery patterns, and the topics users are actively exploring.'
    : isAiView
      ? 'Track request volume, cost behavior, and recent AI activity across free and Pro plans.'
      : 'Track demand patterns, paper engagement, and OpenAI cost behavior across free and pro users.';
  const sectionScrollId = isSearchView ? 'analytics-keywords' : isAiView ? 'analytics-activity' : '';
  const showChartsSection = !isAiView;
  const showSearchSection = isSearchView;
  const showActivitySection = isAiView;

  return (
    <AdminShell
      title={pageTitle}
      subtitle={pageSubtitle}
      headerVariant="compact"
      showStatusStrip={false}
      sectionScrollId={sectionScrollId}
      actions={
        <div className="inline-filters" style={{ minWidth: '260px' }}>
          <label>
            <span>Time window</span>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>
      }
    >
      <section id="analytics-overview" className="metrics-grid">
        <MetricCard
          label="Tracked users"
          value={analytics?.metrics?.trackedUsers || 0}
          helper={`Window: ${days} days`}
        />
        <MetricCard
          label="AI requests"
          value={aiUsage?.metrics?.totalRequests || analytics?.metrics?.totalAiRequests || 0}
          helper="Summary and simplification calls"
        />
        <MetricCard
          label="AI spend"
          value={formatCurrency(aiUsage?.metrics?.totalCostInr || 0)}
          helper="Estimated usage cost"
        />
        <MetricCard
          label="Avg AI cost"
          value={formatCurrency(aiUsage?.metrics?.averageCostInr || 0)}
          helper="Per request estimate"
        />
        <MetricCard
          label="Top keyword"
          value={analytics?.metrics?.mostSearchedKeywords?.[0]?.keyword || 'N/A'}
          helper={`Count: ${analytics?.metrics?.mostSearchedKeywords?.[0]?.count || 0}`}
        />
        <MetricCard
          label="Top paper saves"
          value={analytics?.metrics?.popularResearchPapers?.[0]?.saves || 0}
          helper={analytics?.metrics?.popularResearchPapers?.[0]?.title || 'No saved paper trends yet'}
        />
      </section>

      {!isSearchView && !isAiView ? (
        <section className="content-grid" style={{ marginTop: '1rem' }}>
          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Open a dedicated insight page</h3>
                <p>Split discovery behavior and AI usage into focused operational screens.</p>
              </div>
            </div>

            <div className="dashboard-shortcuts-grid">
              <WorkspaceLinkCard
                to="/analytics/search"
                label="Search insights"
                description="Review keywords, saved-paper demand, and discovery patterns."
              />
              <WorkspaceLinkCard
                to="/analytics/ai"
                label="AI usage"
                description="Inspect request volume, recent activity, and cost by plan."
              />
              <WorkspaceLinkCard
                to="/content/curated"
                label="Curated content"
                description="Use demand signals to decide what should be featured next."
              />
            </div>
          </div>

          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Analytics workflow</h3>
                <p>Move from overview to the exact report that matches the decision you need to make.</p>
              </div>
            </div>

            <div className="list-stack">
              <div className="activity-item">
                <strong>Search insights</strong>
                <p>Best for homepage curation, onboarding copy, and feature prioritization based on user demand.</p>
              </div>
              <div className="activity-item">
                <strong>AI usage</strong>
                <p>Best for monitoring usage cost, recent AI traffic, and plan-based request behavior.</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showChartsSection ? (
        <section id="analytics-charts" className="charts-grid">
          <ChartPanel title="Search trends">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={analytics?.charts?.searchTrends || []}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="searches" stroke="#3b82f6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="User engagement">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics?.charts?.userEngagement || []}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="activeUsers" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </section>
      ) : null}

      {showSearchSection ? (
        <section id="analytics-keywords" className="content-grid">
          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Most searched keywords</h3>
                <p>Top search intent driving paper discovery.</p>
              </div>
            </div>
            <DataTable
              columns={keywordColumns}
              rows={analytics?.metrics?.mostSearchedKeywords || []}
              emptyMessage={loading ? 'Loading keyword trends...' : 'No keyword data available.'}
            />
          </div>

          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Popular research papers</h3>
                <p>Most frequently saved papers in LitFlow.</p>
              </div>
            </div>
            <DataTable
              columns={paperColumns}
              rows={analytics?.metrics?.popularResearchPapers || []}
              emptyMessage={loading ? 'Loading paper trends...' : 'No popular papers yet.'}
            />
          </div>
        </section>
      ) : null}

      {showActivitySection ? (
        <section id="analytics-activity" className="content-grid">
          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Recent platform activity</h3>
                <p>Searches, OTP flows, saves, and AI calls recorded in the selected window.</p>
              </div>
            </div>
            <DataTable
              columns={activityColumns}
              rows={analytics?.recentActivity || []}
              emptyMessage={loading ? 'Loading activity feed...' : 'No recent activity found.'}
            />
          </div>

          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>AI breakdown by plan</h3>
                <p>Usage and estimated spend by user tier.</p>
              </div>
            </div>
            <DataTable
              columns={aiColumns}
              rows={aiUsage?.breakdown || []}
              emptyMessage={loading ? 'Loading AI usage...' : 'No AI usage recorded yet.'}
            />
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}
