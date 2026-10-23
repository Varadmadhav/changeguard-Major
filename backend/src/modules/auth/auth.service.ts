import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { AppError } from '../../errors/AppError.js';
import { ROLE_PERMISSIONS } from '../../types/shared.js';
import { SamlService } from '../../services/saml.js';
import { LoginRequestBody, LoginResult, SsoLoginResult, CurrentUserResult } from './auth.types.js';

export class AuthService {
  public static async login(
    body: LoginRequestBody,
    jwtSign: FastifyInstance['jwt']['sign']
  ): Promise<LoginResult> {
    const { email, password, ssoToken } = body;

    if (!email) {
      throw AppError.badRequest('Email is required for authentication');
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (ssoToken) {
      if (user.sso_subject !== ssoToken) {
        throw new AppError(401, 'INVALID_SSO_TOKEN', 'SSO assertion verification failed');
      }
    } else {
      if (!password) {
        throw AppError.badRequest('Password is required');
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

    const token = jwtSign(payload, { expiresIn: '8h' });

    return {
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
    };
  }

  public static async getCurrentUser(userId: string): Promise<CurrentUserResult> {
    const user = await db.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Authenticated user not found');
    }

    return {
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
    };
  }

  public static async ssoCallback(
    samlResponse: string,
    jwtSign: FastifyInstance['jwt']['sign']
  ): Promise<SsoLoginResult> {
    const { user, isNewUser } = await SamlService.processSamlResponse(samlResponse);

    const payload = {
      userId: user.id,
      organizationId: user.organization_id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwtSign(payload, { expiresIn: '8h' });

    return {
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
      isNewUser,
    };
  }
}
