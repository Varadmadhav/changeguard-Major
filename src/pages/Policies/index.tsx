import React, { useState } from 'react';
import { Scale, Plus, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { usePolicies } from '../../hooks/usePolicies';
import { PolicyCard } from '../../components/policies/PolicyCard';
import { PolicyEditorModal } from '../../components/policies/PolicyEditorModal';
import { Button } from '../../components/common/Button';
import { Policy } from '../../types/policy';

export const PoliciesPage: React.FC = () => {
  const { policies, updatePolicy } = usePolicies();
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleEdit = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsEditorOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedPolicy(null);
    setIsEditorOpen(true);
  };

  const handleSave = async (policyData: Partial<Policy>) => {
    if (selectedPolicy) {
      await updatePolicy(selectedPolicy.id, policyData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Release Policies & Guardrails</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define automated risk thresholds, mandatory canary stages, and autonomous rollback triggers.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={handleCreateNew}
        >
          Create Policy
        </Button>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {policies.map(policy => (
          <PolicyCard key={policy.id} policy={policy} onEdit={handleEdit} />
        ))}
      </div>

      {/* Policy Editor Modal */}
      <PolicyEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        policy={selectedPolicy}
        onSave={handleSave}
      />
    </div>
  );
};
