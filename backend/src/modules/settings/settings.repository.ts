import { db } from '../../db/index.js';
import { OrgSettings } from '../../types/shared.js';

export class SettingsRepository {
  public static async get(orgId: string): Promise<OrgSettings> {
    return db.getSettings(orgId);
  }

  public static async updateSection(
    orgId: string,
    section: keyof OrgSettings,
    data: any
  ): Promise<OrgSettings> {
    return db.updateSettings(orgId, section, data);
  }
}
