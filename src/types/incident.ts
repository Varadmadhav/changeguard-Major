export type IncidentSeverity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
export type IncidentStatus = 'TRIGGERED' | 'INVESTIGATING' | 'MITIGATING' | 'CONTAINED' | 'RESOLVED';

export interface IncidentTimelineItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  title: string;
  description: string;
  actor: string;
  isAutomatic: boolean;
  type: 'TRIGGER' | 'ACTION' | 'MITIGATION' | 'ROLLBACK' | 'RESOLVE';
}

export interface Incident {
  id: string;
  code: string; // e.g. "INC-482"
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string;
  durationFormatted: string;
  affectedServices: string[];
  relatedDeploymentId?: string;
  relatedDeploymentVersion?: string;
  relatedChangeId?: string;
  relatedChangeTitle?: string;
  rootCauseAnalysis: {
    summary: string;
    triggerMechanism: string;
    failureContainedBy: string;
    preventativeRecommendation: string;
  };
  metrics: {
    peakErrorRate: string;
    peakP95Latency: string;
    impactedRequests: number;
    impactedUsers: number;
  };
  timeline: IncidentTimelineItem[];
  actionsTaken: string[];
}
