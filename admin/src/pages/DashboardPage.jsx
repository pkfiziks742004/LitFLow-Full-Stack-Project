import {
  Activity,
  Blocks,
  CreditCard,
  Crown,
  Search,
  Users
} from 'lucide-react';
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
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { adminClient } from '../api/http';
import AdminShell from '../components/AdminShell';
import ChartPanel from '../components/ChartPanel';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import useAdminLiveRefresh from '../hooks/useAdminLiveRefresh';
import { formatCurrency, formatDate } from '../utils/formatters';

function QuickAction({ to, label, description }) {
  return (
    <Link className="dashboard-action-link" to={to}>
      <strong>{label}</strong>
      <span>{description}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [controls, setControls] = useState([]);
  const [logs, setLogs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [content, setContent] = useState({ curatedPapers: { rows: [], count: 0 } });
  const [analytics, setAnalytics] = useState(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [
        { data: dashboardResponse },
        { data: controlsResponse },
        { data: logsResponse },
        { data: paymentsResponse },
        { data: contentResponse },
        { data: analyticsResponse }
      ] = await Promise.all([
        adminClient.dashboard(),
        adminClient.controls(),
        adminClient.logs({ page: 1, pageSize: 5 }),
        adminClient.payments({ page: 1, pageSize: 5 }),
        adminClient.content({ page: 1, pageSize: 4 }),
        adminClient.analytics({ days: 7 })
      ]);

      setDashboard(dashboardResponse);
      setControls(controlsResponse.features || []);
      setLogs(logsResponse.adminLogs?.rows || []);
      setPayments(paymentsResponse.rows || []);
      setContent(contentResponse);
      setAnalytics(analyticsResponse);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load admin cockpit.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useAdminLiveRefresh(() => {
    loadDashboard();
  });

  const metrics = dashboard?.metrics || {};
  const disabledControls = controls.filter((feature) => !feature.enabled).length;
  const featuredPapers = content.curatedPapers?.rows?.filter((paper) => paper.isFeatured).length || 0;
  const trendingPapers = content.curatedPapers?.rows?.filter((paper) => paper.isTrending).length || 0;
  const topKeywords = analytics?.metrics?.mostSearchedKeywords || [];

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Review users, revenue, content, analytics, and admin activity from one central workspace."
      actions={
        <button type="button" className="ghost-button" onClick={() => loadDashboard()}>
          Refresh cockpit
        </button>
      }
      showStatusStrip={false}
    >
      <section id="dashboard-overview" className="dashboard-summary-panel">
        <div className="dashboard-summary-main">
          <div>
            <p className="eyebrow">Overview</p>
            <h3>Workspace health</h3>
            <p>
              Users, revenue, rollout controls, content supply, and audit activity in one operational view.
            </p>
          </div>

          <div className="dashboard-action-row">
            <QuickAction to="/users" label="Manage users" description="Support and access" />
            <QuickAction to="/content/curated" label="Curate content" description="Featured research" />
            <QuickAction to="/settings" label="Settings hub" description="Branding and billing" />
          </div>
        </div>

        <div className="dashboard-summary-stats">
          <div>
            <span>Revenue</span>
            <strong>{formatCurrency(metrics.totalRevenue || 0)}</strong>
            <small>{metrics.proUsers || 0} PRO / {metrics.freeUsers || 0} FREE</small>
          </div>
          <div>
            <span>Disabled controls</span>
            <strong>{disabledControls}</strong>
            <small>{controls.filter((feature) => feature.enabled).length} enabled</small>
          </div>
          <div>
            <span>Content</span>
            <strong>{featuredPapers + trendingPapers}</strong>
            <small>{featuredPapers} featured / {trendingPapers} trending</small>
          </div>
          <div>
            <span>Recent logs</span>
            <strong>{logs.length}</strong>
            <small>Latest audit rows</small>
          </div>
        </div>
      </section>

      <section id="dashboard-metrics" className="metrics-grid">
        <MetricCard
          label="Total users"
          value={metrics.totalUsers || 0}
          helper="All accounts in LitFlow"
          icon={Users}
          tone="accent"
        />
        <MetricCard
          label="Active today"
          value={metrics.activeUsersDaily || 0}
          helper="Unique user activity today"
          icon={Activity}
          tone="success"
        />
        <MetricCard
          label="Total searches"
          value={metrics.totalSearches || 0}
          helper="Tracked paper discovery events"
          icon={Search}
          tone="accent"
        />
        <MetricCard
          label="Revenue"
          value={formatCurrency(metrics.totalRevenue || 0)}
          helper="Successful and active payment rows"
          icon={CreditCard}
          tone="success"
        />
        <MetricCard
          label="Pro users"
          value={metrics.proUsers || 0}
          helper="Current monetized accounts"
          icon={Crown}
          tone="warning"
        />
        <MetricCard
          label="Live feature flags"
          value={controls.filter((feature) => feature.enabled).length}
          helper="Enabled runtime switches"
          icon={Blocks}
          tone="accent"
        />
      </section>

      <section id="dashboard-trends" className="charts-grid">
        <ChartPanel title="User growth">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={dashboard?.charts?.userGrowth || []}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Revenue analytics">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dashboard?.charts?.revenueGrowth || []}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="revenue" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section id="dashboard-activity" className="content-grid">
        <div className="page-panel">
          <div className="panel-header">
            <div>
              <h3>Recent admin activity</h3>
              <p>High-signal actions happening inside the control center right now.</p>
            </div>
            <Link className="ghost-button small-button" to="/logs">
              Open logs
            </Link>
          </div>

          <div className="list-stack">
            {logs.length ? (
              logs.map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="split-inline">
                    <strong>{log.action}</strong>
                    <StatusBadge value={log.status} />
                  </div>
                  <p>
                    {log.targetType || 'system'} | {formatDate(log.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="empty-state">{loading ? 'Loading admin activity...' : 'No admin activity yet.'}</div>
            )}
          </div>
        </div>

        <div className="page-panel">
          <div className="panel-header">
            <div>
              <h3>Demand and discovery signals</h3>
              <p>See what researchers are searching for before you change content or pricing.</p>
            </div>
            <Link className="ghost-button small-button" to="/analytics">
              Open analytics
            </Link>
          </div>

          <div className="list-stack">
            {topKeywords.length ? (
              topKeywords.slice(0, 5).map((keyword) => (
                <div key={keyword.keyword} className="activity-item">
                  <div className="split-inline">
                    <strong>{keyword.keyword}</strong>
                    <span className="meta-line">{keyword.count} searches</span>
                  </div>
                  <p>Use this keyword trend for homepage content, onboarding, and featured graph ideas.</p>
                </div>
              ))
            ) : (
              <div className="empty-state">{loading ? 'Loading keyword trends...' : 'No keyword signals yet.'}</div>
            )}
          </div>
        </div>
      </section>

      <section id="dashboard-watchlist" className="content-grid">
        <div className="page-panel">
          <div className="panel-header">
            <div>
              <h3>Feature rollout board</h3>
              <p>Quick visibility into what is live, paused, or needs review.</p>
            </div>
            <Link className="ghost-button small-button" to="/controls">
              Open controls
            </Link>
          </div>

          <div className="list-stack">
            {controls.length ? (
              controls.map((feature) => (
                <div key={feature.key} className="paper-item">
                  <div className="split-inline">
                    <div className="stacked-stat">
                      <strong>{feature.label}</strong>
                      <span>{feature.description}</span>
                    </div>
                    <StatusBadge value={feature.enabled ? 'ACTIVE' : 'DISABLED'} />
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">{loading ? 'Loading controls...' : 'No controls configured yet.'}</div>
            )}
          </div>
        </div>

        <div className="page-panel">
          <div className="panel-header">
            <div>
              <h3>Revenue and content watchlist</h3>
              <p>Recent money movement and the curated papers currently shaping product experience.</p>
            </div>
            <div className="badge-row">
              <StatusBadge value={`FEATURED ${featuredPapers}`} />
              <StatusBadge value={`TRENDING ${trendingPapers}`} />
            </div>
          </div>

          <div className="list-stack">
            {payments.slice(0, 3).map((payment) => (
              <div key={`payment-${payment.id}`} className="paper-item">
                <div className="split-inline">
                  <div className="stacked-stat">
                    <strong>{payment.email || 'Unknown customer'}</strong>
                    <span>{formatCurrency(payment.amountInr || 0)}</span>
                  </div>
                  <StatusBadge value={payment.status} />
                </div>
              </div>
            ))}

            {content.curatedPapers?.rows?.slice(0, 2).map((paper) => (
              <div key={`content-${paper.id}`} className="paper-item">
                <div className="split-inline">
                  <div className="stacked-stat">
                    <strong>{paper.title}</strong>
                    <span>{paper.venue || 'Manual content entry'}</span>
                  </div>
                  <div className="badge-row">
                    {paper.isFeatured ? <StatusBadge value="FEATURED" /> : null}
                    {paper.isTrending ? <StatusBadge value="TRENDING" /> : null}
                  </div>
                </div>
              </div>
            ))}

            {!payments.length && !content.curatedPapers?.rows?.length ? (
              <div className="empty-state">{loading ? 'Loading watchlist...' : 'No payments or curated content yet.'}</div>
            ) : null}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
