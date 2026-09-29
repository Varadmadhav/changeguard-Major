import React from 'react';
import { Navigate } from 'react-router-dom';

export const SettingsIndexPage: React.FC = () => {
  return <Navigate to="/settings/general" replace />;
};
