export interface HistoricalRecord {
  id: string;
  prNumber: number;
  title: string;
  repository: string;
  files: string[];
  outcome: 'SUCCESSFUL' | 'ROLLBACK' | 'INCIDENT' | 'PAUSED';
  date: string;
  summary: string;
}

export interface SimilarityResult {
  id: string;
  prNumber: number;
  title: string;
  repository: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  outcome: 'SUCCESSFUL' | 'ROLLBACK' | 'INCIDENT' | 'PAUSED';
  similarityPercentage: number;
  date: string;
  summary: string;
}

// ponytail: initial similarity is Jaccard on changed file sets; no external embedding service or vector DB needed in Phase 2.
export class HistoricalSimilarityEngine {
  public static calculateJaccard(filesA: string[], filesB: string[]): number {
    if (!filesA.length || !filesB.length) return 0;

    const setA = new Set(filesA.map((f) => f.trim().toLowerCase()));
    const setB = new Set(filesB.map((f) => f.trim().toLowerCase()));

    let intersectionSize = 0;
    for (const file of setA) {
      if (setB.has(file)) {
        intersectionSize++;
      }
    }

    const unionSize = new Set([...setA, ...setB]).size;
    if (unionSize === 0) return 0;

    return Math.round((intersectionSize / unionSize) * 100);
  }

  public static findSimilarChanges(
    changedFiles: string[],
    history: HistoricalRecord[],
    minSimilarity = 30,
    limit = 3
  ): SimilarityResult[] {
    const scored = history
      .map((record) => {
        const similarityPercentage = this.calculateJaccard(changedFiles, record.files);
        let risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (record.outcome === 'ROLLBACK' || record.outcome === 'INCIDENT') {
          risk = similarityPercentage >= 60 ? 'CRITICAL' : 'HIGH';
        } else if (record.outcome === 'PAUSED') {
          risk = 'MEDIUM';
        }

        return {
          id: record.id,
          prNumber: record.prNumber,
          title: record.title,
          repository: record.repository,
          risk,
          outcome: record.outcome,
          similarityPercentage,
          date: record.date,
          summary: record.summary,
        };
      })
      .filter((res) => res.similarityPercentage >= minSimilarity)
      .sort((a, b) => b.similarityPercentage - a.similarityPercentage)
      .slice(0, limit);

    return scored;
  }
}
