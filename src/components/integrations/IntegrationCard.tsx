import React from 'react';
import {
  Github,
  GitMerge,
  Server,
  Cpu,
  Activity,
  Radio,
  Box,
  MessageSquare,
  CheckSquare,
  Plug,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Integration } from '../../types/integration';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface IntegrationCardProps {
  integration: Integration;
  onConfigure: (integration: Integration) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onConfigure,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Github':
        return <Github size={20} />;
      case 'GitMerge':
        return <GitMerge size={20} />;
      case 'Server':
        return <Server size={20} />;
      case 'Cpu':
        return <Cpu size={20} />;
      case 'Activity':
        return <Activity size={20} />;
      case 'Radio':
        return <Radio size={20} />;
      case 'Box':
        return <Box size={20} />;
      case 'MessageSquare':
        return <MessageSquare size={20} />;
      case 'CheckSquare':
        return <CheckSquare size={20} />;
      default:
        return <Plug size={20} />;
    }
  };

  const isConnected = integration.status === 'CONNECTED';

  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card flex flex-col justify-between hover:border-slate-300 transition-colors">
      <div className="space-y-3">
        {/* Top Icon & Status */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200 shadow-2xs">
            {getIcon(integration.iconName)}
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border',
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-emerald-500' : 'bg-slate-400'
              )}
            />
            {integration.status}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-sm font-bold text-slate-900">{integration.name}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed min-h-[36px]">
            {integration.description}
          </p>
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[11px] font-mono text-slate-400">
          Sync: {integration.lastSyncAt}
        </div>
        <Button
          variant={isConnected ? 'secondary' : 'primary'}
          size="xs"
          onClick={() => onConfigure(integration)}
        >
          Configure
        </Button>
      </div>
    </div>
  );
};
