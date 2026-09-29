import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  GitPullRequest,
  Rocket,
  Layers,
  AlertTriangle,
  Scale,
  BarChart3,
  Settings,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { cn } from '../../utils/cn';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { changes, deployments, incidents, setCurrentEnvironment, simulateFailure } = useSimulation();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands = [
    // Changes
    ...changes.map(c => ({
      id: `change-${c.id}`,
      category: 'Changes',
      title: `PR #${c.number}: ${c.title}`,
      subtitle: `${c.repository} • ${c.risk.level} RISK (${c.risk.score}/100)`,
      icon: GitPullRequest,
      action: () => {
        navigate(`/changes/${c.id}`);
        onClose();
      },
    })),
    // Deployments
    ...deployments.map(d => ({
      id: `dep-${d.id}`,
      category: 'Deployments',
      title: `${d.serviceName} (${d.version})`,
      subtitle: `${d.environment} • ${d.status} • ${d.currentTrafficPercentage}% traffic`,
      icon: Rocket,
      action: () => {
        navigate(`/deployments/${d.id}`);
        onClose();
      },
    })),
    // Incidents
    ...incidents.map(i => ({
      id: `inc-${i.id}`,
      category: 'Incidents',
      title: `${i.code}: ${i.title}`,
      subtitle: `${i.severity} • ${i.status} • ${i.affectedServices.join(', ')}`,
      icon: AlertTriangle,
      action: () => {
        navigate(`/incidents/${i.id}`);
        onClose();
      },
    })),
    // Navigation items
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Overview Dashboard',
      subtitle: 'Summary of active rollouts, risk calibration and production health',
      icon: BarChart3,
      action: () => {
        navigate('/dashboard');
        onClose();
      },
    },
    {
      id: 'nav-graph',
      category: 'Navigation',
      title: 'Open Impact Graph',
      subtitle: 'Interactive service topology and blast radius dependency chain',
      icon: Layers,
      action: () => {
        navigate('/impact-graph');
        onClose();
      },
    },
    {
      id: 'nav-policies',
      category: 'Navigation',
      title: 'Manage Release Policies',
      subtitle: 'Production safety thresholds, canary rules, and automated rollback gates',
      icon: Scale,
      action: () => {
        navigate('/policies');
        onClose();
      },
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      title: 'View DORA & Risk Analytics',
      subtitle: 'Deployment frequency, MTTR, failure containment and calibration curves',
      icon: BarChart3,
      action: () => {
        navigate('/analytics');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Open Platform Settings',
      subtitle: 'Manage team, RBAC, security guardrails and environments',
      icon: Settings,
      action: () => {
        navigate('/settings');
        onClose();
      },
    },
    // Simulation Trigger
    {
      id: 'demo-sim-failure',
      category: 'Demo Simulation',
      title: 'Simulate Telemetry Anomaly & Rollout Pause',
      subtitle: 'Trigger error spike (0.42% → 3.7%) on Checkout Service v2.8.4',
      icon: Flame,
      action: () => {
        simulateFailure('dep-checkout-284');
        navigate('/deployments/dep-checkout-284');
        onClose();
      },
    },
  ];

  const filtered = commands.filter(
    cmd =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl bg-white rounded-modal border border-slate-200 shadow-modal overflow-hidden z-10 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3 bg-slate-50/50">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, PR number, deployment, or service..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching commands or entities found for "{query}"
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs',
                    isSelected ? 'bg-blue-50/80 text-brand-900' : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'p-2 rounded-md shrink-0 border',
                        isSelected
                          ? 'bg-white text-brand-600 border-blue-200 shadow-sm'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate flex items-center gap-2">
                        <span>{cmd.title}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200/60">
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.subtitle && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{cmd.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    size={13}
                    className={cn('shrink-0 text-slate-400 ml-2', isSelected && 'text-brand-600')}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-[10px] text-slate-400">ChangeGuard Command Center</span>
        </div>
      </div>
    </div>
  );
};
