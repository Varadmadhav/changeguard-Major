import { User, PermissionAction } from '../../types/shared.js';

export interface LoginRequestBody {
  email?: string;
  password?: string;
  ssoToken?: string;
}

export interface SsoCallbackBody {
  SAMLResponse: string;
}

export interface LoginResult {
  token: string;
  user: User;
}

export interface SsoLoginResult extends LoginResult {
  isNewUser: boolean;
}

export interface CurrentUserResult {
  data: User;
  permissions: readonly PermissionAction[];
}
