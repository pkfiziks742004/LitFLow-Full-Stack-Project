import { listAnalyticsEvents, listPayments } from '../repositories/systemRepository.js';
import { getAllUsersLite } from '../repositories/panelRepository.js';

function monthLabel(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short' });
}

function dateKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function buildMonthlySeries(rows, getDate, getValue) {
  const buckets = new Map();
  const now = new Date();

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    buckets.set(key, {
      label: monthLabel(date),
      value: 0
    });
  }

  rows.forEach((row) => {
    const date = getDate(row);
    if (!date) return;
    const month = new Date(date);
    const key = `${month.getFullYear()}-${month.getMonth()}`;
    if (buckets.has(key)) {
      buckets.get(key).value += getValue(row);
    }
  });

  return Array.from(buckets.values());
}

export async function getAdminDashboard(req, res) {
  const [users, payments, searchEvents, activityEvents] = await Promise.all([
    getAllUsersLite(),
    listPayments({ page: 1, pageSize: 200 }),
    listAnalyticsEvents({ eventType: 'search', limit: 1000 }),
    listAnalyticsEvents({ limit: 1000 })
  ]);

  const allPayments = payments.rows;
  const paidPayments = allPayments.filter((payment) => ['active', 'authenticated', 'paid', 'captured', 'manual'].includes(payment.status));
  const revenueTotal = paidPayments.reduce((sum, payment) => sum + Number(payment.amountInr || 0), 0);
  const totalUsers = users.length;
  const proUsers = users.filter((user) => user.plan === 'PRO').length;
  const freeUsers = totalUsers - proUsers;
  const today = new Date();
  const dailyCutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthlyCutoff = new Date(today.getFullYear(), today.getMonth(), 1);
  const activeToday = new Set(
    activityEvents.filter((event) => new Date(event.createdAt) >= dailyCutoff && event.userId).map((event) => event.userId)
  ).size;
  const activeThisMonth = new Set(
    activityEvents.filter((event) => new Date(event.createdAt) >= monthlyCutoff && event.userId).map((event) => event.userId)
  ).size;

  const userGrowth = buildMonthlySeries(users, (user) => user.createdAt, () => 1).map((entry) => ({
    month: entry.label,
    users: entry.value
  }));

  const revenueGrowth = buildMonthlySeries(allPayments, (payment) => payment.paidAt || payment.createdAt, (payment) => Number(payment.amountInr || 0)).map(
    (entry) => ({
      month: entry.label,
      revenue: entry.value
    })
  );

  res.json({
    success: true,
    metrics: {
      totalUsers,
      activeUsersDaily: activeToday,
      activeUsersMonthly: activeThisMonth,
      totalSearches: searchEvents.length,
      totalRevenue: revenueTotal,
      freeUsers,
      proUsers
    },
    charts: {
      userGrowth,
      revenueGrowth
    },
    admin: {
      name: req.adminUser.name,
      role: req.adminUser.role
    }
  });
}
