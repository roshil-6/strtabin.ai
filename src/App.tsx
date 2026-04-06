import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import Dashboard from './components/Dashboard';
import Canvas from './components/Canvas';
import TimelineSection from './components/TimelineSection';
import TodoSection from './components/TodoSection';
import StrabView from './components/StrabView';
import StrabHome from './components/StrabHome';
import CalendarView from './components/CalendarView';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import FeaturesPage from './components/FeaturesPage';
import FolderWorkflow from './components/FolderWorkflow';
import ReportsSelectPage from './components/ReportsSelectPage';
import WorkspacePage from './components/WorkspacePage';
import JoinWorkspacePage from './components/JoinWorkspacePage';
import ProfilePage from './components/ProfilePage';
import CommunityPage from './components/CommunityPage';
import AuthGate from './components/AuthGate';
import UserSyncOnLoad from './components/UserSyncOnLoad';
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
    <UserSyncOnLoad />
    {showGrid && <ProjectBackground />}
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route path="/dashboard" element={<AuthGate><Dashboard /></AuthGate>} />
      <Route path="/folder-workflow/:folderId" element={<AuthGate><FolderWorkflow /></AuthGate>} />
      <Route path="/strategy/:id" element={<AuthGate><Canvas /></AuthGate>} />
      <Route path="/canvas/:id" element={<AuthGate><Canvas /></AuthGate>} />
      <Route path="/timeline/:id" element={<AuthGate><TimelineSection /></AuthGate>} />
      <Route path="/todo/:id" element={<AuthGate><TodoSection /></AuthGate>} />
      <Route path="/calendar/:id" element={<AuthGate><CalendarView /></AuthGate>} />
      <Route path="/calendar" element={<AuthGate><CalendarView /></AuthGate>} />
      <Route path="/reports" element={<AuthGate><ReportsSelectPage /></AuthGate>} />
      <Route path="/strab" element={<AuthGate><StrabHome /></AuthGate>} />
      <Route path="/strab/:id" element={<AuthGate><StrabView /></AuthGate>} />
      <Route path="/workspace/:id" element={<AuthGate><WorkspacePage /></AuthGate>} />
      <Route path="/join/:id" element={<AuthGate><JoinWorkspacePage /></AuthGate>} />
      <Route path="/feed" element={<Navigate to="/community" replace />} />
      <Route path="/community" element={<AuthGate><CommunityPage /></AuthGate>} />
      <Route path="/profile/:username" element={<ProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </div>
  );
}

export default App;

