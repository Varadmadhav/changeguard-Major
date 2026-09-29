import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../pages/Dashboard';
import { ChangesPage } from '../pages/Changes';
import { ChangeDetailPage } from '../pages/ChangeDetail';
import { DeploymentsPage } from '../pages/Deployments';
import { DeploymentDetailPage } from '../pages/DeploymentDetail';
import { ServicesPage } from '../pages/Services';
import { ServiceDetailPage } from '../pages/ServiceDetail';
import { IncidentsPage } from '../pages/Incidents';
import { IncidentDetailPage } from '../pages/IncidentDetail';
import { ImpactGraphPage } from '../pages/ImpactGraph';
import { PoliciesPage } from '../pages/Policies';
import { AnalyticsPage } from '../pages/Analytics';
import { IntegrationsPage } from '../pages/Integrations';
import { AuditLogPage } from '../pages/AuditLog';
import { SettingsLayout } from '../components/settings/SettingsLayout';
import { SettingsIndexPage } from '../pages/Settings';
import { GeneralSettings } from '../pages/Settings/GeneralSettings';
import { TeamSettings } from '../pages/Settings/TeamSettings';
import { SecuritySettings } from '../pages/Settings/SecuritySettings';
import { EnvironmentSettings } from '../pages/Settings/EnvironmentSettings';
import { NotificationSettings } from '../pages/Settings/NotificationSettings';
import { AiSettings } from '../pages/Settings/AiSettings';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        {/* Default route */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Core Dashboard */}
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Change Intelligence */}
        <Route path="changes" element={<ChangesPage />} />
        <Route path="changes/:id" element={<ChangeDetailPage />} />

        {/* Deployment Safety Control Room */}
        <Route path="deployments" element={<DeploymentsPage />} />
        <Route path="deployments/:id" element={<DeploymentDetailPage />} />

        {/* Services Catalog */}
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:id" element={<ServiceDetailPage />} />

        {/* Incidents & Postmortems */}
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />

        {/* Impact Graph & Blast Radius */}
        <Route path="impact-graph" element={<ImpactGraphPage />} />

        {/* Release Policies */}
        <Route path="policies" element={<PoliciesPage />} />

        {/* DORA & Calibration Analytics */}
        <Route path="analytics" element={<AnalyticsPage />} />

        {/* Integrations */}
        <Route path="integrations" element={<IntegrationsPage />} />

        {/* Audit Log */}
        <Route path="audit-log" element={<AuditLogPage />} />

        {/* Settings Sub-routes */}
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<SettingsIndexPage />} />
          <Route path="general" element={<GeneralSettings />} />
          <Route path="team" element={<TeamSettings />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="environments" element={<EnvironmentSettings />} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="ai" element={<AiSettings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
