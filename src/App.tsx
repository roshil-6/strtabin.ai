import { Routes, Route } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import Dashboard from './components/Dashboard';
import Canvas from './components/Canvas';
import TimelineSection from './components/TimelineSection';
import TodoSection from './components/TodoSection';
import StrabView from './components/StrabView';
import CalendarView from './components/CalendarView';
import LandingPage from './components/LandingPage';
import FolderWorkflow from './components/FolderWorkflow';
import AuthGate from './components/AuthGate';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route path="/dashboard" element={<AuthGate><Dashboard /></AuthGate>} />
      <Route path="/folder-workflow/:folderId" element={<AuthGate><FolderWorkflow /></AuthGate>} />
      <Route path="/strategy/:id" element={<AuthGate><Canvas /></AuthGate>} />
      <Route path="/canvas/:id" element={<AuthGate><Canvas /></AuthGate>} />
      <Route path="/timeline/:id" element={<AuthGate><TimelineSection /></AuthGate>} />
      <Route path="/todo/:id" element={<AuthGate><TodoSection /></AuthGate>} />
      <Route path="/calendar/:id" element={<AuthGate><CalendarView /></AuthGate>} />
      <Route path="/calendar" element={<AuthGate><CalendarView /></AuthGate>} />
      <Route path="/strab/:id" element={<AuthGate><StrabView /></AuthGate>} />
    </Routes>
  );
}

export default App;
