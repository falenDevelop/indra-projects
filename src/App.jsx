import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import AppRoutes from './AppRoutes';
import LoginPage from './LoginPage';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Nav,
  Navbar,
  Button,
  Dropdown,
} from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import {
  FaHome,
  FaUsers,
  FaChartBar,
  FaCog,
  FaBars,
  FaUserCircle,
  FaCheckCircle,
  FaFileAlt,
  FaSignOutAlt,
} from 'react-icons/fa';
import './App.css';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentUser, logout, hasAccess, loading } = useAuth();

  const users = useQuery(api.users.list) || [];

  // Mostrar LoginPage si no hay usuario autenticado
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="text-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const allMenuItems = [
    { id: 'reporte', icon: FaFileAlt, label: 'Reporte', path: '/reporte' },
    { id: 'tracking', icon: FaChartBar, label: 'Tracking', path: '/tracking' },
    { id: 'proyecto', icon: FaHome, label: 'Proyecto', path: '/proyecto' },
    {
      id: 'equipos',
      icon: FaUsers,
      label: 'Equipos',
      path: '/equipos',
    },
    {
      id: 'bloques',
      icon: FaCog,
      label: 'Bloques',
      path: '/bloques',
    },
    {
      id: 'tipos-desarrollo',
      icon: FaCog,
      label: 'Tipos Desarrollo',
      path: '/tipos-desarrollo',
    },
    {
      id: 'modulos',
      icon: FaCog,
      label: 'Features',
      path: '/modulos',
    },
    {
      id: 'proveedores',
      icon: FaUsers,
      label: 'Proveedores',
      path: '/proveedores',
    },
  ];

  // Mostrar el ítem Defectos sólo para perfiles QA o Lider Tecnico
  if (currentUser?.perfil === 'QA' || currentUser?.perfil === 'Lider Tecnico') {
    allMenuItems.splice(2, 0, {
      id: 'defectos',
      icon: FaFileAlt,
      label: 'Defectos',
      path: '/defectos',
    });
  }

  // Filtrar menú según permisos del usuario
  const menuItems = allMenuItems.filter((item) => hasAccess(item.id));

  const activeUsers = users.filter((u) => u.status === 'Activo').length;
  const roles = new Set(users.map((u) => u.role)).size;

  // Determinar menú activo basado en la ruta actual
  const activeMenu =
    menuItems.find((item) => location.pathname === item.path)?.id || 'reporte';

  return (
    <div className="d-flex vh-100 overflow-hidden bg-light">
      {/* Sidebar */}
      <div
        className={`sidebar bg-primary text-white ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        style={{
          width: sidebarOpen ? '260px' : '80px',
          transition: 'all 0.3s ease',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header Sidebar */}
        <div className="p-3 border-bottom border-white border-opacity-25 d-flex justify-content-between align-items-center">
          {sidebarOpen && <h4 className="mb-0 fw-bold">Mi Dashboard</h4>}
          <Button
            variant="link"
            className="text-white p-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FaBars size={20} />
          </Button>
        </div>

        {/* Menu Items */}
        <Nav className="flex-column p-3 flex-grow-1">
          {menuItems.map((item) => (
            <Nav.Link
              key={item.id}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
              }}
              className={`d-flex align-items-center gap-3 px-3 py-2 mb-2 rounded ${
                activeMenu === item.id
                  ? 'bg-white text-primary'
                  : 'text-white hover-menu'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="fw-medium">{item.label}</span>}
            </Nav.Link>
          ))}
        </Nav>

        {/* Footer Sidebar */}
        {sidebarOpen && (
          <div className="p-3 border-top border-white border-opacity-25">
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaUserCircle size={40} />
              <div className="flex-grow-1">
                <div className="fw-semibold small">{currentUser.nombre}</div>
                <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                  {currentUser.perfil}
                </div>
              </div>
            </div>
            <Button
              variant="outline-light"
              size="sm"
              className="w-100"
              onClick={logout}
            >
              <FaSignOutAlt className="me-2" />
              Cerrar Sesión
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{ overflow: 'hidden' }}
      >
        {/* Top Bar */}
        <Navbar bg="white" className="shadow-sm px-4 py-3">
          <Container fluid>
            <div>
              <h2 className="mb-0 fw-bold text-dark">
                {menuItems.find((item) => item.id === activeMenu)?.label ||
                  'Dashboard'}
              </h2>
              <p className="mb-0 text-muted small">
                Bienvenido a tu panel de control
              </p>
            </div>
            <Badge
              bg="success"
              className="d-flex align-items-center gap-2 px-3 py-2"
            >
              <FaCheckCircle />
              Conectado a Convex
            </Badge>
          </Container>
        </Navbar>

        {/* Content Area con rutas */}
        <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
          <Container fluid>
            <AppRoutes users={users} activeUsers={activeUsers} roles={roles} />
          </Container>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
