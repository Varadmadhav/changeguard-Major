import bcrypt from 'bcryptjs';
import { AppError } from '../../errors/AppError.js';
import { TeamRepository } from './team.repository.js';
import { InviteMemberBody, TeamMember } from './team.types.js';
import { UserRole } from '../../types/shared.js';
import { DbUser } from '../../db/index.js';

function toTeamMember(u: DbUser): TeamMember {
  return {
    id: u.id,
    organizationId: u.organization_id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.is_active,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

export class TeamService {
  public static async listMembers(organizationId: string): Promise<TeamMember[]> {
    const users = await TeamRepository.listByOrg(organizationId);
    return users.map(toTeamMember);
  }

  public static async inviteMember(
    organizationId: string,
    body: InviteMemberBody
  ): Promise<TeamMember> {
    const { email, name, role } = body;

    const existing = await TeamRepository.findByEmail(email);
    if (existing) {
      throw AppError.conflict(`User with email ${email} already exists`);
    }

    const defaultPasswordHash = await bcrypt.hash('tempPassword123!', 10);
    const newUser = await TeamRepository.create({
      organization_id: organizationId,
      name,
      email,
      password_hash: defaultPasswordHash,
      role,
      is_active: true,
      sso_subject: null,
    });

    return toTeamMember(newUser);
  }

  public static async updateMemberRole(userId: string, role: UserRole): Promise<TeamMember> {
    const updated = await TeamRepository.update(userId, { role });
    if (!updated) {
      throw AppError.notFound(`User ${userId}`);
    }
    return toTeamMember(updated);
  }

  public static async removeMember(userId: string, currentUserId: string): Promise<void> {
    if (userId === currentUserId) {
      throw AppError.badRequest('Admins cannot remove their own account');
    }

    const deleted = await TeamRepository.delete(userId);
    if (!deleted) {
      throw AppError.notFound(`User ${userId}`);
    }
  }
}
