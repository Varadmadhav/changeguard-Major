import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  GitPullRequest,
  Rocket,
  Layers,
  AlertTriangle,
  Network,
  Scale,
  BarChart3,
  Plug,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useSimulation } from '../../context/SimulationContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}) => {
  const location = useLocation();
  const { currentEnvironment, setCurrentEnvironment, incidents, changes } = useSimulation();
  const [changesOpen, setChangesOpen] = useState(true);
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false);

  const activeIncidentsCount = incidents.filter(i => i.status === 'INVESTIGATING' || i.status === 'TRIGGERED').length;
  const highRiskChangesCount = changes.filter(c => c.risk.level === 'HIGH' || c.risk.level === 'CRITICAL').length;

  const navItems = [
    {
      label: 'Overview',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Changes',
      path: '/changes',
      icon: GitPullRequest,
      badge: highRiskChangesCount > 0 ? `${highRiskChangesCount} high risk` : undefined,
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      children: [
        { label: 'Pull Requests', path: '/changes?tab=prs' },
        { label: 'Commits', path: '/changes?tab=commits' },
      ],
    },
    {
      label: 'Deployments',
      path: '/deployments',
      icon: Rocket,
    },
    {
      label: 'Services',
      path: '/services',
      icon: Layers,
    },
    {
      label: 'Incidents',
      path: '/incidents',
      icon: AlertTriangle,
      badge: activeIncidentsCount > 0 ? `${activeIncidentsCount}` : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      label: 'Impact Graph',
      path: '/impact-graph',
      icon: Network,
    },
    {
      label: 'Policies',
      path: '/policies',
      icon: Scale,
    },
    {
      label: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
    },
    {
      label: 'Integrations',
      path: '/integrations',
      icon: Plug,
    },
    {
      label: 'Audit Log',
      path: '/audit-log',
      icon: ScrollText,
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-200 select-none',
          isCollapsed ? 'w-[68px]' : 'w-[240px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Top: Logo & Collapse Button */}
        <div>
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-3.5">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2.5 overflow-hidden"
              onClick={onMobileClose}
            >
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <ShieldCheck size={18} strokeWidth={2.5} />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                    ChangeGuard
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                    Safety Plane
                  </span>
                </div>
              )}
            </NavLink>

            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-220px)] no-scrollbar">
            {navItems.map(item => {
              const isActive =
                item.path === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.path);

              const Icon = item.icon;

              if (item.children && !isCollapsed) {
                return (
                  <div key={item.path} className="space-y-0.5">
                    <div
                      className={cn(
                        'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors group',
                        isActive
                          ? 'bg-blue-50/70 text-brand-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      )}
                      onClick={() => setChangesOpen(!changesOpen)}
                    >
                      <NavLink
                        to={item.path}
                        className="flex items-center gap-2.5 flex-1"
                        onClick={onMobileClose}
                      >
                        <Icon
                          size={16}
                          className={cn(
                            'shrink-0',
                            isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                          )}
                        />
                        <span>{item.label}</span>
                      </NavLink>
                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.2 rounded-full border font-medium font-mono',
                              item.badgeColor
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                        <span className="p-0.5 text-slate-400 hover:text-slate-600">
                          {changesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </span>
                      </div>
                    </div>

                    {changesOpen && (
                      <div className="pl-8 pr-1 space-y-0.5 border-l border-slate-100 ml-4 py-0.5">
                        {item.children.map(sub => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={onMobileClose}
                            className={({ isActive }) =>
                              cn(
                                'block px-2 py-1 text-xs rounded transition-colors',
                                isActive
                                  ? 'text-brand-600 font-medium bg-blue-50/50'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                              )
                            }
                          >
                            {sub.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onMobileClose}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group relative',
                    isActive
                      ? 'bg-blue-50/70 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    size={16}
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!isCollapsed && item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.2 rounded-full border font-medium font-mono',
                        item.badgeColor
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Env Selector, Org & User Profile */}
        <div className="p-2 border-t border-slate-200 bg-slate-50/40 space-y-2">
          {/* Environment Selector */}
          {!isCollapsed ? (
            <div className="relative">
              <button
                onClick={() => setEnvDropdownOpen(!envDropdownOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700 hover:bg-slate-50 transition-colors shadow-subtle"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      currentEnvironment === 'PRODUCTION'
                        ? 'bg-emerald-500'
                        : currentEnvironment === 'STAGING'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    )}
                  />
                  <span className="font-medium text-slate-900">{currentEnvironment}</span>
                </div>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {envDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-dropdown p-1 z-50">
                  {(['PRODUCTION', 'STAGING', 'DEVELOPMENT'] as const).map(env => (
                    <button
                      key={env}
                      onClick={() => {
                        setCurrentEnvironment(env);
                        setEnvDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors',
                        currentEnvironment === env
                          ? 'bg-blue-50 text-brand-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            env === 'PRODUCTION'
                              ? 'bg-emerald-500'
                              : env === 'STAGING'
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          )}
                        />
                        {env}
                      </span>
                      {currentEnvironment === env && <CheckCircle2 size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  currentEnvironment === 'PRODUCTION' ? 'bg-emerald-500' : 'bg-amber-500'
                )}
                title={`Environment: ${currentEnvironment}`}
              />
            </div>
          )}

          {/* Org & User Profile */}
          <div className="pt-1 border-t border-slate-200/60">
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                  AM
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-medium text-slate-900 truncate">Alex Morgan</span>
                  <span className="text-[10px] text-slate-500 truncate">Acme Engineering</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-1">
                <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                  AM
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
