import { ChevronDown, Globe, LogOut, Menu, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  ADMIN_IDLE_TIMEOUT_MS,
  ADMIN_SESSION_MAX_AGE_MS,
  useAdminAuth
} from '../context/AdminAuthContext';
import { useBranding } from '../context/BrandingContext';
import Sidebar from './Sidebar';
import { adminNavigationItems } from './adminNavigation';

export default function AdminShell({
  title,
  subtitle,
  actions,
  children,
  headerVariant = 'compact',
  sectionScrollId = ''
}) {
  const { adminUser, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { siteName } = useBranding();
  const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173';
  const profileMenuRef = useRef(null);
  const idleLockLabel = `${Math.round(ADMIN_IDLE_TIMEOUT_MS / 60_000)}m idle lock`;
  const sessionMaxLabel = `${Math.round(ADMIN_SESSION_MAX_AGE_MS / 3_600_000)}h max session`;

  const currentItem = useMemo(
    () => adminNavigationItems.find((item) => item.to === location.pathname),
    [location.pathname]
  );

  const commandResults = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();

    if (!query) {
      return adminNavigationItems.slice(0, 5);
    }

    return adminNavigationItems.filter((item) =>
      `${item.label} ${item.group} ${item.description}`.toLowerCase().includes(query)
    );
  }, [commandQuery]);

  const adminInitial = useMemo(() => {
    const label = adminUser?.name?.trim() || adminUser?.email?.trim() || 'Admin';
    return label.charAt(0).toUpperCase();
  }, [adminUser?.email, adminUser?.name]);

  useEffect(() => {
    setCommandQuery('');
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    const targetId = sectionScrollId || location.hash.replace('#', '');

    if (!targetId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [location.hash, location.pathname, sectionScrollId]);

  const handleCommandSelect = (path) => {
    navigate(path);
    setCommandQuery('');
    setProfileMenuOpen(false);
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
  };

  return (
    <div className="admin-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          adminUser={adminUser}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <div className="admin-content">
        <header className="admin-topbar">
          <div className={`admin-topbar-surface ${headerVariant === 'compact' ? 'compact-surface' : ''}`.trim()}>
            <div className="admin-header-bar">
              <div className="admin-header-start">
                <button type="button" className="menu-button" onClick={() => setSidebarOpen((value) => !value)}>
                  <Menu size={18} />
                </button>

                <div className="admin-header-site">
                  <strong>{siteName} Admin</strong>
                  <small>{currentItem?.group || 'Admin panel'}</small>
                </div>
              </div>

              <div className="admin-command-shell">
                <Search size={16} />
                <input
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && commandResults[0]) {
                      event.preventDefault();
                      handleCommandSelect(commandResults[0].to);
                    }
                  }}
                  placeholder="Search admin pages"
                />
                <span className="command-hint">Enter</span>

                {commandQuery.trim() ? (
                  <div className="command-results">
                    {commandResults.length ? (
                      commandResults.map((item) => {
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.to}
                            type="button"
                            className="command-result-item"
                            onClick={() => handleCommandSelect(item.to)}
                          >
                            <Icon size={16} />
                            <span>
                              <strong>{item.label}</strong>
                              <small>
                                {item.group} | {item.description}
                              </small>
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="command-empty-state">No results found.</div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="admin-header-actions">
                <span className="admin-header-chip">{adminUser?.role || 'ADMIN'}</span>

                <div className="admin-profile-shell" ref={profileMenuRef}>
                  <button
                    type="button"
                    className={`admin-profile-trigger ${profileMenuOpen ? 'open' : ''}`.trim()}
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                    onClick={() => setProfileMenuOpen((value) => !value)}
                  >
                    <span className="admin-profile-avatar">{adminInitial}</span>
                    <span className="admin-profile-copy">
                      <strong>{adminUser?.name || `${siteName} Admin`}</strong>
                      <small>{adminUser?.role || 'ADMIN'}</small>
                    </span>
                    <ChevronDown size={16} className="admin-profile-chevron" />
                  </button>

                  {profileMenuOpen ? (
                    <div className="admin-profile-dropdown" role="menu">
                      <div className="admin-profile-summary-card">
                        <strong>{adminUser?.name || `${siteName} Admin`}</strong>
                        <p>
                          {adminUser?.role || 'ADMIN'} | {adminUser?.email || 'No email available'}
                        </p>
                      </div>

                      <div className="admin-profile-pills">
                        <span>{idleLockLabel}</span>
                        <span>{sessionMaxLabel}</span>
                        <span>Live session</span>
                      </div>

                      <div className="admin-profile-actions">
                        <a
                          className="ghost-button full-width"
                          href={publicSiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Globe size={16} />
                          Open live app
                        </a>

                        <button type="button" className="danger-button full-width" onClick={handleLogout}>
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="admin-topbar-main">
              <div className="admin-topbar-heading">
                <div>
                  <p className="eyebrow">{currentItem?.group || 'Admin panel'}</p>
                  <h2>{title}</h2>
                  {subtitle ? <p className="page-copy">{subtitle}</p> : null}
                </div>
              </div>

              <div className="page-actions">{actions}</div>
            </div>
          </div>
        </header>

        <div className="admin-page-shell">
          <main className="admin-main-shell">{children}</main>
        </div>
      </div>
    </div>
  );
}
