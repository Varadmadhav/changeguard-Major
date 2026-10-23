import { FastifyPluginAsync } from 'fastify';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { AuthValidator } from './auth.validator.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/v1/auth/login',
    { preHandler: [validateBody(AuthValidator.validateLogin)] },
    AuthController.login as any
  );

  fastify.post(
    '/api/v1/auth/logout',
    { preHandler: [authenticate] },
    AuthController.logout
  );

  fastify.get(
    '/api/v1/auth/me',
    { preHandler: [authenticate] },
    AuthController.getMe
  );

  fastify.post(
    '/api/v1/auth/sso/callback',
    { preHandler: [validateBody(AuthValidator.validateSso)] },
    AuthController.ssoCallback as any
  );
};
