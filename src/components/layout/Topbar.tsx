import React from 'react';
import { Menu, Search, Command, Play, RefreshCw, Flame } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationCenter } from './NotificationCenter';
import { useSimulation } from '../../context/SimulationContext';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';

interface TopbarProps {
  onMobileMenuToggle: () => void;
  onOpenCommandPalette: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onMobileMenuToggle,
  onOpenCommandPalette,
}) => {
  const {
    currentEnvironment,
    isSimulatingFailure,
    simulateFailure,
    resetSimulationDemo,
  } = useSimulation();

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left side: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          title="Toggle Navigation"
        >
          <Menu size={18} />
        </button>
        <Breadcrumbs />
      </div>

      {/* Right side: Global Search, Quick Simulation Demo Controls, Env indicator, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command Palette / Search Trigger Button */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-md text-xs text-slate-500 transition-colors cursor-pointer group"
          title="Search or execute commands (Ctrl+K / Cmd+K)"
        >
          <Search size={13} className="text-slate-400 group-hover:text-slate-600" />
          <span className="hidden md:inline">Quick search or commands...</span>
          <span className="md:hidden">Search...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400 shadow-2xs">
            <Command size={10} />K
          </kbd>
        </button>

        {/* Demo Scenario Controller Button in Topbar */}
        <div className="flex items-center gap-1.5">
          {!isSimulatingFailure ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => simulateFailure('dep-checkout-284')}
              className="text-amber-700 bg-amber-50/70 border-amber-300 hover:bg-amber-100 font-mono text-[11px]"
              icon={<Flame size={12} className="text-amber-600" />}
            >
              Simulate Failure
            </Button>
          ) : (
            <Button
              variant="outline"
              size="xs"
              onClick={resetSimulationDemo}
              className="text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200 font-mono text-[11px]"
              icon={<RefreshCw size={12} className="text-slate-500" />}
            >
              Reset Demo
            </Button>
          )}
        </div>

        {/* Environment Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-mono text-slate-600">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              currentEnvironment === 'PRODUCTION'
                ? 'bg-emerald-500'
                : currentEnvironment === 'STAGING'
                ? 'bg-amber-500'
                : 'bg-blue-500'
            )}
          />
          <span>{currentEnvironment}</span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Notifications */}
        <NotificationCenter />

        {/* User Profile Avatar */}
        <Link
          to="/settings/team"
          className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors"
          title="Alex Morgan (Platform Engineer)"
        >
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
            AM
          </div>
        </Link>
      </div>
    </header>
  );
};
