import { DbChange } from '../../db/index.js';

export interface GovernanceApproveResult {
  data: DbChange;
  isFullyApproved: boolean;
  message: string;
}
