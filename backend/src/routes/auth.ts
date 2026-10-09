import bcrypt from 'bcryptjs';
import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { ROLE_PERMISSIONS } from '../types/shared.js';

interface LoginBody {
  email?: string;
  password?: string;
  ssoToken?: string;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: LoginBody }>('/api/v1/auth/login', async (request, reply) => {
    const { email, password, ssoToken } = request.body || {};

    if (!email) {
      throw new AppError(400, 'BAD_REQUEST', 'Email is required for authentication');
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // SSO token pathway or standard password check
    if (ssoToken) {
      if (user.sso_subject !== ssoToken) {
        throw new AppError(401, 'INVALID_SSO_TOKEN', 'SSO assertion verification failed');
      }
    } else {
      if (!password) {
        throw new AppError(400, 'BAD_REQUEST', 'Password is required');
      }
      if (!user.password_hash) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Account requires SSO authentication');
      }
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }
    }

    const payload = {
      userId: user.id,
      organizationId: user.organization_id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = fastify.jwt.sign(payload, { expiresIn: '8h' });

    return reply.status(200).send({
      token,
      user: {
        id: user.id,
        organizationId: user.organization_id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  });

  fastify.post('/api/v1/auth/logout', { preHandler: [authenticate] }, async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      message: 'Session successfully terminated',
    });
  });

  fastify.get('/api/v1/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await db.findUserById(request.user.id);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Authenticated user not found');
    }

    return reply.status(200).send({
      data: {
        id: user.id,
        organizationId: user.organization_id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      permissions: ROLE_PERMISSIONS[user.role] || [],
    });
  });
};
