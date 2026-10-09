import { SqlHazardDetector } from './sqlHazardDetector.js';
import { BlastRadiusAnalyzer, DependencyEdge, ServiceNode } from './blastRadius.js';
import { HistoricalRecord, HistoricalSimilarityEngine } from './historicalSimilarity.js';

export interface ChangeAnalysisInput {
  title: string;
  repository: string;
  author: {
    name: string;
    username: string;
    isAiAgent?: boolean;
  };
  files: {
    filename: string;
    additions: number;
    deletions: number;
    patch?: string;
  }[];
  sqlContent?: string;
  hasCiTests?: boolean;
  serviceId?: string;
}

export interface RiskFactorItem {
  id: string;
  name: string;
  score: number;
  weight: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details: string[];
}

export interface FullRiskAnalysisOutput {
  score: number; // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-100
  summary: string;
  reasons: string[];
  factors: RiskFactorItem[];
  analysis: {
    overview: string;
    technicalDetails: string;
    identifiedRisks: string[];
    recommendedVerification: string;
    generatedAt: string;
  };
  impact: ReturnType<typeof BlastRadiusAnalyzer.calculate>;
  historicalSimilarity: ReturnType<typeof HistoricalSimilarityEngine.findSimilarChanges>;
  policyRecommendation: {
    strategy: 'CANARY' | 'BLUE_GREEN' | 'ROLLING' | 'STAGED';
    stages: number[];
    verificationWindowMinutes: number;
    requiredSignals: {
      name: string;
      metric: string;
      operator: '<' | '>' | '<=' | '>=';
      threshold: string;
      targetValue: string;
    }[];
    humanApprovalRequired: boolean;
    approvalReason?: string;
    suggestedAction: 'APPROVE_POLICY' | 'MODIFY_POLICY' | 'BLOCK';
  };
}

