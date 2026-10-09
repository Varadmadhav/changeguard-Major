import type { Deployment, DeploymentPolicyCommand } from '../types/deployment.ts';
import {
  UnknownDeploymentError,
  InvalidPolicyCommandError,
  validateDeploymentTransition,
} from '../types/deployment.ts';

/**
 * Policy Command Receiver
 * Ingests and enforces decisions issued by Aarya's Policy Engine.
 */
export class PolicyReceiver {
  /**
   * Evaluates and applies a DeploymentPolicyCommand against the target deployment.
   * Throws typed errors on unknown deployment, invalid decision, or forbidden transition.
   */
  handleCommand(
    deployment: Deployment,
    command: DeploymentPolicyCommand
  ): Deployment {
    // 1. Validate command structure
    if (!command || typeof command !== 'object') {
      throw new InvalidPolicyCommandError(
        'Policy command is missing or malformed.',
        command || {}
      );
    }

    // 2. Validate deployment ID
    if (!command.deploymentId || command.deploymentId !== deployment.id) {
      throw new UnknownDeploymentError(command?.deploymentId || 'undefined');
    }

    // 3. Validate supported decision
    if (command.decision !== 'PAUSE' && command.decision !== 'PROMOTE') {
      throw new InvalidPolicyCommandError(
        `Unsupported policy decision '${(command as any).decision}'. Expected 'PAUSE' or 'PROMOTE'.`,
        command
      );
    }

    // 4. Handle PAUSE decision
    if (command.decision === 'PAUSE') {
      // Idempotency: If already paused, return without duplicate transition
      if (deployment.status === 'PAUSED') {
        return deployment;
      }

      // Validate lifecycle state transition (throws InvalidStateTransitionError if illegal)
      validateDeploymentTransition(deployment.status, 'PAUSED');

      deployment.status = 'PAUSED';
      deployment.health = deployment.health === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
      deployment.pausedReason =
        command.reason ||
        'Rollout paused autonomously by ChangeGuard Policy Engine.';
      deployment.updatedAt = 'Just now';

      const signalsNote =
        command.failedSignals && command.failedSignals.length > 0
          ? ` Violations: ${command.failedSignals.join('; ')}`
          : '';

      deployment.timeline.unshift({
        id: `tl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: 'Autonomous Rollout Pause Triggered',
        description: `${command.reason || 'Threshold breach detected.'}${signalsNote}`,
        type: 'WARNING',
        actor: 'ChangeGuard Policy Engine',
        metadata: {
          decision: command.decision,
          failedSignals: command.failedSignals,
          allowedStages: command.allowedStages,
        },
      });

      return deployment;
    }

    // 5. Handle PROMOTE decision
    if (command.decision === 'PROMOTE') {
      if (!command.canPromote) {
        throw new InvalidPolicyCommandError(
          'Policy decision was PROMOTE but canPromote flag is false.',
          command
        );
      }
      return deployment;
    }

    return deployment;
  }
}

export const policyReceiver = new PolicyReceiver();
