import React from 'react';
import { Layers, Server, MapPin, Scale, Plug } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const EnvironmentSettings: React.FC = () => {
  const envs = [
    {
      name: 'Production',
      tag: 'PRODUCTION',
      status: 'ACTIVE',
      cluster: 'prod-us-east-1-eks',
      region: 'us-east-1 (N. Virginia)',
      policy: 'Production Safety Policy (4 Rules)',
      integrations: ['GitHub', 'Argo Rollouts', 'Prometheus', 'Slack'],
    },
    {
      name: 'Staging',
      tag: 'STAGING',
      status: 'ACTIVE',
      cluster: 'stg-us-east-1-eks',
      region: 'us-east-1 (N. Virginia)',
      policy: 'Staging Auto-Promote Policy (2 Rules)',
      integrations: ['GitHub', 'Argo Rollouts', 'Prometheus'],
    },
    {
      name: 'Development',
      tag: 'DEVELOPMENT',
      status: 'ACTIVE',
      cluster: 'dev-cluster-minikube',
      region: 'us-west-2 (Oregon)',
      policy: 'Standard Dev Policy',
      integrations: ['GitHub Actions'],
    },
  ];

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Configured Kubernetes Environments</h3>
        <p className="text-slate-500 mt-0.5">
          Manage cluster bindings, policy mappings, and canary ingress gateways for each target tier.
        </p>
      </div>

      <div className="space-y-4">
        {envs.map(env => (
          <div
            key={env.tag}
            className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{env.name}</span>
                <span className="px-2 py-0.2 rounded-full font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {env.status}
                </span>
              </div>

              <Button variant="secondary" size="xs">
                Configure Cluster
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <Server size={13} className="text-slate-400" />
                <span>Cluster: <strong className="text-slate-900">{env.cluster}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-slate-400" />
                <span>Region: <strong className="text-slate-900">{env.region}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Scale size={13} className="text-brand-600" />
                <span>Enforced: <strong className="text-slate-900">{env.policy}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Plug size={13} className="text-slate-400" />
                <span>Integrations: {env.integrations.join(', ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
