import { AppError } from '../../errors/AppError.js';
import { PolicyEngine } from '../../services/policyEngine.js';
import { AuditWriter } from '../../services/auditWriter.js';
import { PoliciesRepository } from './policies.repository.js';
import { CreatePolicyBody, PolicyRecord, PolicyVersionRecord, UpdatePolicyBody } from './policies.types.js';
import { PolicyRule } from '../../types/shared.js';

export class PoliciesService {
  public static async listPolicies(orgId: string): Promise<PolicyRecord[]> {
    return PoliciesRepository.list(orgId);
  }

  public static async getPolicyById(id: string, orgId: string): Promise<PolicyRecord> {
    const policy = await PoliciesRepository.findById(id, orgId);
    if (!policy) {
      throw AppError.notFound(`Policy with ID ${id}`);
    }
    return policy;
  }

  public static async createPolicy(
    body: CreatePolicyBody,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<PolicyRecord> {
    const { name, description, environment, tierScope, status, enforcementMode, owner, rules } = body;

    const created = await PoliciesRepository.create(
      {
        organizationId: user.organizationId,
        name,
        description: description || '',
        environment: environment || 'PRODUCTION',
        tierScope: tierScope || 'ALL',
        status: status || 'DRAFT',
        enforcementMode: enforcementMode || 'ENFORCING',
        owner: owner || user.name,
        rules,
        updatedBy: user.name,
      },
      user.name
    );

    await AuditWriter.record({
      organizationId: user.organizationId,
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: 'USER',
      },
      action: 'POLICY_CREATED',
      actionTitle: `Created Policy: ${created.name}`,
      resource: {
        type: 'POLICY',
        id: created.id,
        name: created.name,
      },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Created version ${created.version} with ${created.rulesCount} safety rule(s).`,
    });

    return created;
  }

  public static async updatePolicy(
    id: string,
    updates: UpdatePolicyBody,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<PolicyRecord> {
    const result = await PoliciesRepository.update(id, updates, user.name, user.organizationId);
    if (!result) {
      throw AppError.notFound(`Policy with ID ${id}`);
    }

    await AuditWriter.record({
      organizationId: user.organizationId,
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: 'USER',
      },
      action: 'POLICY_UPDATED',
      actionTitle: `Updated Policy: ${result.policy.name} (v${result.policy.version})`,
      resource: {
        type: 'POLICY',
        id: result.policy.id,
        name: result.policy.name,
      },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Incremented from version ${result.previousVersion.version} to ${result.policy.version}. Previous configuration archived.`,
    });

    return result.policy;
  }

  public static async updateRules(
    id: string,
    rules: PolicyRule[],
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<PolicyRecord> {
    const result = await PoliciesRepository.update(id, { rules }, user.name, user.organizationId);
    if (!result) {
      throw AppError.notFound(`Policy with ID ${id}`);
    }

    await AuditWriter.record({
      organizationId: user.organizationId,
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: 'USER',
      },
      action: 'POLICY_UPDATED',
      actionTitle: `Updated rules in Policy: ${result.policy.name}`,
      resource: {
        type: 'POLICY',
        id: result.policy.id,
        name: result.policy.name,
      },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Configured ${rules.length} safety rules. Version bumped to ${result.policy.version}.`,
    });

    return result.policy;
  }

  public static async evaluatePolicy(
    id: string,
    context: Record<string, any>,
    user: { id: string; name: string; email: string; organizationId: string }
  ) {
    const policy = await PoliciesRepository.findById(id, user.organizationId);
    if (!policy) {
      throw AppError.notFound(`Policy with ID ${id}`);
    }

    const output = PolicyEngine.evaluatePolicy(policy, context);

    if (policy.enforcementMode === 'DRY_RUN') {
      await AuditWriter.record({
        organizationId: user.organizationId,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
          type: 'POLICY_ENGINE',
        },
        action: 'POLICY_ENFORCED',
        actionTitle: `Dry-Run Evaluated: ${policy.name}`,
        resource: {
          type: 'POLICY',
          id: policy.id,
          name: policy.name,
        },
        result: 'SUCCESS',
        source: 'POLICY_ENGINE',
        details: `DRY_RUN mode: ${output.summary}`,
      });
    }

    return output;
  }

  public static async getVersions(id: string): Promise<PolicyVersionRecord[]> {
    return PoliciesRepository.getVersions(id);
  }
}
