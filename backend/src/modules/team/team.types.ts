import { User, UserRole } from '../../types/shared.js';

export interface InviteMemberBody {
  email: string;
  name: string;
  role: UserRole;
}

export interface UpdateRoleBody {
  role: UserRole;
}

export type TeamMember = User;
