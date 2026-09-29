import { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Change } from '../types/change';

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
  const [change, setChange] = useState<Change | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const found = changes.find(
      c => c.id === id || c.id === `pr-${id}` || String(c.number) === id
    );
    setChange(found);
  }, [id, changes]);

  return {
    change,
    loading,
    approvePolicy: () => (change ? approveChangePolicy(change.id) : Promise.resolve()),
  };
}
