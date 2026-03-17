import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import Dashboard from './components/Dashboard';
import Canvas from './components/Canvas';
import TimelineSection from './components/TimelineSection';
import TodoSection from './components/TodoSection';
import StrabView from './components/StrabView';
import StrabHome from './components/StrabHome';
import CalendarView from './components/CalendarView';
import LandingPage from './components/LandingPage';
import FolderWorkflow from './components/FolderWorkflow';
import ReportsSelectPage from './components/ReportsSelectPage';
import AuthGate from './components/AuthGate';
import PaywallGate from './components/PaywallGate';
import ProjectBackground from './components/ProjectBackground';
import NotFoundPage from './components/NotFoundPage';

function App() {
  const { pathname } = useLocation();
  const isProjectRoute = pathname !== '/' && pathname !== '/sso-callback';
  const isStrategyRoute = pathname.startsWith('/strategy') || pathname.startsWith('/canvas');
  const isStrabRoute = pathname.startsWith('/strab');
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/folder-workflow');
  const isReportsRoute = pathname === '/reports';
  const showGrid = isProjectRoute && (isStrategyRoute || isStrabRoute || isDashboardRoute || isReportsRoute);

  return (
    <div className="min-h-screen w-full theme-page relative">
    {showGrid && <ProjectBackground />}
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route path="/dashboard" element={<AuthGate><PaywallGate><Dashboard /></PaywallGate></AuthGate>} />
      <Route path="/folder-workflow/:folderId" element={<AuthGate><PaywallGate><FolderWorkflow /></PaywallGate></AuthGate>} />
      <Route path="/strategy/:id" element={<AuthGate><PaywallGate><Canvas /></PaywallGate></AuthGate>} />
      <Route path="/canvas/:id" element={<AuthGate><PaywallGate><Canvas /></PaywallGate></AuthGate>} />
      <Route path="/timeline/:id" element={<AuthGate><PaywallGate><TimelineSection /></PaywallGate></AuthGate>} />
      <Route path="/todo/:id" element={<AuthGate><PaywallGate><TodoSection /></PaywallGate></AuthGate>} />
      <Route path="/calendar/:id" element={<AuthGate><PaywallGate><CalendarView /></PaywallGate></AuthGate>} />
      <Route path="/calendar" element={<AuthGate><PaywallGate><CalendarView /></PaywallGate></AuthGate>} />
      <Route path="/reports" element={<AuthGate><PaywallGate><ReportsSelectPage /></PaywallGate></AuthGate>} />
      <Route path="/strab" element={<AuthGate><PaywallGate><StrabHome /></PaywallGate></AuthGate>} />
      <Route path="/strab/:id" element={<AuthGate><PaywallGate><StrabView /></PaywallGate></AuthGate>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </div>
  );
}

export default App;

