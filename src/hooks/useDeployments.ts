import { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Deployment } from '../types/deployment';

export function useDeployments() {
  const {
    deployments,
    simulateFailure,
    promoteDeployment,
    pauseDeployment,
    resumeDeployment,
    rollbackDeployment,
    isSimulatingFailure,
    resetSimulationDemo,
  } = useSimulation();

  return {
    deployments,
    simulateFailure,
    promoteDeployment,
    pauseDeployment,
    resumeDeployment,
    rollbackDeployment,
    isSimulatingFailure,
    resetSimulationDemo,
  };
}

export function useDeployment(id: string) {
  const {
    deployments,
    simulateFailure,
    promoteDeployment,
    pauseDeployment,
    resumeDeployment,
    rollbackDeployment,
    isSimulatingFailure,
  } = useSimulation();

  const [deployment, setDeployment] = useState<Deployment | undefined>(undefined);

  useEffect(() => {
    const found = deployments.find(
      d => d.id === id || d.serviceId === id || d.serviceName.toLowerCase().includes(id.toLowerCase())
    );
    setDeployment(found);
  }, [id, deployments]);

  return {
    deployment,
    simulateFailure: () => deployment && simulateFailure(deployment.id),
    promote: () => deployment && promoteDeployment(deployment.id),
    pause: (reason?: string) => deployment && pauseDeployment(deployment.id, reason),
    resume: () => deployment && resumeDeployment(deployment.id),
    rollback: (reason?: string) => deployment && rollbackDeployment(deployment.id, reason),
    isSimulatingFailure,
  };
}
