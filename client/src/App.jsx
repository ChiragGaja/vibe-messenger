import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useChatStore from './store/chatStore';
import InstallPrompt from './components/InstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loaded routes
const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));

// Loading fallback
const PageLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
  </div>
);

function ProtectedRoute({ children }) {
  const user = useChatStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const user = useChatStore((s) => s.user);
  return !user ? children : <Navigate to="/chat" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <InstallPrompt />
        <OfflineIndicator />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
