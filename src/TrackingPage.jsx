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
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from './useAuth';

const TrackingPage = () => {
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    porcentajeNuevo: 0,
    descripcion: '',
  });

  const { currentUser } = useAuth();
  const [showDefectsModal, setShowDefectsModal] = useState(false);
  const [selectedDefectModuleId, setSelectedDefectModuleId] = useState(null);
  const [defectForm, setDefectForm] = useState({
    ticket: '',
    data: '',
    comentario: '',
    estado: 'Pendiente',
  });
  const [editingDefectId, setEditingDefectId] = useState(null);
  // Convex-backed defects (loaded per selected defect module)
  const defectsQuery = useQuery(
    api.defects.listByModule,
    selectedDefectModuleId ? { moduleId: selectedDefectModuleId } : 'skip'
  );

  const createDefect = useMutation(api.defects.create);
  const updateDefect = useMutation(api.defects.update);
  const removeDefect = useMutation(api.defects.remove);

  const DEFECT_STATES = [
    'Pendiente',
    'Validar QA',
    'Procesos',
    'Validacion Banco',
    'Observado',
    'Bloqueante',
    'Resuelto',
    'Descartado',
    'Otro',
  ];

  const isQAorLeader = () =>
    currentUser?.perfil === 'QA' || currentUser?.perfil === 'Lider Tecnico';

  // local persistence removed — use Convex mutations instead

  const handleShowDefects = (moduleId) => {
    setSelectedDefectModuleId(moduleId);
    setEditingDefectId(null);
    setDefectForm({
      ticket: '',
      data: '',
      comentario: '',
      estado: 'Pendiente',
    });
    setShowDefectsModal(true);
  };

  const handleCloseDefects = () => {
    setShowDefectsModal(false);
    setSelectedDefectModuleId(null);
  };

  const handleSaveDefect = (e) => {
    e.preventDefault();
    if (!selectedDefectModuleId) return;
    (async () => {
      try {
        if (editingDefectId) {
          await updateDefect({ id: editingDefectId, ...defectForm });
        } else {
          await createDefect({
            moduleId: selectedDefectModuleId,
            ...defectForm,
            creadoPor: currentUser?.nombre || 'Usuario desconocido',
            creadoPorXp: currentUser?.xp || 'N/A',
            creadoAt: Date.now(),
          });
        }
      } catch (err) {
        console.error('Error saving defect:', err);
        alert('Error al guardar el defecto');
      } finally {
        setEditingDefectId(null);
        setDefectForm({
          ticket: '',
          data: '',
          comentario: '',
          estado: 'Pendiente',
        });
      }
    })();
  };

  const handleEditDefect = (defect) => {
    setEditingDefectId(defect.id);
    setDefectForm({
      ticket: defect.ticket,
      data: defect.data ?? defect['data'] ?? '',
      comentario: defect.comentario,
      estado: defect.estado,
    });
  };

  const handleDeleteDefect = (id) => {
    if (!selectedDefectModuleId) return;
    if (!window.confirm('¿Eliminar este defecto?')) return;
    (async () => {
      try {
        await removeDefect({ id });
      } catch (err) {
        console.error('Error removing defect:', err);
        alert('Error al eliminar el defecto');
      }
    })();
  };

  const handleChangeDefectState = (defectObj, estado) => {
    if (!selectedDefectModuleId) return;
    (async () => {
      try {
        const id = defectObj?.id || defectObj?._id;
        const payload = {
          id,
          estado,
          ticket: defectObj?.ticket || '',
        };
        if (defectObj?.comentario) payload.comentario = defectObj.comentario;
        if (defectObj?.usuario) payload.usuario = defectObj.usuario;
        if (defectObj?.contrasena) payload.contrasena = defectObj.contrasena;

        await updateDefect(payload);
      } catch (err) {
        console.error('Error updating defect state:', err);
        alert('Error al actualizar el estado del defecto');
      }
    })();
  };

  // Convex hooks
  const blocksData = useQuery(api.blocks.list);
  const projectsData = useQuery(api.projects.list);
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

  const computeInclusiveDays = (startStr, endStr) => {
    if (!startStr || !endStr) return undefined;
    const p = (s) => s.split('-').map((n) => Number(n));
    try {
      const [sy, sm, sd] = p(startStr);
      const [ey, em, ed] = p(endStr);
      const start = Date.UTC(sy, sm - 1, sd);
      const end = Date.UTC(ey, em - 1, ed);
      const msPerDay = 24 * 60 * 60 * 1000;
      let count = 0;
      for (let t = start; t <= end; t += msPerDay) {
        const dow = new Date(t).getUTCDay();
        if (dow !== 0 && dow !== 6) count += 1; // exclude Sundays(0) and Saturdays(6)
      }
      return count; // may be 0 if no weekdays in range
    } catch {
      return undefined;
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

      <div className="mb-3 d-flex gap-2 align-items-center">
        <Form.Label className="mb-0 me-2">Proyecto</Form.Label>
        <Form.Select
          style={{ maxWidth: 320 }}
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">-- Todos los proyectos --</option>
          {(projectsData || []).map((p) => (
            <option key={p._id} value={p._id}>
              {p.nombre}
            </option>
          ))}
        </Form.Select>
      </div>

      <Row>
        {/* Panel izquierdo - Bloques y Equipos */}
        <Col md={selectedModuleId ? 4 : 12}>
          {(() => {
            const filteredBlocks = (blocksData || []).filter((b) =>
              selectedProjectId ? b.projectId === selectedProjectId : true
            );
            if (filteredBlocks.length === 0) {
              return (
                <div className="p-3 text-center text-muted">
                  No hay bloques para este proyecto.
                </div>
              );
            }
            return (
              <Accordion defaultActiveKey="0">
                {filteredBlocks.map((block, index) => {
                  const teams = teamsByBlock[block.nombre] || [];

                  return (
                    <Accordion.Item eventKey={index.toString()} key={block._id}>
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                          <div>
                            <strong>{block.nombre}</strong>
                            <Badge bg="secondary" className="ms-2">
                              {teams.length} equipo
                              {teams.length !== 1 ? 's' : ''}
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
                                  const moduleId =
                                    member.moduleId || 'sin-modulo';
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
                                      {Object.keys(membersByModule).length ===
                                      0 ? (
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
                                                          module.estado ===
                                                          'Activo'
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
                                                        handleShowTasks(
                                                          module._id
                                                        )
                                                      }
                                                    >
                                                      {isSelected
                                                        ? 'Viendo'
                                                        : 'Ver'}
                                                    </Button>
                                                  )}
                                                  {module && (
                                                    <div className="mt-1">
                                                      <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        onClick={() =>
                                                          handleShowDefects(
                                                            module._id
                                                          )
                                                        }
                                                      >
                                                        Defectos
                                                      </Button>
                                                    </div>
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
                                                                fontSize:
                                                                  '0.7rem',
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
                                                                fontSize:
                                                                  '0.7rem',
                                                              }}
                                                            >
                                                              {provider.perfil}{' '}
                                                              - {provider.tipo}
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
            );
          })()}
        </Col>

        {/* Panel derecho - Tareas del módulo seleccionado */}
        {selectedModuleId && (
          <Col md={8}>
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
                          <th style={{ minWidth: '200px' }}>Fechas</th>
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
                                {(() => {
                                  const dias = computeInclusiveDays(
                                    task.fechaInicio,
                                    task.fechaFinal
                                  );
                                  if (dias !== undefined) {
                                    return (
                                      <small className="text-muted d-block">
                                        {`${dias} día${dias !== 1 ? 's' : ''}`}
                                      </small>
                                    );
                                  }
                                  if (devType?.numeroDias !== undefined) {
                                    return (
                                      <small className="text-muted d-block">
                                        {`${devType.numeroDias} día${devType.numeroDias !== 1 ? 's' : ''}`}
                                      </small>
                                    );
                                  }
                                  return null;
                                })()}
                              </td>
                              <td style={{ minWidth: '200px' }}>
                                <small>
                                  <div>
                                    {task.fechaInicio} / {task.fechaFinal}
                                  </div>
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
      {/* Modal de Defectos */}
      <Modal show={showDefectsModal} onHide={handleCloseDefects} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Defectos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            {!isQAorLeader() ? (
              <div className="alert alert-info">
                Solo lectura: no tiene permisos para crear/editar defectos.
              </div>
            ) : (
              <Form onSubmit={handleSaveDefect} className="mb-3">
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Ticket</Form.Label>
                      <Form.Control
                        value={defectForm.ticket}
                        onChange={(e) =>
                          setDefectForm((f) => ({
                            ...f,
                            ticket: e.target.value,
                          }))
                        }
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Estado</Form.Label>
                      <Form.Select
                        value={defectForm.estado}
                        onChange={(e) =>
                          setDefectForm((f) => ({
                            ...f,
                            estado: e.target.value,
                          }))
                        }
                      >
                        {DEFECT_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-2">
                  <Form.Label>Data</Form.Label>
                  <Form.Control
                    type="text"
                    value={defectForm.data}
                    onChange={(e) =>
                      setDefectForm((f) => ({
                        ...f,
                        data: e.target.value,
                      }))
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Comentario</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={defectForm.comentario}
                    onChange={(e) =>
                      setDefectForm((f) => ({
                        ...f,
                        comentario: e.target.value,
                      }))
                    }
                  />
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button type="submit" variant="primary">
                    {editingDefectId ? 'Guardar' : 'Agregar'}
                  </Button>
                  {editingDefectId && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingDefectId(null);
                        setDefectForm({
                          ticket: '',
                          comentario: '',
                          estado: 'Pendiente',
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </Form>
            )}

            <h6>Listado de Defectos</h6>
            {!selectedDefectModuleId || !(defectsQuery || []).length ? (
              <div className="text-muted">
                No hay defectos registrados para este módulo.
              </div>
            ) : (
              <div className="list-group">
                {(defectsQuery || []).map((d) => (
                  <div
                    key={d.id}
                    className="list-group-item d-flex justify-content-between align-items-start"
                  >
                    <div>
                      <div className="fw-bold">
                        {d.ticket}{' '}
                        <small className="text-muted">{d.estado}</small>
                      </div>
                      {d.data && (
                        <div className="small text-primary">Data: {d.data}</div>
                      )}
                      <div className="small">{d.comentario}</div>
                      <div className="small text-muted mt-1">
                        Creado por: {d.creadoPor || '-'}
                      </div>
                    </div>
                    <div className="text-end">
                      <Form.Select
                        size="sm"
                        value={d.estado}
                        onChange={(e) =>
                          handleChangeDefectState(d, e.target.value)
                        }
                        style={{
                          width: '160px',
                          display: 'inline-block',
                          marginRight: 8,
                        }}
                      >
                        {DEFECT_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Form.Select>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="warning"
                          className="me-1"
                          onClick={() => {
                            handleEditDefect({ ...d, id: d.id || d._id });
                          }}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteDefect(d.id || d._id)}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDefects}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
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
              const msPerDay = 24 * 60 * 60 * 1000;
              const taskEndUtc =
                task && task.fechaFinal
                  ? (() => {
                      const [ey, em, ed] = task.fechaFinal
                        .split('-')
                        .map(Number);
                      return Date.UTC(ey, em - 1, ed) + msPerDay - 1;
                    })()
                  : null;
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
                        const isOutOfDate =
                          cambio !== 0 && taskEndUtc
                            ? activity.createdAt > taskEndUtc
                            : false;
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
                                  {isOutOfDate && (
                                    <Badge bg="danger" className="ms-2">
                                      Fuera de fecha
                                    </Badge>
                                  )}
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
