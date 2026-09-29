import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Deployment } from '../types/deployment';
import { Change, ChangeStatus } from '../types/change';
import { Incident } from '../types/incident';
import { AuditEvent } from '../types/audit';
import { mockDeployments } from '../data/mockDeployments';
import { mockChanges } from '../data/mockChanges';
import { mockIncidents } from '../data/mockIncidents';
import { mockAuditEvents } from '../data/mockAuditEvents';
import { auditService } from '../services/audit.service';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  timestamp: string;
  read: boolean;
  link?: string;
  actionText?: string;
}

interface SimulationContextType {
  deployments: Deployment[];
  changes: Change[];
  incidents: Incident[];
  auditEvents: AuditEvent[];
  notifications: AppNotification[];
  currentEnvironment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  setCurrentEnvironment: (env: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT') => void;
  isSimulatingFailure: boolean;
  
  // Actions
  simulateFailure: (deploymentId?: string) => void;
  promoteDeployment: (deploymentId: string) => Promise<void>;
  pauseDeployment: (deploymentId: string, reason?: string) => Promise<void>;
  rollbackDeployment: (deploymentId: string, reason?: string) => Promise<void>;
  approveChangePolicy: (changeId: string) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  resetSimulationDemo: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'HIGH RISK CHANGE DETECTED',
    message: 'PR #1824 (Optimize checkout query) has been classified as HIGH RISK (Score 78/100).',
    type: 'DANGER',
    timestamp: '10 min ago',
    read: false,
    link: '/changes/pr-1824',
    actionText: 'Review Change',
  },
  {
    id: 'notif-2',
    title: 'DEPLOYMENT PROMOTED',
    message: 'Search API v3.1 successfully reached 100% full production traffic.',
    type: 'SUCCESS',
    timestamp: '25 min ago',
    read: true,
    link: '/deployments/dep-search-310',
    actionText: 'View Deployment',
  },
  {
    id: 'notif-3',
    title: 'CANARY ADVANCED',
    message: 'Auth Service v1.9.2 safely reached 10% traffic stage with normal latency.',
    type: 'INFO',
    timestamp: '18 min ago',
    read: true,
    link: '/deployments/dep-auth-192',
    actionText: 'View Canary',
  },
];

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deployments, setDeployments] = useState<Deployment[]>([...mockDeployments]);
  const [changes, setChanges] = useState<Change[]>([...mockChanges]);
  const [incidents, setIncidents] = useState<Incident[]>([...mockIncidents]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([...mockAuditEvents]);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [currentEnvironment, setCurrentEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'DEVELOPMENT'>('PRODUCTION');
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const simulateFailure = (deploymentId: string = 'dep-checkout-284') => {
    setIsSimulatingFailure(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDeployments(prev =>
      prev.map(dep => {
        if (dep.id === deploymentId) {
          const updatedTelemetry = {
            ...dep.currentTelemetry,
            errorRate: 3.7,
            p95Latency: 840,
            cpuUtilization: 78,
          };

          const updatedSignals = dep.signals.map(s => {
            if (s.metricKey === 'http_error_rate') return { ...s, currentValue: 3.7, status: 'FAILED' as const };
            if (s.metricKey === 'p95_latency') return { ...s, currentValue: 840, status: 'FAILED' as const };
            if (s.metricKey === 'cpu_usage') return { ...s, currentValue: 78, status: 'WARNING' as const };
            return s;
          });

          const newTimelineItem = {
            id: `tl-${Date.now()}`,
            timestamp: new Date().toISOString(),
            timeFormatted: nowTime,
            title: 'CRITICAL: Error Rate Spiked to 3.7%',
            description: 'Threshold exceeded (< 1.0%). Autonomous policy triggered: Traffic paused at 42%.',
            type: 'DANGER' as const,
            actor: 'ChangeGuard Verification Engine',
          };

          return {
            ...dep,
            status: 'PAUSED',
            health: 'CRITICAL',
            pausedReason: 'Error rate (3.7%) exceeded production threshold (< 1.0%).',
            currentTelemetry: updatedTelemetry,
            signals: updatedSignals,
            timeline: [newTimelineItem, ...dep.timeline],
            telemetryHistory: [
              ...dep.telemetryHistory,
              {
                timestamp: nowTime,
                errorRate: 3.7,
                p95Latency: 840,
                requestsPerMinute: 13400,
                cpuUtilization: 78,
                memoryUtilization: 72,
                canaryTrafficPercentage: dep.currentTrafficPercentage,
              },
            ],
          };
        }
        return dep;
      })
    );

    // Add High Priority Notification
    addNotification({
      title: 'ROLLOUT AUTOMATICALLY PAUSED',
      message: 'Checkout API exceeded configured error threshold (3.7% > 1.0%). Traffic held at 42%.',
      type: 'DANGER',
      link: `/deployments/${deploymentId}`,
      actionText: 'Investigate & Rollback',
    });

    // Record in Audit Log
    const newAuditEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actor: { name: 'Policy Engine', type: 'POLICY_ENGINE' },
      action: 'DEPLOYMENT_PAUSED',
      actionTitle: 'Autonomous Rollout Pause Triggered',
      resource: { type: 'DEPLOYMENT', id: deploymentId, name: 'checkout-service (v2.8.4)' },
      result: 'WARNING',
      source: 'POLICY_ENGINE',
      details: 'Error rate jump (0.42% → 3.7%) breached Policy Rule #3 (< 1.0%). Progression paused.',
    };
    setAuditEvents(prev => [newAuditEvent, ...prev]);
  };

  const rollbackDeployment = async (deploymentId: string, reason: string = 'Error rate exceeded production threshold') => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDeployments(prev =>
      prev.map(dep => {
        if (dep.id === deploymentId) {
          const rolledBackTelemetry = {
            errorRate: 0.08,
            p95Latency: 160,
            requestsPerMinute: 12400,
            cpuUtilization: 44,
            memoryUtilization: 58,
          };

          const resetSignals = dep.signals.map(s => ({
            ...s,
            status: 'PASSED' as const,
            currentValue: s.metricKey === 'http_error_rate' ? 0.08 : s.metricKey === 'p95_latency' ? 160 : s.currentValue,
          }));

          const newTimelineItem = {
            id: `tl-${Date.now()}`,
            timestamp: new Date().toISOString(),
            timeFormatted: nowTime,
            title: `Automated Rollback to ${dep.previousVersion} Completed`,
            description: `Traffic immediately reverted to baseline ${dep.previousVersion}. Blast radius safely contained.`,
            type: 'DANGER' as const,
            actor: 'ChangeGuard Rollback Controller',
          };

          return {
            ...dep,
            status: 'ROLLED_BACK',
            health: 'HEALTHY',
            currentTrafficPercentage: 0,
            targetTrafficPercentage: 0,
            rollbackReason: reason,
            currentTelemetry: rolledBackTelemetry,
            signals: resetSignals,
            timeline: [newTimelineItem, ...dep.timeline],
            updatedAt: 'Just now',
            completedAt: 'Just now',
          };
        }
        return dep;
      })
    );

    setIsSimulatingFailure(false);

    // Add Notification
    addNotification({
      title: 'ROLLBACK EXECUTED SUCCESSFULLY',
      message: `Checkout Service safely rolled back to v2.8.3. Error rate normalized to 0.08%.`,
      type: 'INFO',
      link: `/deployments/${deploymentId}`,
      actionText: 'View Audit Details',
    });

    // Audit Log Entry
    const newAuditEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actor: { name: 'Alex Morgan', type: 'USER', email: 'alex.morgan@acme.com' },
      action: 'ROLLBACK_EXECUTED',
      actionTitle: 'Operator Triggered Rollback',
      resource: { type: 'DEPLOYMENT', id: deploymentId, name: 'checkout-service (v2.8.4 → v2.8.3)' },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Operator initiated rollback. Reason: ${reason}. Restored baseline traffic in 14s.`,
    };
    setAuditEvents(prev => [newAuditEvent, ...prev]);
  };

  const promoteDeployment = async (deploymentId: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDeployments(prev =>
      prev.map(dep => {
        if (dep.id === deploymentId) {
          const stages = dep.stages;
          const nextIdx = Math.min(dep.currentStageIndex + 1, stages.length - 1);
          const targetTraffic = stages[nextIdx];
          const isFull = targetTraffic === 100;

          const newTimelineItem = {
            id: `tl-${Date.now()}`,
            timestamp: new Date().toISOString(),
            timeFormatted: nowTime,
            title: isFull ? 'Deployment 100% Promoted' : `Promoted Traffic to ${targetTraffic}%`,
            description: isFull ? 'Full rollout reached successfully.' : `Advanced to stage ${nextIdx + 1} (${targetTraffic}%).`,
            type: 'SUCCESS' as const,
            actor: 'Alex Morgan (Operator)',
          };

          return {
            ...dep,
            currentTrafficPercentage: targetTraffic,
            targetTrafficPercentage: targetTraffic,
            currentStageIndex: nextIdx,
            status: isFull ? 'PROMOTED' : 'MONITORING',
            health: 'HEALTHY',
            timeline: [newTimelineItem, ...dep.timeline],
            updatedAt: 'Just now',
          };
        }
        return dep;
      })
    );

    addNotification({
      title: 'DEPLOYMENT PROMOTED',
      message: `Checkout Service canary promoted to next stage successfully.`,
      type: 'SUCCESS',
      link: `/deployments/${deploymentId}`,
      actionText: 'View Rollout',
    });

    const newAuditEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actor: { name: 'Alex Morgan', type: 'USER', email: 'alex.morgan@acme.com' },
      action: 'DEPLOYMENT_PROMOTED',
      actionTitle: 'Operator Promoted Canary Stage',
      resource: { type: 'DEPLOYMENT', id: deploymentId, name: 'checkout-service' },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: 'Operator confirmed verification telemetry and promoted canary traffic.',
    };
    setAuditEvents(prev => [newAuditEvent, ...prev]);
  };

  const pauseDeployment = async (deploymentId: string, reason: string = 'Operator manual pause') => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDeployments(prev =>
      prev.map(dep => {
        if (dep.id === deploymentId) {
          const newTimelineItem = {
            id: `tl-${Date.now()}`,
            timestamp: new Date().toISOString(),
            timeFormatted: nowTime,
            title: 'Deployment Paused by Operator',
            description: `Manual pause executed. Reason: ${reason}`,
            type: 'WARNING' as const,
            actor: 'Alex Morgan',
          };
          return {
            ...dep,
            status: 'PAUSED',
            health: 'WARNING',
            pausedReason: reason,
            timeline: [newTimelineItem, ...dep.timeline],
          };
        }
        return dep;
      })
    );

    addNotification({
      title: 'DEPLOYMENT PAUSED',
      message: `Checkout Service rollout paused manually by Alex Morgan.`,
      type: 'WARNING',
      link: `/deployments/${deploymentId}`,
      actionText: 'View Status',
    });
  };

  const approveChangePolicy = async (changeId: string) => {
    setChanges(prev =>
      prev.map(c => {
        if (c.id === changeId || c.id === `pr-${changeId}` || c.number === Number(changeId)) {
          return { ...c, status: 'APPROVED', updatedAt: 'Just now' };
        }
        return c;
      })
    );

    addNotification({
      title: 'RELEASE POLICY APPROVED',
      message: `PR #1824 policy recommendation approved for Canary Rollout.`,
      type: 'SUCCESS',
      link: '/deployments/dep-checkout-284',
      actionText: 'Open Control Room',
    });

    const newAuditEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actor: { name: 'Alex Morgan', type: 'USER', email: 'alex.morgan@acme.com' },
      action: 'APPROVAL_GRANTED',
      actionTitle: 'Approved High Risk Release Policy',
      resource: { type: 'CHANGE', id: changeId, name: 'PR #1824 (Optimize checkout query)' },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: 'Approved 4-stage Canary strategy with 10-minute verification window.',
    };
    setAuditEvents(prev => [newAuditEvent, ...prev]);
  };

  const resetSimulationDemo = () => {
    setDeployments([...mockDeployments]);
    setChanges([...mockChanges]);
    setIncidents([...mockIncidents]);
    setAuditEvents([...mockAuditEvents]);
    setNotifications(INITIAL_NOTIFICATIONS);
    setIsSimulatingFailure(false);
  };

  return (
    <SimulationContext.Provider
      value={{
        deployments,
        changes,
        incidents,
        auditEvents,
        notifications,
        currentEnvironment,
        setCurrentEnvironment,
        isSimulatingFailure,
        simulateFailure,
        promoteDeployment,
        pauseDeployment,
        rollbackDeployment,
        approveChangePolicy,
        markNotificationAsRead,
        clearAllNotifications,
        addNotification,
        resetSimulationDemo,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
