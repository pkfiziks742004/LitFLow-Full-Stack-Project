import { CheckCircle2, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import BrandLogo from '../components/BrandLogo';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useBranding } from '../context/BrandingContext';

export default function LoginPage() {
  const { adminUser, login } = useAdminAuth();
  const { siteName } = useBranding();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  if (adminUser) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      await login(form);
      toast.success('Admin login successful.');
      navigate('/');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-story-panel">
          <div className="login-story-copy">
            <p className="eyebrow">Admin command center</p>
            <h1>Operate {siteName} like a real product business.</h1>
            <p className="page-copy">
              Monitor users, revenue, feature rollouts, content quality, and audit trails from one polished operations
              workspace.
            </p>
          </div>

          <div className="login-highlights-grid">
            <article className="login-highlight-card">
              <span className="login-highlight-icon accent">
                <ShieldCheck size={16} />
              </span>
              <strong>Protected access</strong>
              <p>Admin auth is separate from public OTP login and ready for sensitive actions.</p>
            </article>

            <article className="login-highlight-card">
              <span className="login-highlight-icon success">
                <Sparkles size={16} />
              </span>
              <strong>Live control surface</strong>
              <p>Branding, pricing, content, analytics, and rollout toggles stay in one structured panel.</p>
            </article>
          </div>

          <div className="login-trust-list">
            <div className="login-trust-item">
              <CheckCircle2 size={18} />
              <span>Feature flags, content curation, and audit logs in one workspace</span>
            </div>
            <div className="login-trust-item">
              <CheckCircle2 size={18} />
              <span>Clear operational overview for support, growth, and monetization teams</span>
            </div>
            <div className="login-trust-item">
              <CheckCircle2 size={18} />
              <span>Built to feel like a real SaaS admin panel, not a raw backend tool</span>
            </div>
          </div>
        </section>

        <form className="login-card login-form-panel" onSubmit={handleSubmit}>
          <div className="admin-auth-brand">
            <BrandLogo large animated surface="light" />
            <span className="admin-shell-badge on-light">Admin console</span>
          </div>
          <p className="eyebrow">Secure admin access</p>
          <h1>Sign in to {siteName} Admin</h1>
          <p className="page-copy">
            Use your separate admin email and password. This login stays isolated from the public user sign-in flow.
          </p>

          <label>
            <span>
              <Mail size={14} />
              Email
            </span>
            <input
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="admin@litflow.app"
            />
          </label>

          <label>
            <span>
              <LockKeyhole size={14} />
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your admin password"
            />
          </label>

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
