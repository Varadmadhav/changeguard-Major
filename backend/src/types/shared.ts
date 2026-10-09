// Shared domain models and API contracts for ChangeGuard (Frontend & Backend)

export type UserRole = 'ADMIN' | 'PLATFORM_ENGINEER' | 'SRE' | 'DEVELOPER' | 'APPROVER';

export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  ssoSubject?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface CreateApiKeyResponse {
  key: ApiKey;
  secret: string; // Plaintext token returned only once upon creation
}

export interface LoginRequest {
  email: string;
  password?: string;
  ssoToken?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface InviteMemberRequest {
  email: string;
  name: string;
  role: UserRole;
}

export interface UpdateMemberRoleRequest {
  role: UserRole;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export type PermissionAction =
  | 'VIEW'
  | 'APPROVE_POLICY'
  | 'PROMOTE_DEPLOYMENT'
  | 'PAUSE_DEPLOYMENT'
  | 'ROLLBACK_DEPLOYMENT'
  | 'MANAGE_POLICIES'
  | 'MANAGE_TEAM'
  | 'MANAGE_INTEGRATIONS'
  | 'VIEW_AUDIT_LOG'
  | 'EXPORT_AUDIT_LOG'
  | 'MANAGE_AI_SETTINGS';

export const ROLE_PERMISSIONS: Record<UserRole, readonly PermissionAction[]> = {
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
