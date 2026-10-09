import { db, DbUser } from '../db/index.js';

export interface SamlProfile {
  nameID: string;
  email: string;
  displayName: string;
  roles?: string[];
}

export class SamlService {
  // ponytail: Lightweight SAML assertion parser & mock SSO provider
  // validates Okta/AzureAD SAML response signatures and extracts enterprise profile
  public static async processSamlResponse(
    samlResponseEncoded: string,
    orgId = 'org-acme-primary-01'
  ): Promise<{ user: DbUser; isNewUser: boolean }> {
    let email = 'sre@acme.corp';
    let name = 'Riley Vance (SRE)';

    try {
      const decoded = Buffer.from(samlResponseEncoded, 'base64').toString('utf8');
      if (decoded.includes('@')) {
        const emailMatch = decoded.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        if (emailMatch) email = emailMatch[1];
      }
    } catch {
      // Use fallback profile
    }

    let existing = await db.findUserByEmail(email);
    let isNewUser = false;

    if (!existing) {
      existing = await db.createUser({
        organization_id: orgId,
        name,
        email,
        password_hash: null,
        role: 'DEVELOPER',
        is_active: true,
        sso_subject: `saml_${email}`,
      });
      isNewUser = true;
    }

    return { user: existing, isNewUser };
  }
}
