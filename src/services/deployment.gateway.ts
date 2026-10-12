import type { Change } from '../types/change';

import {
    changeGuardEngine,
} from './changeguard.engine';

import type {
    DeploymentPolicyCommand,
} from './deployment.contract';

class DeploymentGateway {
    evaluateDeployment(
        change: Change,
        telemetry: Parameters<
            typeof changeGuardEngine.evaluateTelemetry
        >[1]
    ): DeploymentPolicyCommand {
        return changeGuardEngine.createDeploymentCommand(
            change,
            telemetry
        );
    }
}

export const deploymentGateway =
    new DeploymentGateway();