import React from 'react';
import { Link } from 'react-router-dom';
import { GitPullRequest, Cpu, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Change } from '../../types/change';
import { RiskBadge } from '../common/RiskBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';

interface ChangeTableProps {
  changes: Change[];
}

export const ChangeTable: React.FC<ChangeTableProps> = ({ changes }) => {
  if (changes.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-card p-12 text-center shadow-card">
        <GitPullRequest size={32} className="mx-auto text-slate-300 mb-3" />
        <h4 className="text-sm font-semibold text-slate-800">No matching changes found</h4>
        <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200/80 uppercase text-[11px] font-mono">
            <tr>
              <th className="py-3 px-4">Change</th>
              <th className="py-3 px-3">Author</th>
              <th className="py-3 px-3">Repository</th>
              <th className="py-3 px-3">Diff</th>
              <th className="py-3 px-3">Services</th>
              <th className="py-3 px-3">Risk Assessment</th>
              <th className="py-3 px-3">Confidence</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Created</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {changes.map(change => (
              <tr key={change.id} className="hover:bg-slate-50/80 transition-colors group">
                {/* Change */}
                <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[280px]">
                  <Link
                    to={`/changes/${change.id}`}
                    className="hover:text-brand-600 block group-hover:text-brand-600 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-mono text-slate-400 text-[11px] mb-0.5">
                      <span>#{change.number}</span>
                      <span className="text-slate-300">•</span>
                      <span>{change.commitHash}</span>
                    </div>
                    <div className="font-semibold text-slate-900 line-clamp-1">{change.title}</div>
                  </Link>
                </td>

                {/* Author */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <img
                      src={change.author.avatar}
                      alt={change.author.name}
                      className="w-5 h-5 rounded-full object-cover border border-slate-200"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{change.author.name}</span>
                      {change.author.isAiAgent && (
                        <span className="text-[10px] text-purple-600 font-mono">AI Agent</span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Repository */}
                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                  <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200/60">
                    {change.repository}
                  </span>
                </td>

                {/* Diff */}
                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px]">
                  <span className="text-slate-600 font-medium">{change.filesChangedCount} files</span>
                  <div className="text-[10px] text-slate-400 space-x-1 mt-0.5">
                    <span className="text-emerald-600">+{change.additions}</span>
                    <span className="text-rose-600">-{change.deletions}</span>
                  </div>
                </td>

                {/* Services */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <span className="font-mono font-medium text-slate-800">
                    {change.impact.servicesCount} services
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                    {change.impact.affectedServices.map(s => s.name).join(', ')}
                  </div>
                </td>

                {/* Risk */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <RiskBadge
                    level={change.risk.level}
                    score={change.risk.score}
                    showScore
                    size="sm"
                  />
                </td>

                {/* Confidence */}
                <td className="py-3.5 px-3 whitespace-nowrap font-mono font-medium text-slate-700">
                  {change.risk.confidence}%
                </td>

                {/* Status */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <StatusBadge status={change.status} size="sm" />
                </td>

                {/* Created */}
                <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                  {change.createdAt}
                </td>

                {/* Action */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <Link to={`/changes/${change.id}`}>
                    <Button variant="secondary" size="xs">
                      Analyze
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
