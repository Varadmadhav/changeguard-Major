import React, { useState } from 'react';
import { ShieldCheck, Check, Edit3, UserCheck, Ban, ArrowRight, Activity, Clock } from 'lucide-react';
import { ReleasePolicyRecommendation } from '../../types/change';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { cn } from '../../utils/cn';

interface ReleasePolicyCardProps {
  policy: ReleasePolicyRecommendation;
  onApprove: () => void;
  status: string;
}

export const ReleasePolicyCard: React.FC<ReleasePolicyCardProps> = ({
  policy,
  onApprove,
  status,
}) => {
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const isApproved = status === 'APPROVED';

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Recommended Release Policy & Guardrails
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-blue-50 text-brand-700 border border-blue-200 rounded">
            {policy.strategy} STRATEGY
          </span>
        </div>

        {/* Staged Traffic Progression visual */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-800 block">
            Automated Staged Traffic Progression
          </span>
          <div className="flex items-center gap-2 overflow-x-auto p-3 bg-slate-50 border border-slate-200/60 rounded-lg">
            {policy.stages.map((stage, idx) => (
              <React.Fragment key={stage}>
                <div className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 shadow-2xs">
                  {stage}%
                </div>
                {idx < policy.stages.length - 1 && (
                  <span className="text-slate-400 font-mono text-xs">→</span>
                )}
              </React.Fragment>
            ))}
            <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <Clock size={12} />
              <span>{policy.verificationWindowMinutes}m verification/stage</span>
            </div>
          </div>
        </div>

        {/* Required Signals Gate */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-800 block">
            Required Health Signals for Automatic Advancement
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {policy.requiredSignals.map((sig, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-brand-600" />
                  <span className="font-medium text-slate-800">{sig.name}</span>
                </div>
                <div className="font-mono text-[11px] font-semibold text-slate-700">
                  {sig.operator} {sig.threshold}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Human Approval Warning Note */}
        {policy.humanApprovalRequired && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <UserCheck size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Human Sign-off Required:</span>
              <span>{policy.approvalReason}</span>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isApproved ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Check size={14} />}
                onClick={onApprove}
              >
                Approve Release Policy
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 font-mono">
                <Check size={13} />
                Policy Approved for Rollout
              </span>
            )}

            <Button
              variant="secondary"
              size="sm"
              icon={<Edit3 size={13} />}
              onClick={() => setShowModifyModal(true)}
            >
              Modify Policy
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<Ban size={13} className="text-rose-600" />}
            className="text-rose-700 hover:bg-rose-50"
            onClick={() => setShowBlockDialog(true)}
          >
            Block Change
          </Button>
        </div>
      </div>

      {/* Block Change Confirm Dialog */}
      <ConfirmDialog
        isOpen={showBlockDialog}
        onClose={() => setShowBlockDialog(false)}
        onConfirm={() => {
          setShowBlockDialog(false);
          alert('Change marked as blocked by Release Policy.');
        }}
        title="Block PR #1824 from production release?"
        description="Blocking this change prevents CI/CD pipelines and progressive delivery controllers from deploying this revision to production."
        confirmLabel="Block Change"
        variant="danger"
      />

      {/* Modify Policy Feedback */}
      <ConfirmDialog
        isOpen={showModifyModal}
        onClose={() => setShowModifyModal(false)}
        onConfirm={() => setShowModifyModal(false)}
        title="Modify Release Policy Parameters"
        description="You can customize canary stages (e.g. 10% → 50% → 100%) and override error rate thresholds in the Policy Editor."
        confirmLabel="Save Custom Policy"
        variant="primary"
      />
    </>
  );
};
