import { useSimulation } from '../context/SimulationContext';

export function useAudit() {
  const { auditEvents } = useSimulation();
  return { auditEvents, loading: false };
}
