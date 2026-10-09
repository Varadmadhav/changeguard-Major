import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { RiskScoringEngine } from '../services/riskScorer.js';

interface ListChangesQuery {
  status?: string;
  riskLevel?: string;
  repository?: string;
  environment?: string;
  page?: string;
  limit?: string;
}

interface AnalyzeChangeBody {
  title: string;
  repository: string;
  authorName?: string;
  files: Array<{
    filename: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  sqlContent?: string;
}

export const changeRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/changes - list changes with filters and pagination
  fastify.get<{ Querystring: ListChangesQuery }>(
    '/api/v1/changes',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { status, riskLevel, repository, environment, page, limit } = request.query;

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;

      const result = await db.listChanges(request.user.organizationId, {
        status,
        riskLevel,
        repository,
        environment,
        page: pageNum,
        limit: limitNum,
      });

      return reply.status(200).send({
        data: result.data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum) || 1,
        },
      });
    }
  );

  // GET /api/v1/changes/:id - get change detail with full risk analysis
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/changes/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const change = await db.getChangeById(id, request.user.organizationId);

      if (!change) {
        throw new AppError(404, 'CHANGE_NOT_FOUND', `Change with ID ${id} not found`);
      }

      return reply.status(200).send({
        data: change,
      });
    }
  );

  // POST /api/v1/changes/analyze - manually analyze a pull request
  fastify.post<{ Body: AnalyzeChangeBody }>(
    '/api/v1/changes/analyze',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { title, repository, authorName, files, sqlContent } = request.body || {};

      if (!title || !repository || !files || !Array.isArray(files)) {
        throw new AppError(400, 'BAD_REQUEST', 'Title, repository, and files array are required');
      }

      const analysis = RiskScoringEngine.analyze(
        {
          title,
          repository,
          author: {
            name: authorName || request.user.name,
            username: request.user.email.split('@')[0],
          },
          files,
          sqlContent,
        },
        db.getServices(),
        db.getDependencies(),
        db.getHistory()
      );

      const prNumber = Math.floor(2000 + Math.random() * 8000);
      const created = await db.createChange({
        organization_id: request.user.organizationId,
        number: prNumber,
        external_id: String(prNumber),
        title,
        type: 'PULL_REQUEST',
        author: {
          name: authorName || request.user.name,
          username: request.user.email.split('@')[0],
        },
        repository,
        branch: {
          source: 'feature-branch',
          target: 'main',
        },
        commitHash: 'b9c8d7e6f5',
        risk: {
          score: analysis.score,
          level: analysis.level,
          confidence: analysis.confidence,
          summary: analysis.summary,
          reasons: analysis.reasons,
          factors: analysis.factors,
        },
        analysis: analysis.analysis,
        impact: analysis.impact,
        historicalSimilarity: analysis.historicalSimilarity,
        policyRecommendation: analysis.policyRecommendation,
        filesChangedCount: files.length,
        additions: files.reduce((s, f) => s + f.additions, 0),
        deletions: files.reduce((s, f) => s + f.deletions, 0),
        status: analysis.score >= 70 ? 'AWAITING_REVIEW' : 'CANARY_RECOMMENDED',
        environment: 'PRODUCTION',
      });

      return reply.status(201).send({
        data: created,
        message: 'Change analyzed and registered successfully',
      });
    }
  );

  // POST /api/v1/changes/:id/approve - approve release policy recommendation
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/changes/:id/approve',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'APPROVER']),
      ],
    },
    async (request, reply) => {
      const { id } = request.params;
      const approved = await db.approveChange(id, request.user.id, request.user.organizationId);

      if (!approved) {
        throw new AppError(404, 'CHANGE_NOT_FOUND', `Change with ID ${id} not found`);
      }

      return reply.status(200).send({
        data: approved,
        message: 'Release policy recommendation approved successfully',
      });
    }
  );

  // POST /api/v1/changes/:id/reject - reject or block a change
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/changes/:id/reject',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'APPROVER']),
      ],
    },
    async (request, reply) => {
      const { id } = request.params;
      const rejected = await db.updateChangeStatus(id, 'REJECTED', request.user.organizationId);

      if (!rejected) {
        throw new AppError(404, 'CHANGE_NOT_FOUND', `Change with ID ${id} not found`);
      }

      return reply.status(200).send({
        data: rejected,
        message: 'Change rejected',
      });
    }
  );
};
