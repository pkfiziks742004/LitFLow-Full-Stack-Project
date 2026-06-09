import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminClient } from '../api/http';
import AdminShell from '../components/AdminShell';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import PaginationControls from '../components/PaginationControls';
import StatusBadge from '../components/StatusBadge';
import WorkspaceLinkCard from '../components/WorkspaceLinkCard';
import useAdminLiveRefresh from '../hooks/useAdminLiveRefresh';
import { formatDate } from '../utils/formatters';

const PAGE_SIZE = 12;

export default function LogsPage({ pageView = 'home' }) {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    action: '',
    status: ''
  });
  const [logs, setLogs] = useState({
    adminLogs: { rows: [], count: 0 },
    otpVerificationLogs: [],
    failedOtpAttempts: []
  });
  const [loading, setLoading] = useState(true);

  async function loadLogs(nextFilters = filters) {
    try {
      setLoading(true);
      const { data } = await adminClient.logs(nextFilters);
      setLogs({
        adminLogs: data.adminLogs || { rows: [], count: 0 },
        otpVerificationLogs: data.otpVerificationLogs || [],
        failedOtpAttempts: data.failedOtpAttempts || []
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [filters.page, filters.pageSize, filters.action, filters.status]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1
    }));
  };

  const adminColumns = [
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <div className="table-title">
          <strong>{log.action}</strong>
          <span>{log.targetType || 'system'}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => <StatusBadge value={log.status} />
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (log) => log.ipAddress || 'N/A'
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (log) => formatDate(log.createdAt)
    }
  ];

  const otpColumns = [
    {
      key: 'eventType',
      header: 'Event',
      render: (log) => (
        <div className="table-title">
          <strong>{log.eventType}</strong>
          <span>{log.userId || log.plan || 'Anonymous'}</span>
        </div>
      )
    },
    {
      key: 'keyword',
      header: 'Metadata',
      render: (log) => log.keyword || log.payload?.email || log.paperId || 'N/A'
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (log) => formatDate(log.createdAt)
    }
  ];

  const isHomeView = pageView === 'home';
  const isAuditView = pageView === 'audit';
  const isOtpView = pageView === 'otp';
  const pageTitle = isHomeView ? 'Security workspace' : isOtpView ? 'OTP verification logs' : 'Audit logs';
  const pageSubtitle = isHomeView
    ? 'Keep admin audit trails and OTP monitoring on separate review pages so operators can move faster.'
    : isOtpView
      ? 'Track successful and failed OTP verifications in a dedicated security view for support and monitoring.'
      : 'Review admin activity, login trails, and settings change history from a focused audit screen.';
  const sectionScrollId = isAuditView ? 'logs-audit' : isOtpView ? 'logs-otp' : '';

  useAdminLiveRefresh(() => {
    loadLogs();
  });

  return (
    <AdminShell
      title={pageTitle}
      subtitle={pageSubtitle}
      headerVariant="compact"
      showStatusStrip={false}
      sectionScrollId={sectionScrollId}
      actions={
        <button type="button" className="ghost-button" onClick={() => loadLogs()}>
          Refresh logs
        </button>
      }
    >
      <section id="logs-overview" className="metrics-grid">
        <MetricCard label="Admin logs" value={logs.adminLogs.count} helper="Filtered audit records" />
        <MetricCard
          label="OTP success logs"
          value={logs.otpVerificationLogs.length}
          helper="Latest successful verifications"
        />
        <MetricCard
          label="OTP failure logs"
          value={logs.failedOtpAttempts.length}
          helper="Latest failed verification attempts"
        />
        <MetricCard
          label="Current status filter"
          value={filters.status || 'ALL'}
          helper="Admin log status filter"
        />
        <MetricCard
          label="Current action filter"
          value={filters.action || 'ALL'}
          helper="Admin log action filter"
        />
        <MetricCard
          label="Rows per page"
          value={filters.pageSize}
          helper="Admin audit table pagination"
        />
      </section>

      {isHomeView ? (
        <section className="content-grid" style={{ marginTop: '1rem' }}>
          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Open a security page</h3>
                <p>Audit and OTP activity now live on dedicated review screens.</p>
              </div>
            </div>

            <div className="dashboard-shortcuts-grid">
              <WorkspaceLinkCard
                to="/logs/audit"
                label="Audit logs"
                description="Inspect admin actions, login trails, and operational changes."
              />
              <WorkspaceLinkCard
                to="/logs/otp"
                label="OTP logs"
                description="Monitor successful and failed OTP verification activity."
              />
              <WorkspaceLinkCard
                to="/users"
                label="Users"
                description="Jump to user records when a security event needs account follow-up."
              />
            </div>
          </div>

          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Security snapshot</h3>
                <p>Use these counts to decide which security page needs your attention first.</p>
              </div>
            </div>

            <div className="list-stack">
              <div className="activity-item">
                <strong>{logs.adminLogs.count} admin audit rows</strong>
                <p>Open audit logs for login activity, settings changes, and admin management actions.</p>
              </div>
              <div className="activity-item">
                <strong>{logs.otpVerificationLogs.length} OTP successes</strong>
                <p>These show recently successful verification events captured by the analytics pipeline.</p>
              </div>
              <div className="activity-item">
                <strong>{logs.failedOtpAttempts.length} OTP failures</strong>
                <p>Review failed attempts when support, fraud checks, or login issues need deeper investigation.</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isAuditView ? (
        <section id="logs-audit" className="page-panel" style={{ marginTop: '1rem' }}>
          <div className="panel-header">
            <div>
              <h3>Admin audit logs</h3>
              <p>Login activity, user management actions, settings changes, and content updates.</p>
            </div>
          </div>

          <div className="inline-filters">
            <label>
              <span>Action contains</span>
              <input
                value={filters.action}
                onChange={(event) => updateFilter('action', event.target.value)}
                placeholder="admin_login or user_"
              />
            </label>
            <label>
              <span>Status</span>
              <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">All statuses</option>
                <option value="success">success</option>
                <option value="failed">failed</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <DataTable
              columns={adminColumns}
              rows={logs.adminLogs.rows}
              emptyMessage={loading ? 'Loading admin logs...' : 'No admin logs found.'}
            />
            <PaginationControls
              page={filters.page}
              pageSize={filters.pageSize}
              total={logs.adminLogs.count}
              label="logs"
              onPageChange={(page) => updateFilter('page', page)}
            />
          </div>
        </section>
      ) : null}

      {isOtpView ? (
        <section id="logs-otp" className="content-grid" style={{ marginTop: '1rem' }}>
          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>OTP verification success</h3>
                <p>Most recent successful OTP verification events tracked by analytics.</p>
              </div>
            </div>
            <DataTable
              columns={otpColumns}
              rows={logs.otpVerificationLogs}
              emptyMessage={loading ? 'Loading OTP success logs...' : 'No OTP success logs found.'}
            />
          </div>

          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Failed OTP attempts</h3>
                <p>Most recent failed verification attempts for security monitoring.</p>
              </div>
            </div>
            <DataTable
              columns={otpColumns}
              rows={logs.failedOtpAttempts}
              emptyMessage={loading ? 'Loading OTP failure logs...' : 'No OTP failure logs found.'}
            />
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}
