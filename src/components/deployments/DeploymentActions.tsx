import React, { useState } from 'react';
import { ArrowUpRight, Pause, Play, RotateCcw, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Deployment } from '../../types/deployment';

interface DeploymentActionsProps {
  deployment: Deployment;
  onPromote: () => void;
  onPause: (reason?: string) => void;
  onRollback: (reason?: string) => void;
}

export const DeploymentActions: React.FC<DeploymentActionsProps> = ({
  deployment,
  onPromote,
  onPause,
  onRollback,
}) => {
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showAbortDialog, setShowAbortDialog] = useState(false);

  const [pauseReason, setPauseReason] = useState('Telemetry threshold approaching limit.');
  const [rollbackReason, setRollbackReason] = useState('Error rate exceeded production threshold.');

  const isPaused = deployment.status === 'PAUSED';
  const isRolledBack = deployment.status === 'ROLLED_BACK';
  const isPromoted = deployment.status === 'PROMOTED' || deployment.currentTrafficPercentage === 100;

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-card p-4 sm:p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Deployment Control Room Actions
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Auth: Alex Morgan (Platform Eng)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Promote Action */}
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowUpRight size={14} />}
            disabled={isRolledBack || isPromoted}
            onClick={() => setShowPromoteDialog(true)}
          >
            {isPaused ? 'Resume & Promote Stage' : 'Promote Next Stage'}
          </Button>

          {/* Pause Action */}
          {!isPaused ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<Pause size={14} />}
              disabled={isRolledBack || isPromoted}
              onClick={() => setShowPauseDialog(true)}
            >
              Pause Rollout
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<Play size={14} />}
              disabled={isRolledBack || isPromoted}
              onClick={onPromote}
            >
              Resume Progression
            </Button>
          )}

          {/* Rollback Action */}
          <Button
            variant="danger"
            size="sm"
            icon={<RotateCcw size={14} />}
            disabled={isRolledBack}
            onClick={() => setShowRollbackDialog(true)}
          >
            Execute Rollback
          </Button>

          {/* Abort Action */}
          <Button
            variant="ghost"
            size="sm"
            icon={<XCircle size={14} />}
            disabled={isRolledBack || isPromoted}
            onClick={() => setShowAbortDialog(true)}
            className="text-slate-600 hover:text-slate-900 ml-auto"
          >
            Abort
          </Button>
        </div>
      </div>

      {/* Pause Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showPauseDialog}
        onClose={() => setShowPauseDialog(false)}
        onConfirm={() => {
          onPause(pauseReason);
          setShowPauseDialog(false);
        }}
        title={`Pause ${deployment.serviceName} (${deployment.version}) rollout?`}
        description={
          <div className="space-y-3">
            <p>
              Holding traffic at current stage ({deployment.currentTrafficPercentage}%). Progression will be halted immediately.
            </p>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Pause Reason:
              </label>
              <input
                type="text"
                value={pauseReason}
                onChange={e => setPauseReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>
        }
        confirmLabel="Pause Deployment"
        variant="warning"
      />

      {/* Rollback Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRollbackDialog}
        onClose={() => setShowRollbackDialog(false)}
        onConfirm={() => {
          onRollback(rollbackReason);
          setShowRollbackDialog(false);
        }}
        title={`Rollback ${deployment.serviceName} to ${deployment.previousVersion}?`}
        description={
          <div className="space-y-3">
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 space-y-1">
              <div className="flex justify-between font-mono">
                <span>Current revision:</span>
                <span className="font-bold">{deployment.version}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Target rollback revision:</span>
                <span className="font-bold text-emerald-700">{deployment.previousVersion} (Known Good)</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Rollback Reason:
              </label>
              <input
                type="text"
                value={rollbackReason}
                onChange={e => setRollbackReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>
        }
        confirmLabel="Rollback Deployment"
        variant="danger"
      />

      {/* Promote Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showPromoteDialog}
        onClose={() => setShowPromoteDialog(false)}
        onConfirm={() => {
          onPromote();
          setShowPromoteDialog(false);
        }}
        title={`Promote ${deployment.serviceName} traffic to next canary stage?`}
        description="Verification signals have passed. Promoting will increase live user traffic exposure to the next configured policy stage."
        confirmLabel="Advance Canary Stage"
        variant="primary"
      />

      {/* Abort Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showAbortDialog}
        onClose={() => setShowAbortDialog(false)}
        onConfirm={() => {
          onRollback('Operator manually aborted rollout.');
          setShowAbortDialog(false);
        }}
        title="Abort and discard this rollout?"
        description="Aborting will immediately scale down canary pods and revert 100% traffic to stable baseline."
        confirmLabel="Abort Rollout"
        variant="danger"
      />
    </>
  );
};
