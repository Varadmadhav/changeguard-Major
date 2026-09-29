import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SimulationProvider } from './context/SimulationContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SimulationProvider>
        <AppRoutes />
      </SimulationProvider>
    </BrowserRouter>
  );
};

export default App;
