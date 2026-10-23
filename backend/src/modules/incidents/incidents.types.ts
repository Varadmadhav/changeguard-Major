import { Incident, IncidentStatus, IncidentSeverity } from '../../types/shared.js';

export interface ListIncidentsQuery {
  severity?: string;
  status?: string;
}

export interface CreateIncidentBody {
  title: string;
  severity?: IncidentSeverity;
  affectedServices?: string[];
  relatedDeploymentId?: string;
  relatedChangeId?: string;
  rca_summary?: string;
}

export interface UpdateStatusBody {
  status: IncidentStatus;
  comment?: string;
}

export interface UpdateRcaBody {
  summary?: string;
  triggerMechanism?: string;
  failureContainedBy?: string;
  preventativeRecommendation?: string;
}

export type IncidentRecord = Incident;
