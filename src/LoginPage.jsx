import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from './useAuth';

const LoginPage = () => {
  const [correoEmpresa, setCorreoEmpresa] = useState('');
  const [xp, setXp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const [pendingUser, setPendingUser] = useState(null);

  // Query de login - se ejecuta cuando tenemos credenciales
  const loginResult = useQuery(
    api.auth.login,
    correoEmpresa && xp && isLoading ? { correoEmpresa, xp } : 'skip'
  );

  // Query para saber si el usuario es focal
  const focalResult = useQuery(
    api.team_members.isFocalUser,
    pendingUser ? { nombre: pendingUser.nombre } : 'skip'
  );

  // Procesar resultado del login
  React.useEffect(() => {
    if (loginResult && isLoading) {
      setIsLoading(false);

      if (loginResult.success) {
        // Guardar usuario pendiente para consultar si es focal
        setPendingUser(loginResult.user);
        setError('');
      } else {
        setError(loginResult.message);
        setXp(''); // Limpiar contraseña
      }
    }
  }, [loginResult, isLoading]);

  // Cuando llega la respuesta de si es focal, guardar en contexto/localStorage
  React.useEffect(() => {
    if (pendingUser && focalResult) {
      login({ ...pendingUser, isFocal: focalResult.isFocal });
      setPendingUser(null);
    }
  }, [pendingUser, focalResult, login]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!correoEmpresa || !xp) {
      setError('Por favor complete todos los campos');
      return;
    }

    setIsLoading(true);
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}
    >
      <Container>
        <div className="row justify-content-center">
          <div className="col-md-5">
            <Card className="shadow-lg border-0">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary mb-2">Mi Dashboard</h2>
                  <p className="text-muted">Iniciar Sesión</p>
                </div>

                {error && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setError('')}
                  >
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre del usuario</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="usuario"
                      value={correoEmpresa}
                      onChange={(e) => setCorreoEmpresa(e.target.value)}
                      disabled={isLoading}
                      required
                      autoFocus
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Ej: 12345"
                      value={xp}
                      onChange={(e) => setXp(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <Form.Text className="text-muted">
                      Ingrese solo los números de su XP (sin letras)
                    </Form.Text>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 py-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Verificando...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </Form>

                <div className="text-center mt-4">
                  <small className="text-muted">
                    💡 Contacte al administrador si tiene problemas para acceder
                  </small>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default LoginPage;
