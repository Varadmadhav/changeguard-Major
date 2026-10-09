import { apiClient } from './apiClient';
import {
  LoginRequest,
  LoginResponse,
  User,
  PermissionAction,
  ROLE_PERMISSIONS,
} from '../../shared/types/index';

class AuthService {
  private currentUser: User | null = null;

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    apiClient.setToken(response.token);
    this.currentUser = response.user;
    localStorage.setItem('cg_user', JSON.stringify(response.user));
    return response;
  }

  async logout(): Promise<void> {
    try {
      if (apiClient.getToken()) {
        await apiClient.post('/auth/logout');
      }
    } finally {
      apiClient.setToken(null);
      this.currentUser = null;
      localStorage.removeItem('cg_user');
    }
  }

  async getMe(): Promise<{ data: User; permissions: PermissionAction[] }> {
    const response = await apiClient.get<{ data: User; permissions: PermissionAction[] }>('/auth/me');
    this.currentUser = response.data;
    localStorage.setItem('cg_user', JSON.stringify(response.data));
    return response;
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    const stored = localStorage.getItem('cg_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch {
        return null;
      }
    }
    return null;
  }

  hasPermission(action: PermissionAction): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(action);
  }

  isAuthenticated(): boolean {
    return !!apiClient.getToken();
  }
}

export const authService = new AuthService();
