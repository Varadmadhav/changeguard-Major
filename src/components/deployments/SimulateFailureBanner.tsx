import React from 'react';
import { Flame, RefreshCw, AlertOctagon, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { useSimulation } from '../../context/SimulationContext';

interface SimulateFailureBannerProps {
  deploymentId: string;
  status: string;
}

export const SimulateFailureBanner: React.FC<SimulateFailureBannerProps> = ({
  deploymentId,
  status,
}) => {
  const {
    isSimulatingFailure,
    simulateFailure,
    rollbackDeployment,
    resetSimulationDemo,
  } = useSimulation();

  return (
    <div className="bg-slate-900 text-white rounded-card p-4 sm:p-5 shadow-dropdown flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Flame size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-orange-400 uppercase">
              Interactive Demo Simulation Control
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
              Presentation Mode
            </span>
          </div>
          <h4 className="text-sm font-semibold text-white mt-0.5">
            Test Autonomous Safety & Failure Containment
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Inject a live telemetry anomaly (Error Rate 0.42% → 3.7%) to watch the Policy Engine automatically halt traffic progression and protect production.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {!isSimulatingFailure && status !== 'ROLLED_BACK' ? (
          <Button
            variant="danger"
            size="sm"
            icon={<Flame size={14} />}
            onClick={() => simulateFailure(deploymentId)}
            className="bg-orange-600 hover:bg-orange-700 border-orange-500 font-mono text-xs shadow-sm"
          >
            Simulate Telemetry Failure
          </Button>
        ) : status === 'PAUSED' ? (
          <Button
            variant="danger"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => rollbackDeployment(deploymentId, 'Simulated Failure - Automated Rollback')}
            className="font-mono text-xs"
          >
            Rollback to Baseline (v2.8.3)
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={resetSimulationDemo}
            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 font-mono text-xs"
          >
            Reset Demo State
          </Button>
        )}
      </div>
    </div>
  );
};
