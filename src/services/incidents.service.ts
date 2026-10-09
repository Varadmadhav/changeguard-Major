import { Incident } from '../types/incident';
import { mockIncidents } from '../data/mockIncidents';
import { apiClient } from './apiClient';

class IncidentsService {
  private incidents: Incident[] = [...mockIncidents];

  private isMockMode(): boolean {
    return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
  }

  async getIncidents(): Promise<Incident[]> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Incident[] }>('/incidents');
        return response.data;
      } catch (err) {
        console.warn('[IncidentsService] Failed to fetch incidents from API, falling back to mock:', err);
      }
    }
    return Promise.resolve([...this.incidents]);
  }

  async getIncidentById(id: string): Promise<Incident | undefined> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Incident }>(`/incidents/${id}`);
        return response.data;
      } catch (err) {
        console.warn(`[IncidentsService] Failed to fetch incident ${id} from API, falling back to mock:`, err);
      }
    }
    return Promise.resolve(
      this.incidents.find(
        inc =>
          inc.id === id ||
          inc.code.toLowerCase() === id.toLowerCase() ||
          inc.code.toLowerCase() === `inc-${id.toLowerCase()}`
      )
    );
  }

  async createIncidentFromSimulation(data: Partial<Incident>): Promise<Incident> {
    const newInc: Incident = {
      id: `inc-${Date.now()}`,
      code: `INC-${Math.floor(Math.random() * 900) + 100}`,
      title: data.title || 'Automated Incident Triggered',
      severity: 'SEV-2',
      status: 'INVESTIGATING',
      startedAt: 'Just now',
      durationFormatted: '1m',
      affectedServices: data.affectedServices || ['Checkout API'],
      relatedDeploymentId: data.relatedDeploymentId,
      relatedDeploymentVersion: data.relatedDeploymentVersion,
      relatedChangeId: data.relatedChangeId,
      relatedChangeTitle: data.relatedChangeTitle,
      rootCauseAnalysis: {
        summary: 'Error spike detected exceeding safety threshold.',
        triggerMechanism: 'Canary exposure anomaly.',
        failureContainedBy: 'ChangeGuard autonomous pause.',
        preventativeRecommendation: 'Review telemetry anomaly and rollback.',
      },
      metrics: {
        peakErrorRate: '3.7%',
        peakP95Latency: '840ms',
        impactedRequests: 1420,
        impactedUsers: 340,
      },
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: 'Threshold Breach Alert',
          description: 'Error rate jumped to 3.7%',
          actor: 'Policy Engine',
          isAutomatic: true,
          type: 'TRIGGER',
        },
      ],
      actionsTaken: ['Rollout paused at 42% exposure'],
    };
    this.incidents.unshift(newInc);
    return newInc;
  }
}

export const incidentsService = new IncidentsService();
