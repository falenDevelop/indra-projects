import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Badge,
  Accordion,
  Button,
  Table,
  ProgressBar,
  Spinner,
  Modal,
  Form,
  Alert,
} from 'react-bootstrap';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from './AuthContext';

const TrackingPage = () => {
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    porcentajeNuevo: 0,
    descripcion: '',
  });

  const { currentUser } = useAuth();

  // Convex hooks
  const blocksData = useQuery(api.blocks.list);
  const teamsData = useQuery(api.teams.list);
  const modulesData = useQuery(api.modules.list);
  const developmentTypesData = useQuery(api.development_types.list);
  const providersData = useQuery(api.providers.list);

  // Query para todas las relaciones team_members
  const allTeamMembers = useQuery(api.team_members.list);

  const moduleTasks = useQuery(
    api.module_tasks.listByModule,
    selectedModuleId ? { moduleId: selectedModuleId } : 'skip'
  );

  // Query para actividades de la tarea seleccionada
  const taskActivities = useQuery(
    api.task_activities.listByTask,
    selectedTaskId ? { taskId: selectedTaskId } : 'skip'
  );

  // Mutation para crear actividad
  const createActivity = useMutation(api.task_activities.create);

  const loading = !blocksData || !teamsData || !modulesData;

  const handleShowTasks = (moduleId) => {
    setSelectedModuleId(moduleId);
  };

  const handleOpenActivityModal = (taskId) => {
    const task = moduleTasks?.find((t) => t._id === taskId);
    if (task) {
      setSelectedTaskId(taskId);
      setActivityForm({
        porcentajeNuevo: task.porcentaje,
        descripcion: '',
      });
      setShowActivityModal(true);
    }
  };

  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setSelectedTaskId(null);
    setActivityForm({
      porcentajeNuevo: 0,
      descripcion: '',
    });
  };

  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    if (!selectedTaskId) return;

    const task = moduleTasks?.find((t) => t._id === selectedTaskId);
    if (!task) return;

    try {
      await createActivity({
        taskId: selectedTaskId,
        porcentajeAnterior: task.porcentaje,
        porcentajeNuevo: activityForm.porcentajeNuevo,
        descripcion: activityForm.descripcion,
        registradoPor: currentUser?.nombre || 'Usuario desconocido',
        registradoPorXp: currentUser?.xp || 'N/A',
      });

      handleCloseActivityModal();
    } catch (error) {
      console.error('Error al registrar actividad:', error);
      alert('Error al registrar la actividad');
    }
  };

  // Agrupar equipos por bloque
  const teamsByBlock = useMemo(() => {
    if (!teamsData) return {};
    return teamsData.reduce((acc, team) => {
      if (!acc[team.bloque]) {
        acc[team.bloque] = [];
      }
      acc[team.bloque].push(team);
      return acc;
    }, {});
  }, [teamsData]);

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold">Tracking de Proyecto</h3>
        <p className="text-muted">
          Vista general del estado de bloques, equipos y módulos
        </p>
      </div>

      <Row>
        {/* Panel izquierdo - Bloques y Equipos */}
        <Col md={selectedModuleId ? 6 : 12}>
          <Accordion defaultActiveKey="0">
            {(blocksData || []).map((block, index) => {
              const teams = teamsByBlock[block.nombre] || [];

              return (
                <Accordion.Item eventKey={index.toString()} key={block._id}>
                  <Accordion.Header>
                    <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                      <div>
                        <strong>{block.nombre}</strong>
                        <Badge bg="secondary" className="ms-2">
                          {teams.length} equipo{teams.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body>
                    {teams.length === 0 ? (
                      <p className="text-muted">
                        No hay equipos asignados a este bloque.
                      </p>
                    ) : (
                      <Row>
                        {teams.map((team) => {
                          // Obtener miembros del equipo
                          const teamMembers = (allTeamMembers || []).filter(
                            (tm) => tm.teamId === team._id
                          );

                          // Agrupar miembros por módulo
                          const membersByModule = teamMembers.reduce(
                            (acc, member) => {
                              const moduleId = member.moduleId || 'sin-modulo';
                              if (!acc[moduleId]) {
                                acc[moduleId] = [];
                              }
                              acc[moduleId].push(member);
                              return acc;
                            },
                            {}
                          );

                          return (
                            <Col
                              md={selectedModuleId ? 12 : 4}
                              key={team._id}
                              className="mb-2"
                            >
                              <Card className="shadow-sm">
                                <Card.Header className="bg-primary text-white py-2">
                                  <strong>{team.nombre}</strong>
                                  <Badge
                                    bg="light"
                                    text="dark"
                                    className="ms-2"
                                  >
                                    {teamMembers.length} miembro
                                    {teamMembers.length !== 1 ? 's' : ''}
                                  </Badge>
                                </Card.Header>
                                <Card.Body className="p-2">
                                  {Object.keys(membersByModule).length === 0 ? (
                                    <p className="text-muted mb-0">
                                      No hay proveedores asignados
                                    </p>
                                  ) : (
                                    Object.keys(membersByModule).map(
                                      (moduleId) => {
                                        const module = modulesData?.find(
                                          (m) => m._id === moduleId
                                        );
                                        const members =
                                          membersByModule[moduleId];
                                        const isSelected =
                                          selectedModuleId === moduleId;

                                        return (
                                          <div
                                            key={moduleId}
                                            className={`mb-2 pb-2 border-bottom ${isSelected ? 'bg-light rounded p-2' : ''}`}
                                          >
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                              <div>
                                                <small className="text-primary fw-bold">
                                                  {module
                                                    ? module.nombre
                                                    : 'Sin módulo asignado'}
                                                </small>
                                                {module && (
                                                  <Badge
                                                    pill
                                                    bg={
                                                      module.estado === 'Activo'
                                                        ? 'success'
                                                        : module.estado ===
                                                            'En Desarrollo'
                                                          ? 'primary'
                                                          : module.estado ===
                                                              'Pausado'
                                                            ? 'warning'
                                                            : 'secondary'
                                                    }
                                                    className="ms-2"
                                                  >
                                                    {module.estado}
                                                  </Badge>
                                                )}
                                              </div>
                                              {module && (
                                                <Button
                                                  size="sm"
                                                  variant={
                                                    isSelected
                                                      ? 'info'
                                                      : 'outline-info'
                                                  }
                                                  onClick={() =>
                                                    handleShowTasks(module._id)
                                                  }
                                                >
                                                  {isSelected
                                                    ? 'Viendo'
                                                    : 'Ver'}
                                                </Button>
                                              )}
                                            </div>

                                            {/* Lista de proveedores/responsables */}
                                            <div className="ms-2">
                                              {members.map((member) => {
                                                const provider =
                                                  providersData?.find(
                                                    (p) =>
                                                      p._id ===
                                                      member.providerId
                                                  );
                                                return (
                                                  <div
                                                    key={member._id}
                                                    className="d-flex align-items-center mb-1"
                                                  >
                                                    <div className="me-2">
                                                      {member.isFocal && (
                                                        <Badge
                                                          bg="warning"
                                                          text="dark"
                                                          pill
                                                          style={{
                                                            fontSize: '0.7rem',
                                                          }}
                                                        >
                                                          Focal
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <div className="flex-grow-1">
                                                      <small className="fw-bold">
                                                        {member.nombre}
                                                      </small>
                                                      {provider && (
                                                        <small
                                                          className="text-muted d-block"
                                                          style={{
                                                            fontSize: '0.7rem',
                                                          }}
                                                        >
                                                          {provider.perfil} -{' '}
                                                          {provider.tipo}
                                                        </small>
                                                      )}
                                                    </div>
                                                    <Badge
                                                      bg="info"
                                                      pill
                                                      style={{
                                                        fontSize: '0.7rem',
                                                      }}
                                                    >
                                                      {member.estado}
                                                    </Badge>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      }
                                    )
                                  )}
                                </Card.Body>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </Col>

        {/* Panel derecho - Tareas del módulo seleccionado */}
        {selectedModuleId && (
          <Col md={6}>
            <Card className="sticky-top" style={{ top: '20px' }}>
              <Card.Header className="bg-info text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>
                    Tareas:{' '}
                    {
                      modulesData?.find((m) => m._id === selectedModuleId)
                        ?.nombre
                    }
                  </strong>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => setSelectedModuleId(null)}
                  >
                    ✕
                  </Button>
                </div>
              </Card.Header>
              <Card.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                {!moduleTasks || moduleTasks.length === 0 ? (
                  <p className="text-muted text-center">
                    No hay tareas registradas para este módulo.
                  </p>
                ) : (
                  <>
                    {/* Resumen de progreso */}
                    <div className="mb-4">
                      <h6>Progreso General</h6>
                      {(() => {
                        const totalTasks = moduleTasks.length;
                        const avgProgress =
                          moduleTasks.reduce(
                            (sum, task) => sum + task.porcentaje,
                            0
                          ) / totalTasks;
                        return (
                          <div>
                            <div className="d-flex justify-content-between mb-1">
                              <span>
                                {totalTasks} tarea{totalTasks !== 1 ? 's' : ''}
                              </span>
                              <strong>{avgProgress.toFixed(1)}%</strong>
                            </div>
                            <ProgressBar
                              now={avgProgress}
                              variant={
                                avgProgress === 100
                                  ? 'success'
                                  : avgProgress >= 75
                                    ? 'info'
                                    : avgProgress >= 50
                                      ? 'warning'
                                      : 'danger'
                              }
                            />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Tabla de tareas */}
                    <Table bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Actividad</th>
                          <th>Tipo</th>
                          <th>Fechas</th>
                          <th>Progreso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleTasks.map((task) => {
                          const devType = developmentTypesData?.find(
                            (dt) => dt._id === task.developmentTypeId
                          );
                          return (
                            <tr
                              key={task._id}
                              onClick={() => handleOpenActivityModal(task._id)}
                              style={{ cursor: 'pointer' }}
                              className="hover-highlight"
                            >
                              <td>
                                <strong>{task.nombreActividad}</strong>
                              </td>
                              <td>
                                <Badge bg="secondary">
                                  {devType?.nombre || '-'}
                                </Badge>
                                {devType?.numeroDias && (
                                  <small className="text-muted d-block">
                                    {devType.numeroDias} días
                                  </small>
                                )}
                              </td>
                              <td>
                                <small>
                                  <div>{task.fechaInicio}</div>
                                  <div>{task.fechaFinal}</div>
                                </small>
                              </td>
                              <td>
                                <div style={{ minWidth: '100px' }}>
                                  <div className="text-center mb-1">
                                    <small>
                                      <strong>{task.porcentaje}%</strong>
                                    </small>
                                  </div>
                                  <ProgressBar
                                    now={task.porcentaje}
                                    variant={
                                      task.porcentaje === 100
                                        ? 'success'
                                        : task.porcentaje >= 75
                                          ? 'info'
                                          : task.porcentaje >= 50
                                            ? 'warning'
                                            : 'danger'
                                    }
                                    style={{ height: '8px' }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Modal de Actividades */}
      <Modal
        show={showActivityModal}
        onHide={handleCloseActivityModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Registro de Actividad
            {selectedTaskId && moduleTasks && (
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                {
                  moduleTasks.find((t) => t._id === selectedTaskId)
                    ?.nombreActividad
                }
              </div>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTaskId &&
            moduleTasks &&
            (() => {
              const task = moduleTasks.find((t) => t._id === selectedTaskId);
              const porcentajeActual = task?.porcentaje || 0;
              const diferencia =
                activityForm.porcentajeNuevo - porcentajeActual;
              const subeProgreso = diferencia > 0;
              const bajaProgreso = diferencia < 0;

              return (
                <>
                  {/* Progreso Actual */}
                  <Alert variant="info" className="mb-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Progreso Actual:</strong> {porcentajeActual}%
                      </div>
                      {diferencia !== 0 && (
                        <div>
                          <Badge bg={subeProgreso ? 'success' : 'warning'}>
                            {subeProgreso ? '+' : ''}
                            {diferencia}%
                          </Badge>
                        </div>
                      )}
                    </div>
                    <ProgressBar
                      now={porcentajeActual}
                      variant="info"
                      className="mt-2"
                      style={{ height: '10px' }}
                    />
                  </Alert>

                  {/* Formulario de Nueva Actividad */}
                  <Form onSubmit={handleSubmitActivity}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nuevo Porcentaje *</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="100"
                        value={activityForm.porcentajeNuevo}
                        onChange={(e) =>
                          setActivityForm({
                            ...activityForm,
                            porcentajeNuevo: parseInt(e.target.value) || 0,
                          })
                        }
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>
                        {subeProgreso && 'Descripción del Avance *'}
                        {bajaProgreso && 'Motivo de la Reducción *'}
                        {!subeProgreso && !bajaProgreso && 'Descripción'}
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={activityForm.descripcion}
                        onChange={(e) =>
                          setActivityForm({
                            ...activityForm,
                            descripcion: e.target.value,
                          })
                        }
                        placeholder={
                          subeProgreso
                            ? 'Describe qué se completó para subir el porcentaje...'
                            : bajaProgreso
                              ? 'Explica el motivo de la reducción del porcentaje...'
                              : 'Descripción de la actividad...'
                        }
                        required={diferencia !== 0}
                      />
                    </Form.Group>

                    {diferencia !== 0 && (
                      <Alert variant={subeProgreso ? 'success' : 'warning'}>
                        <strong>
                          {subeProgreso
                            ? '📈 Incremento de progreso:'
                            : '📉 Reducción de progreso:'}
                        </strong>{' '}
                        El porcentaje {subeProgreso ? 'subirá' : 'bajará'} de{' '}
                        {porcentajeActual}% a {activityForm.porcentajeNuevo}% (
                        {subeProgreso ? '+' : ''}
                        {diferencia}%)
                      </Alert>
                    )}

                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={handleCloseActivityModal}
                      >
                        Cancelar
                      </Button>
                      <Button variant="primary" type="submit">
                        Registrar Actividad
                      </Button>
                    </div>
                  </Form>

                  {/* Historial de Actividades */}
                  <hr className="my-4" />
                  <h5 className="mb-3">Historial de Actividades</h5>
                  {!taskActivities || taskActivities.length === 0 ? (
                    <p className="text-muted text-center">
                      No hay actividades registradas aún.
                    </p>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {taskActivities.map((activity) => {
                        const cambio =
                          activity.porcentajeNuevo -
                          activity.porcentajeAnterior;
                        const esCambioPositivo = cambio > 0;
                        const esCambioNegativo = cambio < 0;

                        return (
                          <Card key={activity._id} className="mb-2">
                            <Card.Body className="py-2">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <Badge
                                    bg={
                                      esCambioPositivo
                                        ? 'success'
                                        : esCambioNegativo
                                          ? 'warning'
                                          : 'secondary'
                                    }
                                    className="me-2"
                                  >
                                    {activity.porcentajeAnterior}% →{' '}
                                    {activity.porcentajeNuevo}%
                                    {cambio !== 0 &&
                                      ` (${esCambioPositivo ? '+' : ''}${cambio}%)`}
                                  </Badge>
                                  <small className="text-muted">
                                    {new Date(
                                      activity.createdAt
                                    ).toLocaleString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </small>
                                </div>
                              </div>
                              <p className="mb-0 small">
                                {activity.descripcion}
                              </p>
                              <div className="mt-1">
                                <Badge
                                  bg="info"
                                  pill
                                  style={{ fontSize: '0.65rem' }}
                                >
                                  👤 {activity.registradoPor} (
                                  {activity.registradoPorXp})
                                </Badge>
                              </div>
                            </Card.Body>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default TrackingPage;
