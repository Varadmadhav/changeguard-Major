import { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Incident } from '../types/incident';

export function useIncidents() {
  const { incidents } = useSimulation();
  const [loading, setLoading] = useState(false);

  return { incidents, loading };
}

export function useIncident(id: string) {
  const { incidents } = useSimulation();
  const [incident, setIncident] = useState<Incident | undefined>(undefined);

  useEffect(() => {
    const found = incidents.find(
      i =>
        i.id === id ||
        i.code.toLowerCase() === id.toLowerCase() ||
        i.code.toLowerCase() === `inc-${id.toLowerCase()}`
    );
    setIncident(found);
  }, [id, incidents]);

  return { incident };
}
