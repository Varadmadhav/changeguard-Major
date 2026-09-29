import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Settings,
  Users,
  ShieldCheck,
  Layers,
  Bell,
  Sliders,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const SettingsLayout: React.FC = () => {
  const navItems = [
    { label: 'General', path: '/settings/general', icon: Settings },
    { label: 'Team & RBAC', path: '/settings/team', icon: Users },
    { label: 'Security & Signoff', path: '/settings/security', icon: ShieldCheck },
    { label: 'Environments', path: '/settings/environments', icon: Layers },
    { label: 'Notification Rules', path: '/settings/notifications', icon: Bell },
    { label: 'Risk Engine & AI', path: '/settings/ai', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Governance</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure organization preferences, access control, environments, and automated risk models.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation Sidebar */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-card p-2 shadow-card space-y-0.5">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-brand-700 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </aside>

        {/* Settings Content Body */}
        <div className="flex-1 bg-white border border-slate-200/80 rounded-card p-6 shadow-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
