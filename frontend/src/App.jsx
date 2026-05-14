import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/landing/LandingPage';
import AppShell from './components/layout/AppShell';
import Dashboard from './components/dashboard/Dashboard';
import ExercisePage from './components/exercise/ExercisePage';
import PipelinePage from './components/pipeline/PipelinePage';
import { useGradient } from './hooks/useGradient';

function App() {
  useGradient();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/app" 
          element={
            <AppShell>
              <Dashboard />
            </AppShell>
          } 
        />
        <Route 
          path="/exercise" 
          element={
            <AppShell>
              <ExercisePage />
            </AppShell>
          } 
        />
        <Route 
          path="/pipeline" 
          element={
            <AppShell>
              <PipelinePage />
            </AppShell>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
