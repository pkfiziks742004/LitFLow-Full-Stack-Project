import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import BrandLogo from './components/BrandLogo';
import { useAdminAuth } from './context/AdminAuthContext';
import { useBranding } from './context/BrandingContext';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ContentPage = lazy(() => import('./pages/ContentPage'));
const ControlsPage = lazy(() => import('./pages/ControlsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

function FullPageState({ title, copy }) {
  const { siteName } = useBranding();

  return (
    <div className="full-page-state">
      <div className="state-card">
        <div className="admin-auth-brand centered">
          <BrandLogo large animated surface="light" />
          <span className="admin-shell-badge on-light">Admin workspace</span>
        </div>
        <h1>{title}</h1>
        <p>{copy || `Preparing the ${siteName} admin workspace.`}</p>
      </div>
    </div>
  );
}

function RequireAdminAuth() {
  const { initialized, adminUser } = useAdminAuth();

  if (!initialized) {
    return <FullPageState title="Preparing admin workspace" copy="Verifying your secure session." />;
  }

  if (!adminUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function LoginRoute() {
  const { initialized, adminUser } = useAdminAuth();

  if (!initialized) {
    return <FullPageState title="Preparing admin workspace" copy="Loading sign-in experience." />;
  }

  if (adminUser) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageState title="Loading admin page" copy="Opening the requested workspace." />}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<RequireAdminAuth />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/payments" element={<PaymentsPage pageView="home" />} />
          <Route path="/payments/history" element={<PaymentsPage pageView="history" />} />
          <Route path="/payments/manual" element={<PaymentsPage pageView="manual" />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/analytics/search" element={<AnalyticsPage pageView="search" />} />
          <Route path="/analytics/ai" element={<AnalyticsPage pageView="ai" />} />
          <Route path="/controls" element={<ControlsPage />} />
          <Route path="/content" element={<ContentPage pageView="home" />} />
          <Route path="/content/curated" element={<ContentPage pageView="curated" />} />
          <Route path="/content/saved" element={<ContentPage pageView="saved" />} />
          <Route path="/settings" element={<SettingsPage pageView="home" />} />
          <Route path="/settings/branding" element={<SettingsPage pageView="branding" />} />
          <Route path="/settings/pricing" element={<SettingsPage pageView="pricing" />} />
          <Route path="/settings/checkout" element={<SettingsPage pageView="checkout" />} />
          <Route path="/settings/custom" element={<SettingsPage pageView="custom" />} />
          <Route path="/settings/system" element={<SettingsPage pageView="system" />} />
          <Route path="/logs" element={<LogsPage pageView="home" />} />
          <Route path="/logs/audit" element={<LogsPage pageView="audit" />} />
          <Route path="/logs/otp" element={<LogsPage pageView="otp" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
