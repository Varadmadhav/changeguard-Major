import { DbChange } from '../../db/index.js';

export interface ListChangesQuery {
  status?: string;
  riskLevel?: string;
  repository?: string;
  environment?: string;
  page?: string;
  limit?: string;
}

export interface AnalyzeChangeBody {
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

export type ChangeRecord = DbChange;
