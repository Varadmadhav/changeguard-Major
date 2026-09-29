import React from 'react';
import { ImpactGraph } from '../../components/graph/ImpactGraph';

export const ImpactGraphPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Impact Graph & Blast Radius</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize multi-tier microservice dependencies, database lock surfaces, and real-time failure propagation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 px-3 py-1 bg-white border border-slate-200 rounded-md shadow-2xs">
            Traces: <strong className="text-brand-600 font-semibold">OpenTelemetry Connected</strong>
          </span>
        </div>
      </div>

      {/* Main Impact Graph Canvas */}
      <ImpactGraph />
    </div>
  );
};
