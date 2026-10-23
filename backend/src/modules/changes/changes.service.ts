import { db } from '../../db/index.js';
import { AppError } from '../../errors/AppError.js';
import { RiskScoringEngine } from '../../services/riskScorer.js';
import { ChangesRepository } from './changes.repository.js';
import { AnalyzeChangeBody, ChangeRecord, ListChangesQuery } from './changes.types.js';

export class ChangesService {
  public static async listChanges(orgId: string, query: ListChangesQuery) {
    const pageNum = query.page ? parseInt(query.page, 10) : 1;
    const limitNum = query.limit ? parseInt(query.limit, 10) : 20;

    const result = await ChangesRepository.list(orgId, {
      status: query.status,
      riskLevel: query.riskLevel,
      repository: query.repository,
      environment: query.environment,
      page: pageNum,
      limit: limitNum,
    });

    return {
      data: result.data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum) || 1,
      },
    };
  }

  public static async getChangeById(id: string, orgId: string): Promise<ChangeRecord> {
    const change = await ChangesRepository.findById(id, orgId);
    if (!change) {
      throw AppError.notFound(`Change with ID ${id}`);
    }
    return change;
  }

  public static async analyzeChange(
    body: AnalyzeChangeBody,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<ChangeRecord> {
    const { title, repository, authorName, files, sqlContent } = body;

    const analysis = RiskScoringEngine.analyze(
      {
        title,
        repository,
        author: {
          name: authorName || user.name,
          username: user.email.split('@')[0],
        },
        files,
        sqlContent,
      },
      db.getServices(),
      db.getDependencies(),
      db.getHistory()
    );

    const prNumber = Math.floor(2000 + Math.random() * 8000);
    const created = await ChangesRepository.create({
      organization_id: user.organizationId,
      number: prNumber,
      external_id: String(prNumber),
      title,
      type: 'PULL_REQUEST',
      author: {
        name: authorName || user.name,
        username: user.email.split('@')[0],
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

    return created;
  }

  public static async approveChange(id: string, userId: string, orgId: string) {
    const result = await ChangesRepository.approve(id, userId, orgId);
    if (!result) {
      throw AppError.notFound(`Change with ID ${id}`);
    }
    return result;
  }

  public static async rejectChange(id: string, orgId: string): Promise<ChangeRecord> {
    const rejected = await ChangesRepository.updateStatus(id, 'REJECTED', orgId);
    if (!rejected) {
      throw AppError.notFound(`Change with ID ${id}`);
    }
    return rejected;
  }
}
