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
import { deploymentsService } from '../services/deployments.service';
import { deploymentAuditAdapter } from '../services/audit.adapter';

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
  resumeDeployment: (deploymentId: string) => Promise<void>;
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

  // Initialize and load persistent deployment state from deploymentsService on mount
  useEffect(() => {
    let mounted = true;
    deploymentsService
      .getDeployments()
      .then(loaded => {
        if (mounted && loaded && loaded.length > 0) {
          setDeployments(loaded);
        }
      })
      .catch(() => {
        // Safe fallback to mockDeployments on any storage error
      });
    return () => {
      mounted = false;
    };
  }, []);

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

    // Delegate business logic & persistence to deploymentsService
    deploymentsService
      .simulateFailure(deploymentId)
      .then(updated => {
        if (updated) {
          setDeployments(prev => prev.map(d => (d.id === updated.id ? updated : d)));
        }
      })
      .catch(() => {
        // Fall back gracefully
      });

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
      resource: { type: 'DEPLOYMENT', id: deploymentId, name: 'checkout-service (v2.9.0)' },
      result: 'WARNING',
      source: 'POLICY_ENGINE',
      details: 'Error rate jump (0.42% → 3.7%) breached Policy Rule #3 (< 1.0%). Progression paused.',
    };
    setAuditEvents(prev => [newAuditEvent, ...prev]);
  };

  const rollbackDeployment = async (deploymentId: string, reason: string = 'Error rate exceeded production threshold') => {
    try {
      const rolledBack = await deploymentsService.rollbackDeployment(deploymentId, reason);
      if (rolledBack) {
        setDeployments(prev => prev.map(d => (d.id === rolledBack.id ? rolledBack : d)));
        setIsSimulatingFailure(false);

        // Add Notification
        addNotification({
          title: 'ROLLBACK EXECUTED SUCCESSFULLY',
          message: `${rolledBack.serviceName} safely rolled back to ${rolledBack.version}. Error rate normalized to ${rolledBack.currentTelemetry.errorRate}%.`,
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
          resource: { type: 'DEPLOYMENT', id: deploymentId, name: `${rolledBack.serviceName} (${rolledBack.version})` },
          result: 'SUCCESS',
          source: 'WEB_CONSOLE',
          details: `Operator initiated rollback. Reason: ${reason}. Restored baseline traffic in 14s.`,
        };
        setAuditEvents(prev => [newAuditEvent, ...prev]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'State transition forbidden or repository failure.';
      console.error(`Rollback failed for deployment ${deploymentId}:`, err);
      addNotification({
        title: 'ROLLBACK FAILED',
        message: `Rollback could not be executed: ${errorMsg}`,
        type: 'WARNING',
        link: `/deployments/${deploymentId}`,
      });
      throw err;
    }
  };

  const promoteDeployment = async (deploymentId: string) => {
    try {
      const updated = await deploymentsService.promoteDeployment(deploymentId);
      if (updated) {
        setDeployments(prev => prev.map(d => (d.id === updated.id ? updated : d)));

        addNotification({
          title: 'DEPLOYMENT PROMOTED',
          message: `${updated.serviceName} canary promoted to next stage successfully (${updated.currentTrafficPercentage}%).`,
          type: 'SUCCESS',
          link: `/deployments/${deploymentId}`,
          actionText: 'View Rollout',
        });

        const newAuditEvent: AuditEvent = {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: { name: 'Alex Morgan', type: 'USER', email: 'alex.morgan@acme.com' },
          action: 'DEPLOYMENT_PROMOTED',
          actionTitle: 'Operator Promoted Canary Stage',
          resource: { type: 'DEPLOYMENT', id: deploymentId, name: updated.serviceName },
          result: 'SUCCESS',
          source: 'WEB_CONSOLE',
          details: `Operator promoted canary traffic to stage ${updated.currentTrafficPercentage}%.`,
        };
        setAuditEvents(prev => [newAuditEvent, ...prev]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Canary promotion failed.';
      console.error(`Promotion failed for deployment ${deploymentId}:`, err);
      addNotification({
        title: 'PROMOTION FAILED',
        message: `Could not promote deployment: ${errorMsg}`,
        type: 'WARNING',
        link: `/deployments/${deploymentId}`,
      });
      throw err;
    }
  };

  const resumeDeployment = async (deploymentId: string) => {
    try {
      const updated = await deploymentsService.resumeDeployment(deploymentId);
      if (updated) {
        setDeployments(prev => prev.map(d => (d.id === updated.id ? updated : d)));

        addNotification({
          title: 'ROLLOUT RESUMED',
          message: `${updated.serviceName} rollout monitoring and progression resumed.`,
          type: 'SUCCESS',
          link: `/deployments/${deploymentId}`,
          actionText: 'View Rollout',
        });

        const newAuditEvent: AuditEvent = {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: { name: 'Alex Morgan', type: 'USER', email: 'alex.morgan@acme.com' },
          action: 'DEPLOYMENT_RESUMED' as any,
          actionTitle: 'Operator Resumed Rollout',
          resource: { type: 'DEPLOYMENT', id: deploymentId, name: updated.serviceName },
          result: 'SUCCESS',
          source: 'WEB_CONSOLE',
          details: 'Operator resumed rollout progression following pause inspection.',
        };
        setAuditEvents(prev => [newAuditEvent, ...prev]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Resume transition forbidden.';
      console.error(`Resume failed for deployment ${deploymentId}:`, err);
      addNotification({
        title: 'RESUME FAILED',
        message: `Could not resume deployment: ${errorMsg}`,
        type: 'WARNING',
        link: `/deployments/${deploymentId}`,
      });
      throw err;
    }
  };

  const pauseDeployment = async (deploymentId: string, reason: string = 'Operator manual pause') => {
    try {
      const updated = await deploymentsService.pauseDeployment(deploymentId, reason);
      if (updated) {
        setDeployments(prev => prev.map(d => (d.id === updated.id ? updated : d)));

        addNotification({
          title: 'DEPLOYMENT PAUSED',
          message: `${updated.serviceName} rollout paused manually by Alex Morgan.`,
          type: 'WARNING',
          link: `/deployments/${deploymentId}`,
          actionText: 'View Status',
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Pause transition forbidden.';
      console.error(`Pause failed for deployment ${deploymentId}:`, err);
      addNotification({
        title: 'PAUSE FAILED',
        message: `Could not pause deployment: ${errorMsg}`,
        type: 'WARNING',
        link: `/deployments/${deploymentId}`,
      });
      throw err;
    }
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
    deploymentsService
      .resetDeployments()
      .then(fresh => {
        setDeployments(fresh);
      })
      .catch(() => {
        setDeployments([...mockDeployments]);
      });
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
        resumeDeployment,
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
