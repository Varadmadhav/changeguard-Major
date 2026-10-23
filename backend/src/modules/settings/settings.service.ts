import { AppError } from '../../errors/AppError.js';
import { AuditWriter } from '../../services/auditWriter.js';
import { SettingsRepository } from './settings.repository.js';
import { OrgSettingsRecord, SettingsSection } from './settings.types.js';

const VALID_SECTIONS: SettingsSection[] = [
  'general',
  'security',
  'environments',
  'notifications',
  'ai',
];

export class SettingsService {
  public static async getSettings(orgId: string): Promise<OrgSettingsRecord> {
    return SettingsRepository.get(orgId);
  }

  public static async updateSection(
    orgId: string,
    section: SettingsSection,
    data: any,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<OrgSettingsRecord> {
    if (!VALID_SECTIONS.includes(section)) {
      throw AppError.badRequest(`Invalid settings section: ${section}`);
    }

    const updated = await SettingsRepository.updateSection(orgId, section, data);

    await AuditWriter.record({
      organizationId: orgId,
      actor: { name: user.name, type: 'USER', email: user.email },
      action: 'POLICY_UPDATED',
      actionTitle: `Updated settings section: ${section}`,
      resource: { type: 'SETTING', id: `settings-${section}`, name: `${section} settings` },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Updated ${section} configuration parameters.`,
    });

    return updated;
  }
}
