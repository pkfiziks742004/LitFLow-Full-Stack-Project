import { Ban, Crown, Eye, ShieldCheck, ShieldX, Trash2, UserCircle2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminClient } from '../api/http';
import AdminShell from '../components/AdminShell';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import PaginationControls from '../components/PaginationControls';
import StatusBadge from '../components/StatusBadge';
import useAdminLiveRefresh from '../hooks/useAdminLiveRefresh';
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatShortDate,
  getSearchUsageValue
} from '../utils/formatters';

const PAGE_SIZE = 10;

function buildActivityDescription(activity) {
  if (activity.keyword) return `Keyword: ${activity.keyword}`;
  if (activity.paperId) return `Paper: ${activity.paperId}`;
  return activity.plan ? `Plan: ${activity.plan}` : 'No extra metadata';
}

function truncateEmail(value = '', maxLength = 26) {
  if (!value || value.length <= maxLength) {
    return value || 'Pick a user to inspect';
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

export default function UsersPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    query: '',
    plan: '',
    status: ''
  });
  const [result, setResult] = useState({ rows: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [details, setDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  async function loadUsers(nextFilters = filters) {
    try {
      setLoading(true);
      const { data } = await adminClient.users(nextFilters);
      const rows = data.rows || [];
      setResult({ rows, count: data.count || 0 });
      setSelectedUserId((current) => {
        if (current && rows.some((user) => user.id === current)) {
          return current;
        }

        return rows[0]?.id || '';
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  async function loadUserDetails(userId) {
    if (!userId) {
      setDetails(null);
      return;
    }

    try {
      setDetailLoading(true);
      const { data } = await adminClient.userDetails(userId);
      setDetails(data);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load user details.');
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [filters.page, filters.pageSize, filters.query, filters.plan, filters.status]);

  useEffect(() => {
    loadUserDetails(selectedUserId);
  }, [selectedUserId]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1
    }));
  };

  const refreshAll = async (userId = selectedUserId) => {
    await loadUsers();
    if (userId) {
      await loadUserDetails(userId);
    }
  };

  useAdminLiveRefresh(() => {
    refreshAll();
  });

  const handleBlockToggle = async (user) => {
    const blocked = !user.isBlocked;
    const confirmed = window.confirm(
      blocked ? `Block ${user.email} from using LitFlow?` : `Unblock ${user.email} and restore access?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`block-${user.id}`);
      await adminClient.toggleUserBlock(user.id, blocked);
      toast.success(blocked ? 'User blocked successfully.' : 'User unblocked successfully.');
      await refreshAll(user.id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update user status.');
    } finally {
      setActionLoading('');
    }
  };

  const handlePlanUpdate = async (user, plan) => {
    const confirmed = window.confirm(`Change ${user.email} to the ${plan} plan?`);

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`plan-${user.id}`);
      await adminClient.updateUserPlan(user.id, {
        plan,
        addPaymentRecord: false,
        amountInr: 0
      });
      toast.success(`User moved to ${plan}.`);
      await refreshAll(user.id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update user plan.');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(`Delete ${user.email}? This will remove the user and related saved data.`);

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`delete-${user.id}`);
      await adminClient.deleteUser(user.id);
      toast.success('User deleted successfully.');
      setDetails(null);
      setSelectedUserId('');
      await loadUsers({
        ...filters,
        page: result.rows.length === 1 && filters.page > 1 ? filters.page - 1 : filters.page
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete user.');
    } finally {
      setActionLoading('');
    }
  };

  const selectedUser = details?.user || null;
  const pageRows = result.rows || [];
  const proUsersOnPage = pageRows.filter((user) => user.plan === 'PRO').length;
  const blockedUsersOnPage = pageRows.filter((user) => user.isBlocked).length;

  const columns = [
    {
      key: 'email',
      header: 'User',
      render: (user) => (
        <div className="table-title">
          <strong>{user.email}</strong>
          <span>{formatShortDate(user.createdAt)}</span>
        </div>
      )
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (user) => <StatusBadge value={user.plan} />
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => <StatusBadge value={user.isBlocked ? 'BLOCKED' : user.status || 'ACTIVE'} />
    },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      render: (user) => formatDate(user.lastLoginAt)
    },
    {
      key: 'searchUsage',
      header: 'Searches',
      render: (user) => getSearchUsageValue(user.searchUsage)
    },
    {
      key: 'actions',
      header: 'Actions',
      preventRowClick: true,
      render: (user) => (
        <div className="table-actions">
          <button type="button" className="ghost-button small-button" onClick={() => setSelectedUserId(user.id)}>
            <Eye size={14} />
            View
          </button>
          <button
            type="button"
            className="ghost-button small-button"
            disabled={Boolean(actionLoading)}
            onClick={() => handleBlockToggle(user)}
          >
            {user.isBlocked ? <ShieldCheck size={14} /> : <Ban size={14} />}
            {actionLoading === `block-${user.id}` ? 'Saving...' : user.isBlocked ? 'Unblock' : 'Block'}
          </button>
          <button
            type="button"
            className="ghost-button small-button"
            disabled={Boolean(actionLoading)}
            onClick={() => handlePlanUpdate(user, user.plan === 'PRO' ? 'FREE' : 'PRO')}
          >
            {actionLoading === `plan-${user.id}` ? 'Saving...' : user.plan === 'PRO' ? 'Downgrade' : 'Upgrade'}
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminShell
      title="User management"
      subtitle="Search users, inspect recent activity, and control account access or plan state."
      headerVariant="compact"
      showStatusStrip={false}
      actions={
        <button type="button" className="ghost-button" onClick={() => refreshAll()}>
          Refresh users
        </button>
      }
    >
      <section id="users-overview" className="users-overview-grid">
        <MetricCard
          label="Users in result set"
          value={formatCompactNumber(result.count)}
          helper="Matching current filters"
          icon={Users}
          tone="accent"
        />
        <MetricCard
          label="Pro users on page"
          value={proUsersOnPage}
          helper="Current monetized accounts"
          icon={Crown}
          tone="success"
        />
        <MetricCard
          label="Blocked on page"
          value={blockedUsersOnPage}
          helper="Restricted accounts"
          icon={ShieldX}
          tone="warning"
        />
        <article className="metric-card user-focus-card">
          <div className="metric-card-head">
            <p>Selected user</p>
            <span className="metric-card-icon">
              <UserCircle2 size={16} />
            </span>
          </div>
          <strong>{selectedUser?.plan || 'No selection'}</strong>
          <span>{truncateEmail(selectedUser?.email)}</span>
          <small>
            {selectedUser
              ? `${getSearchUsageValue(selectedUser.searchUsage)} searches tracked`
              : 'Pick a user from the table to inspect details.'}
          </small>
        </article>
      </section>

      <section className="users-workspace-grid">
        <div id="users-directory" className="page-panel users-directory-card">
          <div className="panel-header">
            <div>
              <h3>User directory</h3>
              <p>Filter by email, plan, and account status.</p>
            </div>
            <div className="badge-row">
              <StatusBadge value={`${pageRows.length} visible`} />
              <StatusBadge value={`${result.count} total`} />
            </div>
          </div>

          <div className="inline-filters users-inline-filters">
            <label>
              <span>Search email</span>
              <input
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder="Search by email"
              />
            </label>
            <label>
              <span>Plan</span>
              <select value={filters.plan} onChange={(event) => updateFilter('plan', event.target.value)}>
                <option value="">All plans</option>
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <DataTable
              columns={columns}
              rows={pageRows}
              onRowClick={(user) => setSelectedUserId(user.id)}
              selectedRowId={selectedUserId}
              emptyMessage={loading ? 'Loading users...' : 'No users match the current filters.'}
            />
            <PaginationControls
              page={filters.page}
              pageSize={filters.pageSize}
              total={result.count}
              label="users"
              onPageChange={(page) => updateFilter('page', page)}
            />
          </div>
        </div>

        <div id="users-detail" className="detail-card users-detail-card">
          <div className="panel-header">
            <div>
              <h3>User detail panel</h3>
              <p>Inspect account state, recent events, and latest payments.</p>
            </div>
          </div>

          {detailLoading ? (
            <div className="empty-state">Loading user details...</div>
          ) : selectedUser ? (
            <div className="detail-stack">
              <div className="selected-user-summary">
                <div>
                  <div className="badge-row">
                    <StatusBadge value={selectedUser.plan} />
                    <StatusBadge value={selectedUser.isBlocked ? 'BLOCKED' : selectedUser.status || 'ACTIVE'} />
                  </div>
                  <h3 style={{ marginTop: '0.9rem' }}>{selectedUser.email}</h3>
                  <p className="page-copy" style={{ marginTop: '0.4rem' }}>
                    User joined on {formatDate(selectedUser.createdAt)} and last logged in at{' '}
                    {formatDate(selectedUser.lastLoginAt)}.
                  </p>
                </div>

                <div className="selected-user-stats">
                  <div className="info-card">
                    <span>Plan</span>
                    <strong>{selectedUser.plan}</strong>
                  </div>
                  <div className="info-card">
                    <span>Searches</span>
                    <strong>{getSearchUsageValue(selectedUser.searchUsage)}</strong>
                  </div>
                </div>
              </div>

              <div className="detail-meta">
                <div>
                  <span>Daily search usage</span>
                  <strong>{getSearchUsageValue(selectedUser.searchUsage)}</strong>
                </div>
                <div>
                  <span>Billing status</span>
                  <strong>{selectedUser.billing?.status || 'N/A'}</strong>
                </div>
                <div>
                  <span>Blocked at</span>
                  <strong>{formatDate(selectedUser.blockedAt)}</strong>
                </div>
                <div>
                  <span>Plan started</span>
                  <strong>{formatDate(selectedUser.billing?.startedAt)}</strong>
                </div>
              </div>

              <div className="card-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={Boolean(actionLoading)}
                  onClick={() => handleBlockToggle(selectedUser)}
                >
                  {selectedUser.isBlocked ? 'Unblock user' : 'Block user'}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={Boolean(actionLoading)}
                  onClick={() => handlePlanUpdate(selectedUser, selectedUser.plan === 'PRO' ? 'FREE' : 'PRO')}
                >
                  {selectedUser.plan === 'PRO' ? 'Downgrade to FREE' : 'Upgrade to PRO'}
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={Boolean(actionLoading)}
                  onClick={() => handleDelete(selectedUser)}
                >
                  <Trash2 size={14} />
                  Delete user
                </button>
              </div>

              <div className="section-card">
                <div className="section-header">
                  <div>
                    <h3>Recent activity</h3>
                    <p>Latest events tracked for this user.</p>
                  </div>
                </div>

                <div className="list-stack">
                  {details?.recentActivity?.length ? (
                    details.recentActivity.map((activity) => (
                      <div key={activity.id} className="activity-item">
                        <div className="split-inline">
                          <strong>{activity.eventType}</strong>
                          <span className="meta-line">{formatDate(activity.createdAt)}</span>
                        </div>
                        <p>{buildActivityDescription(activity)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No recent activity tracked for this user.</div>
                  )}
                </div>
              </div>

              <div className="section-card">
                <div className="section-header">
                  <div>
                    <h3>Recent payments</h3>
                    <p>Payment and subscription history tied to this account.</p>
                  </div>
                </div>

                <div className="list-stack">
                  {details?.payments?.length ? (
                    details.payments.map((payment) => (
                      <div key={payment.id} className="paper-item">
                        <div className="split-inline">
                          <div className="stacked-stat">
                            <strong>{formatCurrency(payment.amountInr)}</strong>
                            <span>{payment.source}</span>
                          </div>
                          <StatusBadge value={payment.status} />
                        </div>
                        <p>
                          {payment.plan} plan on {formatDate(payment.paidAt || payment.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No payments found for this user.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">Select a user from the table to inspect details.</div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
