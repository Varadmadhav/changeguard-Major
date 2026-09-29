import React, { useState } from 'react';
import { FileCode, Plus, Minus, Database, ShieldAlert, Cpu, Package } from 'lucide-react';
import { DiffFile } from '../../types/change';
import { cn } from '../../utils/cn';

interface DiffViewerProps {
  diffs?: DiffFile[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffs = [] }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'dependencies' | 'infrastructure' | 'database' | 'security'>('files');

  return (
    <div className="bg-white border border-slate-200/80 rounded-card shadow-card overflow-hidden">
      {/* Diff Header Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 flex items-center justify-between overflow-x-auto no-scrollbar">
        <div className="flex space-x-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('files')}
            className={cn(
              'py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
              activeTab === 'files'
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <FileCode size={14} />
            <span>Files Changed ({diffs.length || 2})</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={cn(
              'py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
              activeTab === 'database'
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Database size={14} className="text-orange-600" />
            <span>Database (1 DDL Migration)</span>
          </button>
          <button
            onClick={() => setActiveTab('dependencies')}
            className={cn(
              'py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
              activeTab === 'dependencies'
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Package size={14} />
            <span>Dependencies</span>
          </button>
          <button
            onClick={() => setActiveTab('infrastructure')}
            className={cn(
              'py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
              activeTab === 'infrastructure'
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Cpu size={14} />
            <span>Infrastructure</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={cn(
              'py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
              activeTab === 'security'
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <ShieldAlert size={14} />
            <span>Security Analysis</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
          Commit 7f9c21b
        </span>
      </div>

      {/* Tab Contents */}
      <div className="p-4 space-y-4">
        {activeTab === 'files' && (
          <div className="space-y-4">
            {diffs.map((file, fIdx) => (
              <div key={fIdx} className="border border-slate-200 rounded-lg overflow-hidden font-mono text-xs">
                {/* File Header */}
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode size={14} className="text-slate-500" />
                    <span className="font-semibold text-slate-800">{file.filename}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-700">+{file.additions}</span>
                    <span className="text-rose-700">-{file.deletions}</span>
                  </div>
                </div>

                {/* Risk Flags inside code */}
                {file.riskHighlights && file.riskHighlights.length > 0 && (
                  <div className="bg-amber-50/70 border-b border-amber-200 px-3.5 py-1.5 flex items-center gap-2 text-[11px] text-amber-900 font-sans">
                    <ShieldAlert size={12} className="text-amber-600 shrink-0" />
                    <span>ChangeGuard Flag: {file.riskHighlights.join(' • ')}</span>
                  </div>
                )}

                {/* Chunks */}
                <div className="divide-y divide-slate-100 bg-[#FAFAFA] overflow-x-auto">
                  {file.chunks.map((chunk, cIdx) => (
                    <div key={cIdx} className="py-1">
                      <div className="bg-slate-100/80 px-3.5 py-1 text-[11px] text-slate-500 select-none">
                        {chunk.header}
                      </div>
                      <div className="font-mono text-[11px] leading-relaxed">
                        {chunk.lines.map((line, lIdx) => (
                          <div
                            key={lIdx}
                            className={cn(
                              'px-3.5 py-0.5 whitespace-pre',
                              line.type === 'add'
                                ? 'bg-emerald-50 text-emerald-900 font-medium'
                                : line.type === 'delete'
                                ? 'bg-rose-50 text-rose-900'
                                : 'text-slate-600'
                            )}
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'database' && (
          <div className="border border-orange-200 bg-orange-50/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-orange-600" />
              <h4 className="text-xs font-bold text-slate-900 font-mono">
                migrations/20260927_add_idempotency_key_index.sql
              </h4>
            </div>
            <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs overflow-x-auto">
              <code>
                {`-- Migration: Add idempotency column and unique index
ALTER TABLE checkout_orders ADD COLUMN idempotency_key VARCHAR(64);
CREATE UNIQUE INDEX idx_checkout_orders_idempotency ON checkout_orders (idempotency_key);
-- Warning flagged by ChangeGuard: consider CREATE INDEX CONCURRENTLY to avoid table lock`}
              </code>
            </div>
            <div className="text-xs text-slate-700 bg-white p-3 rounded border border-orange-200 space-y-1">
              <p className="font-semibold text-orange-900">ChangeGuard Safety Evaluation:</p>
              <p>
                The table <code>checkout_orders</code> receives ~18,000 queries/second. Executing <code>CREATE UNIQUE INDEX</code> without <code>CONCURRENTLY</code> will acquire a <code>ShareLock</code>, blocking incoming writes and causing connection queue saturation.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <p className="font-semibold text-slate-900">Direct Downstream Dependencies:</p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li><code>@acme/payment-client</code> (v3.2.0) - No breaking signature changes</li>
              <li><code>pg-pool</code> (v8.11.3) - Connection timeout set to 5000ms</li>
            </ul>
          </div>
        )}

        {activeTab === 'infrastructure' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <p className="font-semibold text-slate-900">Kubernetes & Argo Rollouts Topology:</p>
            <p className="text-slate-600">
              Deployment configured for Argo Rollouts CRD in namespace <code>production</code>. Replica count: 12 pods with horizontal pod autoscaler (HPA) min 6 / max 24.
            </p>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
              <ShieldAlert size={14} className="text-emerald-600" />
              <span>Static Application Security Testing (SAST) Passed</span>
            </div>
            <p className="text-slate-600">
              No secrets, API keys, or SQL injection vectors detected in PR diff. Idempotency hashes use standard SHA-256.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
