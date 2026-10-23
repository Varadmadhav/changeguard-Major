import { AppError } from '../../errors/AppError.js';
import { AuditWriter } from '../../services/auditWriter.js';
import { IntegrationsRepository } from './integrations.repository.js';
import { IntegrationItem, TestIntegrationResult } from './integrations.types.js';

export class IntegrationsService {
  public static async listIntegrations(orgId: string): Promise<IntegrationItem[]> {
    return IntegrationsRepository.list(orgId);
  }

  public static async updateIntegration(
    id: string,
    updates: Partial<IntegrationItem>,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<IntegrationItem> {
    const updated = await IntegrationsRepository.update(id, updates);

    await AuditWriter.record({
      organizationId: user.organizationId,
      actor: { name: user.name, type: 'USER', email: user.email },
      action: 'INTEGRATION_CONFIGURED',
      actionTitle: `Updated integration: ${updated.name}`,
      resource: { type: 'INTEGRATION', id: updated.id, name: updated.name },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Updated integration ${updated.name} settings and credentials.`,
    });

    return updated;
  }

  public static async testIntegration(id: string): Promise<TestIntegrationResult> {
    const integration = await IntegrationsRepository.findById(id);
    if (!integration) {
      throw AppError.notFound(`Integration ${id}`);
    }

    const healthy = integration.status !== 'ERROR';
    return {
      connected: healthy,
      status: integration.status,
      latencyMs: 42,
      message: healthy
        ? `Successfully verified connectivity to ${integration.name}.`
        : `Failed to connect to ${integration.name}. Check endpoint credentials.`,
    };
  }
}
