import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import ProvidersPage from './ProvidersPage';
import ProjectsPage from './ProjectsPage';
import TeamsPage from './TeamsPage';
import BlocksPage from './BlocksPage';
import ModulosPage from './ModulosPage';
import DevelopmentTypesPage from './DevelopmentTypesPage';
import TrackingPage from './TrackingPage';
import ReportePage from './ReportePage';
import DefectosPage from './DefectosPage';
import ReporteDefectosPage from './ReporteDefectosPage';

// Componente para proteger rutas
const ProtectedRoute = ({ children, requiredAccess }) => {
  const { hasAccess } = useAuth();

  if (!hasAccess(requiredAccess)) {
    return <Navigate to="/reporte" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { isLiderTecnico } = useAuth();

  return (
    <Routes>
      {/* Redirigir al inicio según el perfil */}
      <Route
        path="/"
        element={
          <Navigate to={isLiderTecnico() ? '/tracking' : '/reporte'} replace />
        }
      />

      {/* Rutas accesibles para todos */}
      <Route path="/tracking" element={<TrackingPage />} />
      <Route path="/reporte" element={<ReportePage />} />

      {/* Rutas solo para Lider Tecnico */}
      <Route
        path="/proveedores"
        element={
          <ProtectedRoute requiredAccess="proveedores">
            <ProvidersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/proyecto"
        element={
          <ProtectedRoute requiredAccess="proyecto">
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipos"
        element={
          <ProtectedRoute requiredAccess="equipos">
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bloques"
        element={
          <ProtectedRoute requiredAccess="bloques">
            <BlocksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/modulos"
        element={
          <ProtectedRoute requiredAccess="modulos">
            <ModulosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tipos-desarrollo"
        element={
          <ProtectedRoute requiredAccess="tipos-desarrollo">
            <DevelopmentTypesPage />
          </ProtectedRoute>
        }
      />

      {/* Ruta para Defectos */}
      <Route
        path="/defectos"
        element={
          <ProtectedRoute requiredAccess="defectos">
            <DefectosPage />
          </ProtectedRoute>
        }
      />

      {/* Ruta para Reporte de Defectos */}
      <Route
        path="/reporte-defectos"
        element={
          <ProtectedRoute requiredAccess="reporte-defectos">
            <ReporteDefectosPage />
          </ProtectedRoute>
        }
      />

      {/* Ruta por defecto */}
      <Route
        path="*"
        element={
          <Navigate to={isLiderTecnico() ? '/tracking' : '/reporte'} replace />
        }
      />
    </Routes>
  );
};

export default AppRoutes;
