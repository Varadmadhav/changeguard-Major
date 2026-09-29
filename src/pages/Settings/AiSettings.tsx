import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Sliders, Check, Shield } from 'lucide-react';

export const AiSettings: React.FC = () => {
  const [explanationsEnabled, setExplanationsEnabled] = useState(true);
  const [similarityEngine, setSimilarityEngine] = useState(true);
  const [riskRecommendations, setRiskRecommendations] = useState(true);
  const [provider, setProvider] = useState('internal_hosted');
  const [dataRetention, setZeroRetention] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 text-xs max-w-2xl">
      <div>
        <h3 className="text-sm font-bold text-slate-900">ChangeGuard Risk Engine & ML Calibration</h3>
        <p className="text-slate-500 mt-0.5">
          Configure deterministic risk scoring heuristics, semantic code embedding models, and historical similarity search.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-900 block">Engineering Risk Explanations</span>
            <span className="text-[11px] text-slate-500">
              Generate structured technical failure mechanisms and dependency summaries
            </span>
          </div>
          <input
            type="checkbox"
            checked={explanationsEnabled}
            onChange={e => setExplanationsEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
          />
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-900 block">Historical Change Similarity Embeddings</span>
            <span className="text-[11px] text-slate-500">
              Correlate current PR AST diffs against past rollback postmortems
            </span>
          </div>
          <input
            type="checkbox"
            checked={similarityEngine}
            onChange={e => setSimilarityEngine(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
          />
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-900 block">Automated Release Policy Synthesis</span>
            <span className="text-[11px] text-slate-500">
              Recommend optimal canary stages and verification timeframes based on blast radius
            </span>
          </div>
          <input
            type="checkbox"
            checked={riskRecommendations}
            onChange={e => setRiskRecommendations(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Inference Engine Backend</label>
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-input px-3 py-2 text-xs text-slate-900"
          >
            <option value="internal_hosted">Self-Hosted On-Premise Model (Zero External Egress)</option>
            <option value="dedicated_vpc">Dedicated Enterprise Cloud VPC (vLLM Engine)</option>
          </select>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-900">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-emerald-700 shrink-0" />
            <div>
              <span className="font-semibold block">Strict Enterprise Data Isolation</span>
              <span className="text-[11px] text-emerald-800">
                Proprietary code and diffs are never stored or shared with external model trainers.
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-emerald-100 rounded text-[10px] font-mono font-bold">
            ZERO RETENTION
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
        <Button variant="primary" size="sm" type="submit">
          Save Engine Configuration
        </Button>
        {saved && (
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <Check size={14} /> Saved successfully
          </span>
        )}
      </div>
    </form>
  );
};
