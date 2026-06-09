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
import { formatCurrency, formatDate } from '../utils/formatters';

const PAGE_SIZE = 10;

export default function PaymentsPage({ pageView = 'home' }) {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    status: '',
    source: ''
  });
  const [payments, setPayments] = useState({ rows: [], count: 0, metrics: {} });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState('');
  const [form, setForm] = useState({
    userId: '',
    amountInr: '',
    plan: 'PRO',
    status: 'manual',
    notes: ''
  });

  async function loadPayments(nextFilters = filters) {
    try {
      setLoading(true);
      const { data } = await adminClient.payments(nextFilters);
      setPayments({
        rows: data.rows || [],
        count: data.count || 0,
        metrics: data.metrics || {}
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const { data } = await adminClient.users({ page: 1, pageSize: 100 });
      setUsers(data.rows || []);
      setForm((current) => ({
        ...current,
        userId: current.userId || data.rows?.[0]?.id || ''
      }));
    } catch (_error) {
      setUsers([]);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [filters.page, filters.pageSize, filters.status, filters.source]);

  useEffect(() => {
    loadUsers();
  }, []);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.userId) {
      toast.error('Select a user before creating a manual payment.');
      return;
    }

    const amountInr = Number(form.amountInr);

    if (!Number.isFinite(amountInr) || amountInr < 0) {
      toast.error('Amount must be zero or greater.');
      return;
    }

    if (form.plan === 'PRO' && amountInr <= 0) {
      toast.error('Pro payments should use an amount greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      await adminClient.createManualPayment({
        userId: form.userId,
        amountInr,
        plan: form.plan,
        status: form.status,
        notes: form.notes ? { note: form.notes } : {}
      });
      toast.success('Manual payment created successfully.');
      setForm((current) => ({
        ...current,
        amountInr: '',
        notes: ''
      }));
      await loadPayments();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create manual payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (payment) => {
    const canDeletePayment = ['admin', 'manual'].includes(payment.source);

    if (!canDeletePayment) {
      toast.error('Only admin-created manual payments can be deleted.');
      return;
    }

    const shouldDelete = window.confirm(
      `Delete the ${formatCurrency(payment.amountInr)} ${payment.plan} payment for ${payment.email || 'this user'}?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingPaymentId(String(payment.id));
      await adminClient.deletePayment(payment.id);
      toast.success('Payment deleted successfully.');
      await loadPayments();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete payment.');
    } finally {
      setDeletingPaymentId('');
    }
  };

  const columns = [
    {
      key: 'email',
      header: 'Customer',
      render: (payment) => (
        <div className="table-title">
          <strong>{payment.email || 'Unknown email'}</strong>
          <span>{payment.userId || 'No linked user'}</span>
        </div>
      )
    },
    {
      key: 'amountInr',
      header: 'Amount',
      render: (payment) => formatCurrency(payment.amountInr)
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (payment) => <StatusBadge value={payment.plan} />
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => <StatusBadge value={payment.status} />
    },
    {
      key: 'source',
      header: 'Source',
      render: (payment) => payment.source
    },
    {
      key: 'paidAt',
      header: 'Paid at',
      render: (payment) => formatDate(payment.paidAt || payment.createdAt)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (payment) =>
        ['admin', 'manual'].includes(payment.source) ? (
          <button
            type="button"
            className="danger-button small-button"
            disabled={deletingPaymentId === String(payment.id)}
            onClick={() => handleDeletePayment(payment)}
          >
            {deletingPaymentId === String(payment.id) ? 'Deleting...' : 'Delete'}
          </button>
        ) : (
          <span className="helper-text">Protected</span>
        )
    }
  ];

  const paidRows = payments.rows.filter((payment) =>
    ['active', 'authenticated', 'paid', 'captured', 'manual'].includes(payment.status)
  );
  const isHomeView = pageView === 'home';
  const isHistoryView = pageView === 'history';
  const isManualView = pageView === 'manual';
  const pageTitle = isHomeView
    ? 'Payments workspace'
    : isManualView
      ? 'Manual billing workspace'
      : 'Transaction history';
  const pageSubtitle = isHomeView
    ? 'Review revenue health first, then open the exact billing screen you need for history or manual payment actions.'
    : isManualView
      ? 'Create support-driven upgrades, offline payments, and custom plan adjustments from a dedicated admin screen.'
      : 'Inspect payment states, sources, and active subscription rows without mixing in manual billing actions.';
  const sectionScrollId = isHistoryView ? 'payments-history' : isManualView ? 'payments-manual' : '';

  useAdminLiveRefresh(
    () => {
      loadPayments();
      loadUsers();
    },
    {
      enabled: !isManualView
    }
  );

  const historyPanel = (
    <div id="payments-history" className="page-panel">
      <div className="panel-header">
        <div>
          <h3>Transaction history</h3>
          <p>Filter by payment source or subscription state.</p>
        </div>
      </div>

      <div className="inline-filters">
        <label>
          <span>Status</span>
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="authenticated">Authenticated</option>
            <option value="captured">Captured</option>
            <option value="paid">Paid</option>
            <option value="manual">Manual</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <label>
          <span>Source</span>
          <select value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}>
            <option value="">All sources</option>
            <option value="razorpay">Razorpay</option>
            <option value="admin">Admin</option>
            <option value="manual">Manual</option>
          </select>
        </label>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="helper-text" style={{ marginBottom: '0.75rem' }}>
          Only admin-created manual payment rows can be deleted here. Razorpay checkout records stay protected.
        </div>
        <DataTable
          columns={columns}
          rows={payments.rows}
          emptyMessage={loading ? 'Loading payments...' : 'No transactions match the current filters.'}
        />
        <PaginationControls
          page={filters.page}
          pageSize={filters.pageSize}
          total={payments.count}
          label="payments"
          onPageChange={(page) => updateFilter('page', page)}
        />
      </div>
    </div>
  );

  const manualPanel = (
    <form id="payments-manual" className="form-card" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <h3>Create manual payment</h3>
          <p>Useful for offline upgrades, account credits, or support-driven plan changes.</p>
        </div>
      </div>

      <div className="form-grid">
        <label>
          <span>User</span>
          <select
            value={form.userId}
            onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
          >
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Amount (INR)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={form.amountInr}
            onChange={(event) => setForm((current) => ({ ...current, amountInr: event.target.value }))}
            placeholder="999"
          />
        </label>

        <label>
          <span>Plan</span>
          <select value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}>
            <option value="PRO">PRO</option>
            <option value="FREE">FREE</option>
          </select>
        </label>

        <label>
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="manual">manual</option>
            <option value="paid">paid</option>
            <option value="captured">captured</option>
            <option value="active">active</option>
          </select>
        </label>

        <label className="full-span">
          <span>Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Optional support note or internal reason"
          />
        </label>
      </div>

      <div className="card-actions" style={{ marginTop: '1rem' }}>
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? 'Creating payment...' : 'Create manual payment'}
        </button>
      </div>
    </form>
  );

  return (
    <AdminShell
      title={pageTitle}
      subtitle={pageSubtitle}
      headerVariant="compact"
      showStatusStrip={false}
      sectionScrollId={sectionScrollId}
      actions={
        <button type="button" className="ghost-button" onClick={() => loadPayments()}>
          Refresh payments
        </button>
      }
    >
      <section id="payments-overview" className="metrics-grid">
        <MetricCard
          label="Revenue in current result"
          value={formatCurrency(payments.metrics.totalRevenue || 0)}
          helper="Based on filtered payment rows"
        />
        <MetricCard
          label="Active subscriptions"
          value={payments.metrics.activeSubscriptions || 0}
          helper="Authenticated or active rows"
        />
        <MetricCard label="Payments found" value={payments.count} helper="Matching transactions" />
        <MetricCard label="Paid rows on page" value={paidRows.length} helper="Successful or manual entries" />
        <MetricCard label="Loaded customers" value={users.length} helper="Available in manual ops form" />
        <MetricCard label="Manual entry status" value={form.status} helper="Used in the form below" />
      </section>

      {isHomeView ? (
        <section className="content-grid" style={{ marginTop: '1rem' }}>
          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Open a billing page</h3>
                <p>Use dedicated screens for transaction review and manual plan operations.</p>
              </div>
            </div>

            <div className="dashboard-shortcuts-grid">
              <WorkspaceLinkCard
                to="/payments/history"
                label="Transaction history"
                description="Review payment status, sources, and recent subscription movement."
              />
              <WorkspaceLinkCard
                to="/payments/manual"
                label="Manual billing"
                description="Create support-driven upgrades, offline entries, and custom payment records."
              />
              <WorkspaceLinkCard
                to="/users"
                label="User accounts"
                description="Open user profiles when billing support needs plan or account changes."
              />
            </div>
          </div>

          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Billing snapshot</h3>
                <p>Quick operational context before you drill into a dedicated billing page.</p>
              </div>
            </div>

            <div className="list-stack">
              <div className="activity-item">
                <strong>{formatCurrency(payments.metrics.totalRevenue || 0)} total filtered revenue</strong>
                <p>Use transaction history to inspect successful, pending, or manually-created records in detail.</p>
              </div>
              <div className="activity-item">
                <strong>{payments.metrics.activeSubscriptions || 0} active subscriptions</strong>
                <p>Open manual billing when support needs to grant a plan outside the public checkout flow.</p>
              </div>
              <div className="activity-item">
                <strong>{users.length} users available for admin billing actions</strong>
                <p>User records are already loaded and ready for offline payment assignment.</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isHistoryView ? <section style={{ marginTop: '1rem' }}>{historyPanel}</section> : null}
      {isManualView ? <section style={{ marginTop: '1rem' }}>{manualPanel}</section> : null}
    </AdminShell>
  );
}
