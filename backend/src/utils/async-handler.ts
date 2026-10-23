import { FastifyRequest, FastifyReply } from 'fastify';

export type AsyncRouteHandler<TRequest extends FastifyRequest = FastifyRequest, TReply extends FastifyReply = FastifyReply> = (
  req: TRequest,
  reply: TReply
) => Promise<any>;

/**
 * Async handler wrapper to ensure proper error forwarding in Fastify routes
 */
export function asyncHandler<TRequest extends FastifyRequest = FastifyRequest, TReply extends FastifyReply = FastifyReply>(
  fn: AsyncRouteHandler<TRequest, TReply>
): AsyncRouteHandler<TRequest, TReply> {
  return async (req: TRequest, reply: TReply) => {
    try {
      return await fn(req, reply);
    } catch (err) {
      throw err;
    }
  };
}