export class RiskScoringEngine {
  public static analyze(
    input: ChangeAnalysisInput,
    serviceNodes: Map<string, ServiceNode>,
    dependencies: DependencyEdge[],
    history: HistoricalRecord[]
  ): FullRiskAnalysisOutput {
    const fileNames = input.files.map((f) => f.filename);
    const totalAdditions = input.files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = input.files.reduce((sum, f) => sum + f.deletions, 0);
    const totalFiles = input.files.length;

    // Stage 2: Diff Feature Extraction
    const isSecuritySensitive = fileNames.some((f) =>
      /\b(auth|secrets|cert|ssl|crypto|token|jwt|rbac|credentials)\b/i.test(f)
    );
    const hasTestFiles = fileNames.some((f) => /\b(test|spec|__tests__)\b/i.test(f));
    const hasSqlMigration = fileNames.some((f) => /\.sql$|\/migrations\//i.test(f)) || !!input.sqlContent;

    // Stage 3: SQL / DDL Hazard Detection
    const sqlText = input.sqlContent || input.files.filter((f) => /\.sql$/i.test(f.filename)).map((f) => f.patch || '').join('\n');
    const sqlAnalysis = SqlHazardDetector.analyzeSql(sqlText);

    // Stage 4: Blast Radius Features
    const serviceId = input.serviceId || 'svc-checkout-01';
    const impact = BlastRadiusAnalyzer.calculate(serviceId, serviceNodes, dependencies);

    // Stage 5: Historical Similarity
    const historicalSimilarity = HistoricalSimilarityEngine.findSimilarChanges(fileNames, history);

    // Stage 6: Risk Factor Aggregation
    const factors: RiskFactorItem[] = [];

    // Factor 1: Database Migration Risk
    const dbFactorScore = hasSqlMigration ? sqlAnalysis.hazardScore : 5;
    factors.push({
      id: 'factor-db',
      name: 'Database Migration Risk',
      score: dbFactorScore,
      weight: 'CRITICAL',
      description: sqlAnalysis.summary,
      details: sqlAnalysis.hazards.length > 0
        ? sqlAnalysis.hazards.map((h) => `${h.statement}: ${h.description}`)
        : hasSqlMigration
        ? ['Migration modifies schema with backward-compatible defaults.']
        : ['No DDL or schema alterations detected.'],
    });

    // Factor 2: Blast Radius
    factors.push({
      id: 'factor-blast',
      name: 'Dependency & Blast Radius',
      score: impact.overallScore,
      weight: 'HIGH',
      description: `Propagates across ${impact.servicesCount} services and ${impact.databasesCount} database(s).`,
      details: impact.affectedServices.map(
        (s) => `${s.name} (${s.tier}) - ${s.relationship} connection (score: ${s.blastRadiusScore})`
      ),
    });

    // Factor 3: Size & Complexity
    let sizeScore = 15;
    if (totalFiles > 15 || totalAdditions + totalDeletions > 800) {
      sizeScore = 80;
    } else if (totalFiles > 8 || totalAdditions + totalDeletions > 300) {
      sizeScore = 55;
    } else if (totalFiles > 3 || totalAdditions + totalDeletions > 100) {
      sizeScore = 35;
    }

    factors.push({
      id: 'factor-size',
      name: 'Change Size & Scope',
      score: sizeScore,
      weight: 'MEDIUM',
      description: `${totalFiles} file(s) changed (+${totalAdditions} / -${totalDeletions} lines).`,
      details: [
        `File count: ${totalFiles}`,
        `Line churn: ${totalAdditions + totalDeletions}`,
        totalFiles > 10 ? 'High diff surface area increases review oversight risk.' : 'Moderate surface area.',
      ],
    });

    // Factor 4: Security & Configuration
    const secScore = isSecuritySensitive ? 85 : 10;
    factors.push({
      id: 'factor-sec',
      name: 'Security & Auth Sensitivity',
      score: secScore,
      weight: 'HIGH',
      description: isSecuritySensitive
        ? 'Modifications to security-critical authentication, crypto, or session controls.'
        : 'No sensitive credentials or cryptographic boundaries modified.',
      details: isSecuritySensitive
        ? fileNames.filter((f) => /\b(auth|secrets|cert|ssl|crypto|token|jwt|rbac|credentials)\b/i.test(f))
        : ['Standard application logic files only.'],
    });

    // Factor 5: Historical Failure Correlation
    let histScore = 20;
    if (historicalSimilarity.some((h) => h.outcome === 'ROLLBACK' || h.outcome === 'INCIDENT')) {
      const topMatch = historicalSimilarity.find((h) => h.outcome === 'ROLLBACK' || h.outcome === 'INCIDENT');
      histScore = Math.min(95, Math.round((topMatch?.similarityPercentage || 50) * 1.1));
    }
    factors.push({
      id: 'factor-hist',
      name: 'Historical Regression Correlation',
      score: histScore,
      weight: 'HIGH',
      description: historicalSimilarity.length > 0
        ? `Matched ${historicalSimilarity.length} past change(s) with similar file footprint.`
        : 'No correlated historical incidents or rollbacks on this file set.',
      details: historicalSimilarity.map(
        (h) => `PR #${h.prNumber} (${h.outcome}) - ${h.similarityPercentage}% overlap: ${h.title}`
      ),
    });

    // Factor 6: Test Coverage Signal
    const testScore = hasTestFiles ? 10 : input.hasCiTests === false ? 85 : 60;
    factors.push({
      id: 'factor-test',
      name: 'Verification & Test Signal',
      score: testScore,
      weight: 'MEDIUM',
      description: hasTestFiles
        ? 'Automated test suite files included in pull request.'
        : 'No companion unit or integration tests detected in the change changeset.',
      details: hasTestFiles
        ? ['Test files modified or added.']
        : ['Missing companion automated tests increases deployment regression risk.'],
    });

    // Compute composite score using weights
    // Weights: CRITICAL=35%, HIGH=20%, MEDIUM=15%
    let totalWeight = 0;
    let weightedSum = 0;
    for (const f of factors) {
      const w = f.weight === 'CRITICAL' ? 35 : f.weight === 'HIGH' ? 20 : 15;
      weightedSum += f.score * w;
      totalWeight += w;
    }
    let compositeScore = Math.round(weightedSum / totalWeight);

    // Hard rules / boundaries
    if (sqlAnalysis.hazards.some((h) => h.severity === 'CRITICAL')) {
      compositeScore = Math.max(compositeScore, 92); // Destructive DDL mandates CRITICAL
    } else if (hasSqlMigration && sqlAnalysis.hazards.some((h) => h.severity === 'HIGH')) {
      compositeScore = Math.max(compositeScore, 75); // High DDL mandates HIGH
    }

    let level: FullRiskAnalysisOutput['level'] = 'LOW';
    if (compositeScore >= 90) level = 'CRITICAL';
    else if (compositeScore >= 70) level = 'HIGH';
    else if (compositeScore >= 40) level = 'MEDIUM';

    // Stage 7: Confidence estimation
    let confidence = 40;
    if (totalFiles > 0) confidence += 20;
    if (dependencies.length > 0) confidence += 15;
    if (history.length > 0) confidence += 15;
    if (input.author.name) confidence += 9;
    confidence = Math.min(99, confidence);

    // Stage 8: Release Policy Recommendation
    let strategy: FullRiskAnalysisOutput['policyRecommendation']['strategy'] = 'CANARY';
    let stages = [5, 25, 50, 100];
    let windowMin = 10;
    let humanApproval = true;
    let suggestedAction: FullRiskAnalysisOutput['policyRecommendation']['suggestedAction'] = 'APPROVE_POLICY';

    if (level === 'CRITICAL') {
      strategy = 'CANARY';
      stages = [5, 15, 50, 100];
      windowMin = 15;
      humanApproval = true;
      suggestedAction = sqlAnalysis.hazards.some((h) => h.severity === 'CRITICAL') ? 'BLOCK' : 'APPROVE_POLICY';
    } else if (level === 'HIGH') {
      strategy = 'CANARY';
      stages = [5, 25, 50, 100];
      windowMin = 10;
      humanApproval = true;
      suggestedAction = 'APPROVE_POLICY';
    } else if (level === 'MEDIUM') {
      strategy = 'CANARY';
      stages = [10, 50, 100];
      windowMin = 5;
      humanApproval = false;
      suggestedAction = 'APPROVE_POLICY';
    } else {
      strategy = 'STAGED';
      stages = [20, 50, 100];
      windowMin = 3;
      humanApproval = false;
      suggestedAction = 'APPROVE_POLICY';
    }

    const reasons: string[] = [];
    if (sqlAnalysis.hazards.length > 0) {
      reasons.push(sqlAnalysis.summary);
    }
    if (isSecuritySensitive) {
      reasons.push('Touches sensitive security/authentication boundaries.');
    }
    if (impact.overallScore >= 70) {
      reasons.push(`High blast radius touching ${impact.servicesCount} services.`);
    }
    if (!hasTestFiles) {
      reasons.push('No regression test files were updated.');
    }
    if (reasons.length === 0) {
      reasons.push('Low-risk application update with verified regression safeguards.');
    }

    return {
      score: compositeScore,
      level,
      confidence,
      summary: `Evaluated risk score of ${compositeScore}/100 (${level}) with ${confidence}% confidence across ${totalFiles} files.`,
      reasons,
      factors,
      analysis: {
        overview: `ChangeGuard automated change analysis for ${input.repository}: ${input.title}.`,
        technicalDetails: `Identified ${totalFiles} changed file(s) with ${totalAdditions} additions and ${totalDeletions} deletions. Analyzed SQL migration footprint, dependency blast radius, and historical regression telemetry.`,
        identifiedRisks: reasons,
        recommendedVerification: `Mandate progressive ${strategy} rollout with ${windowMin}-minute verification windows monitoring P95 latency and error rate.`,
        generatedAt: new Date().toISOString(),
      },
      impact,
      historicalSimilarity,
      policyRecommendation: {
        strategy,
        stages,
        verificationWindowMinutes: windowMin,
        requiredSignals: [
          {
            name: 'Canary HTTP Error Rate',
            metric: 'http_error_rate_pct',
            operator: '<',
            threshold: '1.0%',
            targetValue: '0.05%',
          },
          {
            name: 'P95 Transaction Latency',
            metric: 'p95_latency_ms',
            operator: '<=',
            threshold: '250ms',
            targetValue: '180ms',
          },
          {
            name: 'PostgreSQL Active Lock Count',
            metric: 'pg_active_locks',
            operator: '<=',
            threshold: '15',
            targetValue: '2',
          },
        ],
        humanApprovalRequired: humanApproval,
        approvalReason: humanApproval
          ? `Change classified as ${level} risk (score ${compositeScore}/100) requiring Platform/SRE approval before deployment.`
          : undefined,
        suggestedAction,
      },
    };
  }
}
