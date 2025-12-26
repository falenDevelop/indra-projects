import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Row,
  Col,
  Pagination,
  Spinner,
  Badge,
  ProgressBar,
  Alert,
  Card,
} from 'react-bootstrap';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from './AuthContext';
import { FaEdit, FaTrash } from 'react-icons/fa';

const initialForm = {
  nombre: '',
  descripcion: '',
  estado: 'Activo',
  repositorio: '',
  figma: '',
};

const initialTaskForm = {
  nombreActividad: '',
  developmentTypeId: '',
  fechaInicio: '',
  fechaFinal: '',
  porcentaje: 0,
};

const ModulosPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [activityForm, setActivityForm] = useState({
    porcentajeNuevo: 0,
    descripcion: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { currentUser } = useAuth();

  const formatShortDate = (d) => {
    if (!d) return '-';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return d.slice(2); // YY-MM-DD
    }
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    const yy = String(dt.getFullYear() % 100).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const getPercentVariant = (v) => {
    if (v === null || v === undefined) return 'danger';
    const s = String(v).replace(/[^0-9.-]/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return 'danger';
    if (n <= 60) return 'danger';
    if (n <= 90) return 'warning';
    return 'success';
  };

  // Convex hooks
  const modulesData = useQuery(api.modules.list);
  const developmentTypesData = useQuery(api.development_types.list);
  const moduleTasks = useQuery(
    api.module_tasks.listByModule,
    selectedModuleId ? { moduleId: selectedModuleId } : 'skip'
  );
  const taskActivities = useQuery(
    api.task_activities.listByTask,
    selectedTaskId ? { taskId: selectedTaskId } : 'skip'
  );
  const createModule = useMutation(api.modules.create);
  const updateModule = useMutation(api.modules.update);
  const removeModule = useMutation(api.modules.remove);
  const createTask = useMutation(api.module_tasks.create);
  const updateTask = useMutation(api.module_tasks.update);
  const removeTask = useMutation(api.module_tasks.remove);
  const createActivity = useMutation(api.task_activities.create);
  const loading = modulesData === undefined;

  const handleShowModal = (module) => {
    if (module) {
      const { _id, _creationTime, ...rest } = module;
      setForm(rest);
      setEditingId(module._id);
    } else {
      setForm(initialForm);
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    // Validar campos obligatorios
    if (!form.nombre || !form.descripcion || !form.estado) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    if (editingId) {
      await updateModule({ ...form, id: editingId });
    } else {
      await createModule(form);
    }
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este módulo?')) {
      await removeModule({ id });
    }
  };

  const handleShowTaskModal = (moduleId) => {
    setSelectedModuleId(moduleId);
    setTaskForm(initialTaskForm);
    setEditingTaskId(null);
    setShowTaskModal(true);
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setSelectedModuleId(null);
    setTaskForm(initialTaskForm);
    setEditingTaskId(null);
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task._id);
    setTaskForm({
      nombreActividad: task.nombreActividad,
      developmentTypeId: task.developmentTypeId,
      fechaInicio: task.fechaInicio,
      fechaFinal: task.fechaFinal,
      porcentaje: task.porcentaje,
    });
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setTaskForm(initialTaskForm);
  };

  const handleSaveTask = async () => {
    if (!taskForm.nombreActividad || !taskForm.developmentTypeId) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    try {
      if (editingTaskId) {
        await updateTask({ ...taskForm, id: editingTaskId });
        handleCancelEditTask();
      } else {
        await createTask({ ...taskForm, moduleId: selectedModuleId });
        setTaskForm(initialTaskForm);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('¿Está seguro de eliminar esta tarea?')) {
      await removeTask({ id: taskId });
    }
  };

  const handleOpenActivityModal = (taskId, e) => {
    e.stopPropagation();
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

  // Filtros
  const [filters, setFilters] = useState({
    nombre: '',
    estado: '',
  });

  // Filtrar por campos
  const modulesFiltrados = useMemo(() => {
    return (modulesData || []).filter((m) => {
      return (
        (!filters.nombre ||
          m.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) &&
        (!filters.estado || m.estado === filters.estado)
      );
    });
  }, [modulesData, filters]);

  // Paginación sobre la lista filtrada
  const paginated = useMemo(
    () => modulesFiltrados.slice((page - 1) * pageSize, page * pageSize),
    [modulesFiltrados, page]
  );
  const totalPages = Math.ceil(modulesFiltrados.length / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold">Módulos</h3>
        <Button onClick={() => handleShowModal()} variant="primary">
          Agregar módulo
        </Button>
      </div>

      {/* Filtros */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Control
            placeholder="Filtrar por nombre"
            value={filters.nombre}
            onChange={(e) =>
              setFilters((f) => ({ ...f, nombre: e.target.value }))
            }
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={filters.estado}
            onChange={(e) =>
              setFilters((f) => ({ ...f, estado: e.target.value }))
            }
          >
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="En Desarrollo">En Desarrollo</option>
            <option value="Pausado">Pausado</option>
            <option value="Completado">Completado</option>
          </Form.Select>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Table bordered hover responsive>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Repositorio</th>
                <th>Figma</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted">
                    No hay módulos registrados.
                  </td>
                </tr>
              ) : (
                paginated.map((m) => (
                  <tr key={m._id}>
                    <td>{m.nombre}</td>
                    <td>{m.descripcion}</td>
                    <td>
                      <span
                        className={`badge ${
                          m.estado === 'Activo'
                            ? 'bg-success'
                            : m.estado === 'En Desarrollo'
                              ? 'bg-primary'
                              : m.estado === 'Pausado'
                                ? 'bg-warning'
                                : 'bg-secondary'
                        }`}
                      >
                        {m.estado}
                      </span>
                    </td>
                    <td>
                      {m.repositorio ? (
                        <a
                          href={m.repositorio}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver repo
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {m.figma ? (
                        <a
                          href={m.figma}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver diseño
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => handleShowModal(m)}
                        className="me-1"
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(m._id)}
                        className="me-1"
                      >
                        Eliminar
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleShowTaskModal(m._id)}
                      >
                        Asignar Tareas
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </>
      )}

      {totalPages > 1 && (
        <Pagination>
          {[...Array(totalPages)].map((_, i) => (
            <Pagination.Item
              key={i}
              active={i + 1 === page}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
        </Pagination>
      )}

      {/* Modal para crear/editar módulo */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Editar módulo' : 'Agregar módulo'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Nombre del Módulo <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={form.nombre}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nombre: e.target.value }))
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Estado <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={form.estado}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estado: e.target.value }))
                    }
                  >
                    <option value="Activo">Activo</option>
                    <option value="En Desarrollo">En Desarrollo</option>
                    <option value="Pausado">Pausado</option>
                    <option value="Completado">Completado</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>
                Descripción <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>URL del Repositorio</Form.Label>
              <Form.Control
                type="url"
                value={form.repositorio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, repositorio: e.target.value }))
                }
                placeholder="https://github.com/..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>URL de Figma</Form.Label>
              <Form.Control
                type="url"
                value={form.figma}
                onChange={(e) =>
                  setForm((f) => ({ ...f, figma: e.target.value }))
                }
                placeholder="https://figma.com/..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para asignar tareas */}
      <Modal show={showTaskModal} onHide={handleCloseTaskModal} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Asignar Tareas al Módulo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <Form.Label>
              {editingTaskId ? 'Editar Tarea' : 'Nueva Tarea'}
            </Form.Label>
            <Row className="mb-2">
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>
                    Nombre de la Actividad{' '}
                    <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={taskForm.nombreActividad}
                    onChange={(e) =>
                      setTaskForm((f) => ({
                        ...f,
                        nombreActividad: e.target.value,
                      }))
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>
                    Tipo de Desarrollo <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={taskForm.developmentTypeId}
                    onChange={(e) =>
                      setTaskForm((f) => ({
                        ...f,
                        developmentTypeId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona un tipo...</option>
                    {(developmentTypesData || []).map((dt) => (
                      <option key={dt._id} value={dt._id}>
                        {dt.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-2">
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>
                    Fechas <span className="text-danger">*</span>
                  </Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <Form.Control
                      type="date"
                      value={taskForm.fechaInicio}
                      onChange={(e) =>
                        setTaskForm((f) => ({
                          ...f,
                          fechaInicio: e.target.value,
                        }))
                      }
                    />
                    <span className="mx-1">/</span>
                    <Form.Control
                      type="date"
                      value={taskForm.fechaFinal}
                      onChange={(e) =>
                        setTaskForm((f) => ({
                          ...f,
                          fechaFinal: e.target.value,
                        }))
                      }
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Porcentaje (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={taskForm.porcentaje}
                    onChange={(e) =>
                      setTaskForm((f) => ({
                        ...f,
                        porcentaje: Number(e.target.value),
                      }))
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex gap-2">
              {editingTaskId ? (
                <>
                  <Button variant="success" onClick={handleSaveTask}>
                    Guardar
                  </Button>
                  <Button variant="secondary" onClick={handleCancelEditTask}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={handleSaveTask}>
                  Agregar Tarea
                </Button>
              )}
            </div>
          </div>

          <h6 className="mb-2">Tareas Asignadas</h6>
          <Table bordered hover size="sm">
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Tipo Desarrollo</th>
                <th style={{ minWidth: '200px' }}>Fechas</th>
                <th>Avance</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!moduleTasks || moduleTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted">
                    No hay tareas asignadas a este módulo.
                  </td>
                </tr>
              ) : (
                moduleTasks.map((task) => {
                  const devType = developmentTypesData?.find(
                    (dt) => dt._id === task.developmentTypeId
                  );
                  const isEditing = editingTaskId === task._id;
                  return (
                    <tr
                      key={task._id}
                      className={
                        isEditing ? 'table-warning' : 'hover-highlight'
                      }
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleOpenActivityModal(task._id, event)}
                    >
                      <td>{task.nombreActividad}</td>
                      <td>{devType ? devType.nombre : '-'}</td>
                      <td>
                        {formatShortDate(task.fechaInicio)}{' '}
                        <span className="mx-1">/</span>{' '}
                        {formatShortDate(task.fechaFinal)}
                      </td>
                      <td>
                        <span className="badge bg-info">
                          {task.porcentaje}%
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {!editingTaskId && (
                          <>
                            <Button
                              size="sm"
                              variant="warning"
                              onClick={() => handleEditTask(task)}
                              className="me-1"
                              title="Editar"
                              aria-label="Editar"
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteTask(task._id)}
                              title="Eliminar"
                              aria-label="Eliminar"
                            >
                              <FaTrash />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseTaskModal}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

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
                      {[...taskActivities]
                        .sort((a, b) => {
                          const clean = (v) => {
                            if (v === null || v === undefined) return 0;
                            const s = String(v).replace(/[^0-9.-]/g, '');
                            const n = parseFloat(s);
                            return isNaN(n) ? 0 : n;
                          };
                          const pa = clean(a.porcentajeNuevo);
                          const pb = clean(b.porcentajeNuevo);
                          if (pa !== pb) return pa - pb;
                          return new Date(a.createdAt) - new Date(b.createdAt);
                        })
                        .map((activity) => {
                          const cambio =
                            activity.porcentajeNuevo -
                            activity.porcentajeAnterior;
                          const esCambioPositivo = cambio > 0;
                          return (
                            <Card key={activity._id} className="mb-2">
                              <Card.Body className="py-2">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <div className="mb-1">
                                      <span className="badge bg-secondary me-1">
                                        {activity.porcentajeAnterior}%
                                      </span>
                                      <span className="me-1">→</span>
                                      <span
                                        className={`badge bg-${getPercentVariant(
                                          activity.porcentajeNuevo
                                        )} me-2`}
                                      >
                                        {activity.porcentajeNuevo}%
                                      </span>
                                      {cambio !== 0 && (
                                        <small
                                          className={
                                            esCambioPositivo
                                              ? 'text-success fw-bold'
                                              : 'text-danger fw-bold'
                                          }
                                        >
                                          {esCambioPositivo ? '+' : ''}
                                          {Math.abs(cambio).toFixed(1)}%
                                        </small>
                                      )}
                                    </div>
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

export default ModulosPage;
