import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { RiskScoringEngine } from '../services/riskScorer.js';

// Deduplication store for delivery IDs (Redis in prod, Set in memory)
const seenDeliveryIds = new Set<string>();

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Webhook secret for HMAC-SHA256 signature verification
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'changeguard_dev_webhook_secret_key';

  fastify.post('/api/v1/webhook/github', async (request, reply) => {
    const deliveryId = (request.headers['x-github-delivery'] as string) || '';
    const signature = (request.headers['x-hub-signature-256'] as string) || '';
    const event = (request.headers['x-github-event'] as string) || 'pull_request';

    // 1. Signature verification
    if (signature) {
      const rawPayload = JSON.stringify(request.body);
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = `sha256=${hmac.update(rawPayload).digest('hex')}`;

      // Constant-time comparison
      const sigBuffer = Buffer.from(signature);
      const digestBuffer = Buffer.from(digest);
      if (sigBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(sigBuffer, digestBuffer)) {
        throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'HMAC-SHA256 signature verification failed');
      }
    }

    // 2. Deduplication check
    if (deliveryId) {
      if (seenDeliveryIds.has(deliveryId)) {
        return reply.status(200).send({
          status: 'ignored',
          message: 'Duplicate delivery ID acknowledged',
          deliveryId,
        });
      }
      seenDeliveryIds.add(deliveryId);
    }

    const payload = request.body as Record<string, any>;

    // Handle pull_request events
    if (event === 'pull_request') {
      const pr = payload.pull_request || payload;
      const action = payload.action || 'opened';

      // Ignore closed / unhandled events
      if (['closed', 'locked'].includes(action)) {
        return reply.status(200).send({ status: 'ignored', action });
      }

      const repoName = payload.repository?.full_name || pr.head?.repo?.full_name || 'acme/checkout-service';
      const prNumber = pr.number || Math.floor(1000 + Math.random() * 9000);
      const title = pr.title || 'Automated Feature Update';

      // Extract changed files if present in payload
      const files: Array<{ filename: string; additions: number; deletions: number; patch?: string }> =
        payload.files || [
          { filename: 'src/services/checkout.ts', additions: 15, deletions: 2 },
          { filename: 'src/config/gateway.ts', additions: 8, deletions: 1 },
        ];

      // Run risk scoring engine
      const analysisOutput = RiskScoringEngine.analyze(
        {
          title,
          repository: repoName,
          author: {
            name: pr.user?.login || 'developer',
            username: pr.user?.login || 'developer',
            isAiAgent: false,
          },
          files,
          sqlContent: payload.sqlContent,
        },
        db.getServices(),
        db.getDependencies(),
        db.getHistory()
      );

      // Create new change record
      const orgId = 'org-acme-primary-01';
      const createdChange = await db.createChange({
        organization_id: orgId,
        number: prNumber,
        external_id: String(prNumber),
        title,
        type: 'PULL_REQUEST',
        author: {
          name: pr.user?.name || pr.user?.login || 'Developer',
          username: pr.user?.login || 'developer',
          avatar: pr.user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          isAiAgent: false,
        },
        repository: repoName,
        branch: {
          source: pr.head?.ref || 'feature-branch',
          target: pr.base?.ref || 'main',
        },
        commitHash: pr.head?.sha?.slice(0, 10) || 'a1b2c3d4e5',
        risk: {
          score: analysisOutput.score,
          level: analysisOutput.level,
          confidence: analysisOutput.confidence,
          summary: analysisOutput.summary,
          reasons: analysisOutput.reasons,
          factors: analysisOutput.factors,
        },
        analysis: analysisOutput.analysis,
        impact: analysisOutput.impact,
        historicalSimilarity: analysisOutput.historicalSimilarity,
        policyRecommendation: analysisOutput.policyRecommendation,
        filesChangedCount: files.length,
        additions: files.reduce((s, f) => s + f.additions, 0),
        deletions: files.reduce((s, f) => s + f.deletions, 0),
        status: analysisOutput.score >= 70 ? 'AWAITING_REVIEW' : 'CANARY_RECOMMENDED',
        environment: 'PRODUCTION',
      });

      return reply.status(200).send({
        status: 'processed',
        changeId: createdChange.id,
        number: createdChange.number,
        riskScore: createdChange.risk.score,
        riskLevel: createdChange.risk.level,
        statusCheckUrl: `https://github.com/${repoName}/pull/${prNumber}/checks`,
      });
    }

    return reply.status(200).send({ status: 'unhandled_event', event });
  });
};
