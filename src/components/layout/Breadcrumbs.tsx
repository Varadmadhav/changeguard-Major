import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  const formatBreadcrumb = (str: string) => {
    if (str === 'dashboard') return 'Overview';
    if (str === 'changes') return 'Changes';
    if (str === 'deployments') return 'Deployments';
    if (str === 'services') return 'Services';
    if (str === 'incidents') return 'Incidents';
    if (str === 'impact-graph') return 'Impact Graph';
    if (str === 'policies') return 'Policies';
    if (str === 'analytics') return 'Analytics';
    if (str === 'integrations') return 'Integrations';
    if (str === 'audit-log') return 'Audit Log';
    if (str === 'settings') return 'Settings';
    if (str.startsWith('pr-') || !isNaN(Number(str))) return `PR #${str.replace('pr-', '')}`;
    if (str.startsWith('dep-')) return 'Control Room';
    if (str.startsWith('inc-')) return str.toUpperCase();
    if (str.startsWith('srv-')) return str.replace('srv-', '').toUpperCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
      <Link to="/dashboard" className="hover:text-slate-900 transition-colors">
        ChangeGuard
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <React.Fragment key={name}>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            {isLast ? (
              <span className="text-slate-900 font-semibold truncate max-w-[200px]">
                {formatBreadcrumb(name)}
              </span>
            ) : (
              <Link to={routeTo} className="hover:text-slate-900 transition-colors truncate max-w-[150px]">
                {formatBreadcrumb(name)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
