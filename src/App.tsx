import { BUILT_IN_AI_ENABLED } from './lib/featureFlags';
import { lazy, Suspense } from 'react';
import ProjectPage from './components/ProjectPage';
import ProjectSync from './components/ProjectSync';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
const PersonalAssistant = lazy(() => import('./components/PersonalAssistant'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const Canvas = lazy(() => import('./components/Canvas'));
const TimelineSection = lazy(() => import('./components/TimelineSection'));
const TimetablePage = lazy(() => import('./components/TimetablePage'));
const TodoSection = lazy(() => import('./components/TodoSection'));
const AIWorkspaceHome = lazy(() => import('./components/AIWorkspaceHome'));
const PersonalAIWorkspace = lazy(() => import('./components/PersonalAIWorkspace'));
const StrabView = lazy(() => import('./components/StrabView'));
const StrabHome = lazy(() => import('./components/StrabHome'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const FeaturesPage = lazy(() => import('./components/FeaturesPage'));
const ReportsSelectPage = lazy(() => import('./components/ReportsSelectPage'));
const WorkspacePage = lazy(() => import('./components/WorkspacePage'));
const JoinWorkspacePage = lazy(() => import('./components/JoinWorkspacePage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const CommunityPage = lazy(() => import('./components/CommunityPage'));
import PushAccountGuard from './components/PushAccountGuard';
import AuthGate from './components/AuthGate';
import UserSyncOnLoad from './components/UserSyncOnLoad';
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
import GlobalModals from './components/GlobalModals';
const ProjectOverview = lazy(() => import('./components/ProjectOverview'));

function PersonalAIRedirect() {
  const { id } = useParams();
  const location = useLocation();
  return <Navigate to={id ? `/ai/${id}${location.search}` : '/dashboard'} replace state={location.state} />;
}
function CodeRedirect() {
  const { id } = useParams();
  const location = useLocation();
  return <Navigate to={id ? `/strategy/${id}` : '/dashboard'} replace state={location.state} />;
}
function App() {

  return (
    <div className="min-h-[100dvh] w-full theme-page relative">
    <GlobalModals />
    <PushAccountGuard />
    <UserSyncOnLoad />
    <ProjectSync />
    <Suspense fallback={<div role="status" className="min-h-[100dvh] theme-page flex items-center justify-center text-[var(--text-muted)]">Opening workspace…</div>}>
    <PersonalAssistant />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/sign-up" element={<AuthPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route path="/dashboard" element={<AuthGate><Dashboard /></AuthGate>} />
      <Route path="/billing" element={<AuthGate><BillingPage /></AuthGate>} />
      <Route path="/project/:id" element={<AuthGate><ProjectPage><ProjectOverview /></ProjectPage></AuthGate>} />
      <Route path="/flow-creator" element={<Navigate to="/dashboard" replace />} />
      <Route path="/folder-workflow/:folderId" element={<Navigate to="/dashboard" replace />} />
      <Route path="/strategy/:id" element={<AuthGate><ProjectPage><Canvas /></ProjectPage></AuthGate>} />
      <Route path="/canvas/:id" element={<AuthGate><ProjectPage><Canvas /></ProjectPage></AuthGate>} />
      <Route path="/timeline/:id" element={<AuthGate><ProjectPage><TimelineSection /></ProjectPage></AuthGate>} />
      <Route path="/todo/:id" element={<AuthGate><ProjectPage><TodoSection /></ProjectPage></AuthGate>} />
      <Route path="/calendar/:id" element={<AuthGate><ProjectPage><CalendarView /></ProjectPage></AuthGate>} />
      <Route path="/timetable" element={<AuthGate><TimetablePage /></AuthGate>} />
      <Route path="/timetable/:id" element={<AuthGate><ProjectPage><TimetablePage /></ProjectPage></AuthGate>} />
      <Route path="/calendar" element={<AuthGate><CalendarView /></AuthGate>} />
      <Route path="/reports" element={<AuthGate><ReportsSelectPage /></AuthGate>} />
      <Route path="/strab" element={BUILT_IN_AI_ENABLED ? <AuthGate><StrabHome /></AuthGate> : <PersonalAIRedirect />} />
      <Route path="/ai" element={<AuthGate><AIWorkspaceHome /></AuthGate>} />
      <Route path="/ai/:id" element={<AuthGate><ProjectPage><PersonalAIWorkspace /></ProjectPage></AuthGate>} />
      <Route path="/strab/:id" element={BUILT_IN_AI_ENABLED ? <AuthGate><ProjectPage><StrabView /></ProjectPage></AuthGate> : <PersonalAIRedirect />} />
      <Route path="/code/:id" element={<AuthGate><CodeRedirect /></AuthGate>} />
      <Route path="/workspace/:id" element={<AuthGate><WorkspacePage /></AuthGate>} />
      <Route path="/join/:id" element={<AuthGate><JoinWorkspacePage /></AuthGate>} />
      <Route path="/feed" element={<Navigate to="/community" replace />} />
      <Route path="/community" element={<AuthGate><CommunityPage /></AuthGate>} />
      <Route path="/profile/:username" element={<ProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
    </div>
  );
}

export default App;
