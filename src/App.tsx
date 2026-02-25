/**
 * Point d'entrée principal de l'application
 * Gère le routing avec React Router et les providers de contexte
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ThemeProvider, useAuth } from './contexts';
import { MainLayout } from './components/layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

import {
  HomePage,
  LoginPage,
  RegisterPage,
  DashboardPage,
  QCMPageWrapper,
  StatsPageWrapper,
} from './pages';
import { Toaster } from './components/ui/sonner';
import UploadPage from './components/UploadPage';
import SeriesPageWrapper from './pages/SeriesPageWrapper';
import QuestionDetailPage from './components/QuestionDetailPage';

// ─────────────────────────────────────────────
// Routes protégées (nécessitent d'être connecté)
// Affiche un spinner UNIQUEMENT pendant la vérification initiale
// ─────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" message="Vérification de la session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ─────────────────────────────────────────────
// Routes publiques (redirige si déjà connecté)
// ✅ PAS de spinner ici : on affiche la page directement
//    et on redirige seulement quand on sait que l'user est connecté.
//    Évite le spinner infini si loading ne passe jamais à false.
// ─────────────────────────────────────────────
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  // ✅ Si encore en chargement → on affiche la page publique directement
  // (pas de spinner, pas de redirect prématurée)
  // Une fois loading=false, si connecté → redirect vers dashboard
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ─────────────────────────────────────────────
// Routing principal
// ─────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/" element={
        <PublicRoute>
          <HomePage />
        </PublicRoute>
      } />

      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />

      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />

<Route path="/series/:seriesId" element={<SeriesPageWrapper />} />
<Route path="/question/:questionId" element={<QuestionDetailPage />} />
      
      {/* Routes protégées avec MainLayout */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stats" element={<StatsPageWrapper />} />
        <Route path="/qcm" element={<QCMPageWrapper />} />

        {/* Placeholder pages */}
        <Route path="/learn/courses"  element={<div className="p-8 text-center">Cours Communs — En développement</div>} />
        <Route path="/learn/summaries" element={<div className="p-8 text-center">Résumés — En développement</div>} />
        <Route path="/planning"        element={<div className="p-8 text-center">Planning — En développement</div>} />
        <Route path="/train/series"    element={<div className="p-8 text-center">QCM par Séries — En développement</div>} />
        <Route path="/train/custom"    element={<div className="p-8 text-center">QCM à la Carte — En développement</div>} />
        <Route path="/exam"            element={<div className="p-8 text-center">Examens Blancs — En développement</div>} />
        <Route path="/blog"            element={<div className="p-8 text-center">Blog — En développement</div>} />
        <Route path="/tutorials"       element={<div className="p-8 text-center">Tutoriels — En développement</div>} />
        <Route path="/profile"         element={<div className="p-8 text-center">Profil — En développement</div>} />
        <Route path="/settings"        element={<div className="p-8 text-center">Paramètres — En développement</div>} />
        <Route
  path="/insert-question"
  element={
    <UploadPage
      onSeriesUploaded={(data) => {
        console.log("Série reçue :", data);
      }}
    />
  }
/>      

      </Route>

      {/* ✅ Redirect vers login (pas dashboard) pour éviter la boucle
           dashboard → ProtectedRoute → spinner si pas connecté */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// ─────────────────────────────────────────────
// App principale avec providers
// ─────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}