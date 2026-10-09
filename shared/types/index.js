// Shared domain models and API contracts for ChangeGuard (Frontend & Backend)
export const ROLE_PERMISSIONS = {
    ADMIN: [
        'VIEW',
        'APPROVE_POLICY',
        'PROMOTE_DEPLOYMENT',
        'PAUSE_DEPLOYMENT',
        'ROLLBACK_DEPLOYMENT',
        'MANAGE_POLICIES',
        'MANAGE_TEAM',
        'MANAGE_INTEGRATIONS',
        'VIEW_AUDIT_LOG',
        'EXPORT_AUDIT_LOG',
        'MANAGE_AI_SETTINGS',
    ],
    PLATFORM_ENGINEER: [
        'VIEW',
        'APPROVE_POLICY',
        'PROMOTE_DEPLOYMENT',
        'PAUSE_DEPLOYMENT',
        'ROLLBACK_DEPLOYMENT',
        'MANAGE_POLICIES',
        'MANAGE_INTEGRATIONS',
        'VIEW_AUDIT_LOG',
        'EXPORT_AUDIT_LOG',
        'MANAGE_AI_SETTINGS',
    ],
    SRE: [
        'VIEW',
        'PROMOTE_DEPLOYMENT',
        'PAUSE_DEPLOYMENT',
        'ROLLBACK_DEPLOYMENT',
        'VIEW_AUDIT_LOG',
    ],
    DEVELOPER: [
        'VIEW',
    ],
    APPROVER: [
        'VIEW',
        'APPROVE_POLICY',
    ],
};
