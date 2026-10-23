import 'fastify';
import '@fastify/jwt';

export interface RequestUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PLATFORM_ENGINEER' | 'SRE' | 'DEVELOPER' | 'APPROVER';
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: RequestUser;
    id: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      email: string;
      role: RequestUser['role'];
      organizationId: string;
      name: string;
    };
    user: RequestUser;
  }
}
