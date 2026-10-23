import crypto from 'node:crypto';
import { db } from '../../db/index.js';
import { AppError } from '../../errors/AppError.js';
import { RiskScoringEngine } from '../../services/riskScorer.js';
import { WebhookResponse } from './webhook.types.js';

const seenDeliveryIds = new Set<string>();

export class WebhookService {
  public static verifySignature(rawPayload: string, signature: string, secret: string) {
    if (!signature) return;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = `sha256=${hmac.update(rawPayload).digest('hex')}`;

    const sigBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    if (sigBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(sigBuffer, digestBuffer)) {
      throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'HMAC-SHA256 signature verification failed');
    }
  }

  public static isDuplicateDelivery(deliveryId?: string): boolean {
    if (!deliveryId) return false;
    if (seenDeliveryIds.has(deliveryId)) return true;
    seenDeliveryIds.add(deliveryId);
    return false;
  }

  public static async processGithubWebhook(
    event: string,
    payload: Record<string, any>
  ): Promise<WebhookResponse> {
    if (event !== 'pull_request') {
      return { status: 'unhandled_event', event };
    }

    const pr = payload.pull_request || payload;
    const action = payload.action || 'opened';

    if (['closed', 'locked'].includes(action)) {
      return { status: 'ignored', action };
    }

    const repoName = payload.repository?.full_name || pr.head?.repo?.full_name || 'acme/checkout-service';
    const prNumber = pr.number || Math.floor(1000 + Math.random() * 9000);
    const title = pr.title || 'Automated Feature Update';

    const files: Array<{ filename: string; additions: number; deletions: number; patch?: string }> =
      payload.files || [
        { filename: 'src/services/checkout.ts', additions: 15, deletions: 2 },
        { filename: 'src/config/gateway.ts', additions: 8, deletions: 1 },
      ];

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

    return {
      status: 'processed',
      changeId: createdChange.id,
      number: createdChange.number,
      riskScore: createdChange.risk.score,
      riskLevel: createdChange.risk.level,
      statusCheckUrl: `https://github.com/${repoName}/pull/${prNumber}/checks`,
    };
  }
}
