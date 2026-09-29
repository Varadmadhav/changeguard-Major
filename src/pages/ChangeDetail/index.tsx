import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  Clock,
  User,
  ShieldAlert,
  Rocket,
  CheckCircle2,
} from 'lucide-react';
import { useChange } from '../../hooks/useChanges';
import { RiskBadge } from '../../components/common/RiskBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { RiskScorePanel } from '../../components/changes/RiskScorePanel';
import { RiskFactorsList } from '../../components/changes/RiskFactorsList';
import { ChangeGuardAnalysis } from '../../components/changes/ChangeGuardAnalysis';
import { ChangeImpactView } from '../../components/changes/ChangeImpactView';
import { DiffViewer } from '../../components/changes/DiffViewer';
import { HistoricalSimilarity } from '../../components/changes/HistoricalSimilarity';
import { ReleasePolicyCard } from '../../components/changes/ReleasePolicyCard';

export const ChangeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { change, approvePolicy } = useChange(id || 'pr-1824');

  if (!change) {
    return (
      <div className="bg-white border border-slate-200 rounded-card p-12 text-center shadow-card">
        <h3 className="text-base font-semibold text-slate-800">Change record not found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested PR or commit could not be loaded.</p>
        <Link to="/changes" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            Back to Changes List
          </Button>
        </Link>
      </div>
    );
  }

  const handleApprove = async () => {
    await approvePolicy();
  };

  return (
    <div className="space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/changes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Changes</span>
        </Link>

        {change.status === 'APPROVED' && (
          <Link to="/deployments/dep-checkout-284">
            <Button
              variant="primary"
              size="sm"
              icon={<Rocket size={14} />}
            >
              Open Deployment Control Room
            </Button>
          </Link>
        )}
      </div>

      {/* Main PR Header */}
      <div className="bg-white border border-slate-200/80 rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-sm font-mono font-bold text-brand-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                PR #{change.number}
              </span>
              <RiskBadge level={change.risk.level} score={change.risk.score} showScore size="sm" />
              <StatusBadge status={change.status} size="sm" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {change.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-slate-400" />
                <strong className="text-slate-800">{change.author.name}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <GitBranch size={13} className="text-slate-400" />
                <span>{change.repository}</span> (<code>{change.branch.source}</code> → <code>{change.branch.target}</code>)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <GitCommit size={13} className="text-slate-400" />
                <span>{change.commitHash}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>Created {change.createdAt}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Risk Score, ChangeGuard Analysis, Risk Factors, Historical) & Right Column (Release Policy, Impact) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Risk Score Panel */}
          <RiskScorePanel
            score={change.risk.score}
            level={change.risk.level}
            confidence={change.risk.confidence}
            reasons={change.risk.reasons}
          />

          {/* ChangeGuard Analysis */}
          <ChangeGuardAnalysis
            overview={change.analysis.overview}
            technicalDetails={change.analysis.technicalDetails}
            identifiedRisks={change.analysis.identifiedRisks}
            recommendedVerification={change.analysis.recommendedVerification}
            generatedAt={change.analysis.generatedAt}
          />

          {/* Granular Risk Factors */}
          <RiskFactorsList factors={change.risk.factors} />

          {/* Historical Similarity */}
          {change.historicalSimilarity && change.historicalSimilarity.length > 0 && (
            <HistoricalSimilarity historicalChanges={change.historicalSimilarity} />
          )}
        </div>

        {/* Right Col (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recommended Release Policy */}
          <ReleasePolicyCard
            policy={change.policyRecommendation}
            onApprove={handleApprove}
            status={change.status}
          />

          {/* Potential Impact & Blast Radius */}
          <ChangeImpactView
            servicesCount={change.impact.servicesCount}
            databasesCount={change.impact.databasesCount}
            apisCount={change.impact.apisCount}
            potentialUsers={change.impact.potentialUsersImpacted}
            dependencyChain={change.impact.dependencyChain}
            affectedServices={change.impact.affectedServices}
          />
        </div>
      </div>

      {/* Code & Diff Viewer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Code Changes & Safety Annotation
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {change.filesChangedCount} files changed ({change.additions} additions, {change.deletions} deletions)
          </span>
        </div>
        <DiffViewer diffs={change.diffs} />
      </div>
    </div>
  );
};
