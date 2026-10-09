import bcrypt from 'bcryptjs';
import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { UserRole } from '../types/shared.js';

interface InviteMemberBody {
  email: string;
  name: string;
  role: UserRole;
}

interface UpdateRoleBody {
  role: UserRole;
}

export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  // List team members - requires ADMIN or PLATFORM_ENGINEER
  fastify.get(
    '/api/v1/team',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    async (request, reply) => {
      const users = await db.listUsersByOrg(request.user.organizationId);
      const sanitized = users.map((u) => ({
        id: u.id,
        organizationId: u.organization_id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));

      return reply.status(200).send({
        data: sanitized,
        meta: {
          total: sanitized.length,
        },
      });
    }
  );

  // Invite member - requires ADMIN
  fastify.post<{ Body: InviteMemberBody }>(
    '/api/v1/team/invite',
    { preHandler: [authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      const { email, name, role } = request.body || {};

      if (!email || !name || !role) {
        throw new AppError(400, 'BAD_REQUEST', 'Email, name, and role are required');
      }

      const existing = await db.findUserByEmail(email);
      if (existing) {
        throw new AppError(409, 'USER_EXISTS', `User with email ${email} already exists`);
      }

      const defaultPasswordHash = await bcrypt.hash('tempPassword123!', 10);
      const newUser = await db.createUser({
        organization_id: request.user.organizationId,
        name,
        email,
        password_hash: defaultPasswordHash,
        role,
        is_active: true,
        sso_subject: null,
      });

      return reply.status(201).send({
        data: {
          id: newUser.id,
          organizationId: newUser.organization_id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.is_active,
          createdAt: newUser.created_at,
          updatedAt: newUser.updated_at,
        },
        message: 'Member invitation created successfully',
      });
    }
  );

  // Update role - requires ADMIN
  fastify.patch<{ Params: { userId: string }; Body: UpdateRoleBody }>(
    '/api/v1/team/:userId',
    { preHandler: [authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      const { userId } = request.params;
      const { role } = request.body || {};

      if (!role) {
        throw new AppError(400, 'BAD_REQUEST', 'Role is required');
      }

      const updated = await db.updateUser(userId, { role });
      if (!updated) {
        throw new AppError(404, 'USER_NOT_FOUND', `User ${userId} not found`);
      }

      return reply.status(200).send({
        data: {
          id: updated.id,
          organizationId: updated.organization_id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          isActive: updated.is_active,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        },
      });
    }
  );

  // Remove member - requires ADMIN
  fastify.delete<{ Params: { userId: string } }>(
    '/api/v1/team/:userId',
    { preHandler: [authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      const { userId } = request.params;

      if (userId === request.user.id) {
        throw new AppError(400, 'CANNOT_DELETE_SELF', 'Admins cannot remove their own account');
      }

      const deleted = await db.deleteUser(userId);
      if (!deleted) {
        throw new AppError(404, 'USER_NOT_FOUND', `User ${userId} not found`);
      }

      return reply.status(200).send({
        success: true,
        message: 'Member removed successfully',
      });
    }
  );
};
