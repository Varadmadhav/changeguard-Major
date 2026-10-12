import { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Change } from '../types/change';
import { changesService } from '../services/changes.service';

export function useChanges() {
  const { changes } = useSimulation();
  const [loading, setLoading] = useState(false);

  return {
    changes,
    loading,
  };
}

export function useChange(id: string) {
  const { changes, approveChangePolicy } = useSimulation();

  const [change, setChange] = useState<Change | undefined>(
    undefined
  );

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadChange = async () => {
      setLoading(true);

      const found = changes.find(
        c =>
          c.id === id ||
          c.id === `pr-${id}` ||
          String(c.number) === id
      );

      if (!found) {
        setChange(undefined);
        setLoading(false);
        return;
      }

      // 1. Run Risk Analysis
      const analyzedChange =
        await changesService.analyzeChange(found.number);

      if (!analyzedChange) {
        setChange(found);
        setLoading(false);
        return;
      }

      // 2. Generate Release Policy from Risk Analysis
      const generatedPolicy =
        await changesService.generatePolicy(found.number);

      // 3. Combine Risk + Generated Policy
      const finalChange: Change = {
        ...analyzedChange,
        policyRecommendation:
          generatedPolicy ??
          analyzedChange.policyRecommendation,
      };

      setChange(finalChange);
      setLoading(false);
    };

    loadChange();
  }, [id, changes]);

  const approvePolicy = async () => {
    if (!change) return;

    await approveChangePolicy(change.id);
  };

  return {
    change,
    loading,
    approvePolicy,
  };
}