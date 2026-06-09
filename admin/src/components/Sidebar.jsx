import { ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import BrandLogo from './BrandLogo';
import { useBranding } from '../context/BrandingContext';
import { adminNavigationItems, adminNavigationSections, matchesAdminPath } from './adminNavigation';

export default function Sidebar({ adminUser, onNavigate }) {
  const { siteName } = useBranding();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState('');
  const totalRoutes = adminNavigationItems.length;

  const activeMenu = useMemo(
    () =>
      adminNavigationSections.find(
        (item) =>
          matchesAdminPath(location.pathname, item.to) ||
          item.children?.some((child) => matchesAdminPath(location.pathname, child.to))
      ),
    [location.pathname]
  );

  useEffect(() => {
    if (activeMenu?.to) {
      setExpandedMenu(activeMenu.to);
    }
  }, [activeMenu?.to]);

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-head">
          <BrandLogo surface="dark" />
          <span className="admin-shell-badge">Admin</span>
        </div>
        <p className="admin-brand-note">Same live branding as the user-facing {siteName} workspace.</p>
      </div>

      <div className="sidebar-top-strip">
        <span className="role-chip compact-chip">
          <Shield size={13} />
          {adminUser?.role || 'ADMIN'}
        </span>
        <span className="sidebar-live-chip">Live session</span>
      </div>

      <div className="sidebar-scroll-area">
        <nav className="sidebar-nav">
          <div className="sidebar-nav-intro">
            <strong>Workspace menu</strong>
            <span className="sidebar-nav-total">{totalRoutes} pages</span>
          </div>

          <div className="sidebar-menu-stack">
            {adminNavigationSections.map((item) => {
              const Icon = item.icon;
              const hasChildren = Boolean(item.children?.length);
              const hasActiveChild = item.children?.some((child) => matchesAdminPath(location.pathname, child.to));
              const isMenuActive = matchesAdminPath(location.pathname, item.to) || hasActiveChild;
              const isExpanded = hasChildren && (expandedMenu === item.to || Boolean(hasActiveChild));

              return (
                <div
                  key={item.to}
                  className={`sidebar-menu-group ${isMenuActive ? 'is-active-group' : ''} ${
                    isExpanded ? 'is-expanded' : ''
                  }`.trim()}
                >
                  <div className="sidebar-menu-row">
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => {
                        if (hasChildren) {
                          setExpandedMenu(item.to);
                        }
                        onNavigate?.();
                      }}
                      title={item.description}
                      aria-label={`${item.label}: ${item.description}`}
                      className={({ isActive }) =>
                        `sidebar-link sidebar-parent-link ${isActive || isMenuActive ? 'active' : ''}`
                      }
                    >
                      <span className="sidebar-link-icon">
                        <Icon size={17} />
                      </span>
                      <span className="sidebar-link-copy">
                        <strong>{item.label}</strong>
                      </span>
                      {hasChildren ? (
                        <span className="sidebar-link-count">{item.children.length}</span>
                      ) : (
                        <ChevronRight size={15} className="sidebar-link-arrow" />
                      )}
                    </NavLink>

                    {hasChildren ? (
                      <button
                        type="button"
                        className={`sidebar-menu-toggle ${isExpanded ? 'expanded' : ''}`.trim()}
                        aria-label={`Toggle ${item.label} submenu`}
                        aria-expanded={isExpanded}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setExpandedMenu((current) => {
                            if (current === item.to && hasActiveChild) {
                              return current;
                            }

                            return current === item.to ? '' : item.to;
                          });
                        }}
                      >
                        <ChevronDown size={15} />
                      </button>
                    ) : null}
                  </div>

                  {hasChildren ? (
                    <div className={`sidebar-submenu ${isExpanded ? 'visible' : ''}`.trim()}>
                      {item.children.map((child) => {
                        const ChildIcon = child.icon || item.icon;

                        return (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            title={child.description}
                            aria-label={`${child.label}: ${child.description}`}
                            onClick={() => onNavigate?.()}
                            className={({ isActive }) => `sidebar-submenu-link ${isActive ? 'active' : ''}`}
                          >
                            <span className="sidebar-submenu-icon">
                              <ChildIcon size={14} />
                            </span>
                            <span>{child.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-meta-stack">
          <div className="sidebar-focus-card">
            <span>Account menu moved</span>
            <strong>{adminUser?.name || `${siteName} Admin`}</strong>
            <small>Use the top-right profile menu for account details, open live app, and logout actions.</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
