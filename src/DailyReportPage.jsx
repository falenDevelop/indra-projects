import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Modal,
  Form,
  Table,
} from 'react-bootstrap';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
};

const toYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const getEstadoVariant = (estado) => {
  if (!estado) return 'secondary';
  const s = String(estado).toLowerCase();
  if (s === 'resuelto') return 'success';
  if (s === 'descartado') return 'secondary';
  if (s === 'vencido') return 'danger';
  if (s === 'en progreso' || s === 'en-progreso' || s === 'progreso')
    return 'info';
  return 'warning';
};

const DailyReportPage = () => {
  const projectsQuery = useQuery(api.projects.list);
  const blocksQuery = useQuery(api.blocks.list);
  const teamsQuery = useQuery(api.teams.list);
  const teamMembersQuery = useQuery(api.team_members.list);
  const modulesQuery = useQuery(api.modules.list);

  const projects = useMemo(() => projectsQuery || [], [projectsQuery]);
  const blocks = useMemo(() => blocksQuery || [], [blocksQuery]);
  const teams = useMemo(() => teamsQuery || [], [teamsQuery]);
  const teamMembers = useMemo(() => teamMembersQuery || [], [teamMembersQuery]);
  const modules = useMemo(() => modulesQuery || [], [modulesQuery]);

  const [showMemberModal, setShowMemberModal] = useState(false);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [modalMember, setModalMember] = useState(null);
  const [modalModuleId, setModalModuleId] = useState(null);

  const handleOpenModal = (member, moduleId) => {
    setModalMember(member);
    setModalModuleId(moduleId);
    setShowMemberModal(true);
  };

  const handleCloseModal = () => {
    setShowMemberModal(false);
    setModalMember(null);
    setModalModuleId(null);
  };

  const filteredTeams = useMemo(() => {
    let t = teams;
    if (selectedBlock)
      t = t.filter((x) => {
        if (!x.bloque) return false;
        if (x.bloque === selectedBlock) return true;
        const blockObj = blocks.find((b) => b._id === selectedBlock);
        if (blockObj && x.bloque === blockObj.nombre) return true;
        return false;
      });

    if (selectedProject)
      t = t.filter((x) => {
        if (x.projectId === selectedProject) return true;
        // team might store bloque name; check block -> projectId
        const teamBlock = blocks.find(
          (b) => b.nombre === x.bloque || b._id === x.bloque
        );
        if (teamBlock && teamBlock.projectId === selectedProject) return true;
        // fallback: compare against project name
        const proj = projects.find((p) => p._id === selectedProject);
        if (proj) {
          if (x.bloque === proj.nombre) return true;
          if (x.projectId === proj.nombre) return true;
        }
        return false;
      });

    return t;
  }, [teams, selectedBlock, selectedProject, blocks, projects]);

  // helpers for modal queries
  const moduleTasks = useQuery(
    api.module_tasks.listByModule,
    modalModuleId ? { moduleId: modalModuleId } : 'skip'
  );
  const defectsForModule = useQuery(
    api.defects.listByModule,
    modalModuleId ? { moduleId: modalModuleId } : 'skip'
  );
  // all activities and all tasks (to show cross-module activities)
  const allTaskActivitiesQuery = useQuery(api.task_activities.list);
  const allModuleTasksQuery = useQuery(api.module_tasks.list);
  const allTaskActivities = useMemo(
    () => allTaskActivitiesQuery || [],
    [allTaskActivitiesQuery]
  );
  const allModuleTasks = useMemo(
    () => allModuleTasksQuery || [],
    [allModuleTasksQuery]
  );

  const updateDefect = useMutation(api.defects.update);
  const [updatingId, setUpdatingId] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const updateTask = useMutation(api.module_tasks.update);
  const [taskProgress, setTaskProgress] = useState({});

  const handleFechaCompromisoChange = async (defect, fecha) => {
    const id = defect._id || defect.id;
    if (!id) return;
    setUpdatingId(id);
    try {
      await updateDefect({
        id,
        ticket: defect.ticket || '',
        estado: defect.estado || '',
        fechaCompromiso: fecha,
        comentario: defect.comentario || '',
      });
    } catch (err) {
      console.error('Error updating fechaCompromiso:', err);
      alert('Error al actualizar la fecha de compromiso');
    } finally {
      setUpdatingId(null);
    }
  };

  // compute yesterday/today strings once (avoid impure calls during render)
  const { today, yesterday, todayStr, yesterdayStr } = useMemo(() => {
    const t = new Date();
    const y = new Date(t.getTime() - 24 * 60 * 60 * 1000);
    return {
      today: t,
      yesterday: y,
      todayStr: toYMD(t),
      yesterdayStr: toYMD(y),
    };
  }, []);

  // derive lists for modal
  // (module-specific finished tasks, kept for reference)
  // const tasksDoneYesterday = (moduleTasks || []).filter((t) => t.fechaFinal === yesterdayStr);
  const activitiesDoneYesterday = useMemo(() => {
    if (!modalMember) return [];
    const name = modalMember.nombre;
    return (allTaskActivities || [])
      .filter((a) => {
        if (!a.registradoPor) return false;
        if (a.registradoPor !== name) return false;
        if (!a.createdAt) return false;
        const d = new Date(a.createdAt);
        return toYMD(d) === yesterdayStr;
      })
      .map((a) => {
        const task = (allModuleTasks || []).find(
          (t) => t._id === a.taskId || t.id === a.taskId
        );
        return {
          activity: a,
          task,
        };
      });
  }, [allTaskActivities, allModuleTasks, modalMember, yesterdayStr]);
  const tasksForToday = (moduleTasks || []).filter((t) => {
    if (!t.fechaInicio && !t.fechaFinal) return false;
    const start = t.fechaInicio || t.fechaFinal;
    const end = t.fechaFinal || t.fechaInicio;
    return start <= todayStr && end >= todayStr;
  });

  const openDefects = (defectsForModule || []).filter((d) => {
    const s = String(d.estado || '').toLowerCase();
    return s !== 'resuelto' && s !== 'descartado';
  });

  const overdueDefects = (defectsForModule || []).filter((d) => {
    const s = String(d.estado || '').toLowerCase();
    if (s === 'resuelto' || s === 'descartado') return false;
    if (!d.fechaCompromiso) return false;
    // fechaCompromiso expected in YYYY-MM-DD so string compare works
    return d.fechaCompromiso < todayStr;
  });

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold">Reporte Diario</h3>
        <p className="text-muted">
          Listado por equipo y responsables. Modal por responsable con tareas de
          ayer, tareas para hoy y defectos abiertos.
        </p>
      </div>

      <Row className="mb-3 g-2">
        <Col md={4}>
          <Form.Label className="mb-1">Proyecto</Form.Label>
          <Form.Select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">-- Todos --</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.nombre}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Label className="mb-1">Bloque</Form.Label>
          <Form.Select
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
          >
            <option value="">-- Todos --</option>
            {blocks.map((b) => (
              <option key={b._id} value={b.nombre}>
                {b.nombre}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {filteredTeams.length === 0 ? (
        <div className="text-muted">
          No hay equipos para los filtros seleccionados.
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="bg-primary text-white">
            <tr>
              <th>Equipo</th>
              <th>Módulo</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team) => {
              const members = teamMembers.filter(
                (tm) => tm.teamId === team._id
              );
              const membersByModule = members.reduce((acc, m) => {
                const mid = m.moduleId || 'sin-modulo';
                if (!acc[mid]) acc[mid] = [];
                acc[mid].push(m);
                return acc;
              }, {});

              return Object.keys(membersByModule).flatMap((moduleId) => {
                const mod = modules.find((m) => m._id === moduleId);
                const mlist = membersByModule[moduleId];
                return mlist.map((mem) => (
                  <tr key={`${team._id}-${moduleId}-${mem._id}`}>
                    <td>{team.nombre}</td>
                    <td>{mod ? mod.nombre : 'Sin módulo'}</td>
                    <td>{mem.nombre}</td>
                    <td>
                      <Badge bg={getEstadoVariant(mem.estado)}>
                        {mem.estado}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        onClick={() => handleOpenModal(mem, moduleId)}
                      >
                        Ver Daily
                      </Button>
                    </td>
                  </tr>
                ));
              });
            })}
          </tbody>
        </Table>
      )}

      <Modal show={showMemberModal} onHide={handleCloseModal} size="xl" fullscreen="md-down">
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title>
            {modalMember?.nombre}
            {modalModuleId && (
              <span className="ms-2">
                <Badge bg="secondary">
                  {modules.find((m) => m._id === modalModuleId)?.nombre || ''}
                </Badge>
              </span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <Card className="mb-3 border">
            <Card.Header className="bg-light d-flex align-items-center">
              <strong>Hecho Ayer</strong>
              <span className="text-muted ms-2 small">{formatDate(yesterday)}</span>
            </Card.Header>
            <Card.Body style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {activitiesDoneYesterday.length === 0 ? (
                <div className="text-muted text-center py-3">
                  <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                  <div>No hay tareas registradas ayer.</div>
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {activitiesDoneYesterday.map(({ activity, task }) => {
                    const key =
                      activity._id || `${activity.taskId}-${activity.createdAt}`;
                    const taskName = task?.nombreActividad || 'Tarea registrada';
                    const moduleName = task
                      ? modules.find((m) => m._id === task.moduleId)?.nombre || ''
                      : '';
                    const currentPct =
                      task?.porcentaje != null
                        ? `${task.porcentaje}%`
                        : activity.porcentajeNuevo != null
                          ? `${activity.porcentajeNuevo}%`
                          : '—';
                    const compromisoPct =
                      task?.porcentajeCompromiso != null
                        ? `${task.porcentajeCompromiso}%`
                        : '—';
                    return (
                      <li key={key} className="mb-2 pb-2 border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center">
                              <strong>{taskName}</strong>
                              {moduleName && (
                                <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>
                                  {moduleName}
                                </Badge>
                              )}
                            </div>
                            {activity.descripcion && (
                              <div className="small text-muted ms-4 mt-1">
                                {activity.descripcion}
                              </div>
                            )}
                          </div>
                          <div className="text-end ms-3" style={{ minWidth: '140px' }}>
                            <div className="mb-1 small">
                              <Badge bg="secondary" className="w-100">Actual: {currentPct}</Badge>
                            </div>
                            <div className="small">
                              <Badge bg="dark" className="w-100">Compromiso: {compromisoPct}</Badge>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Body>
          </Card>

          <Card className="mb-3 border">
            <Card.Header className="bg-light d-flex align-items-center">
              <strong>Tareas para Hoy</strong>
              <span className="text-muted ms-2 small">{formatDate(today)}</span>
            </Card.Header>
            <Card.Body style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {tasksForToday.length === 0 ? (
                <div className="text-muted text-center py-3">
                  <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                  <div>No hay tareas planificadas para hoy.</div>
                </div>
              ) : (
                <div className="list-group">
                  {tasksForToday.map((t) => {
                    const id = t._id || t.id || t.nombreActividad;
                    const currentProgress = taskProgress[id] ?? t.porcentaje ?? 0;
                    return (
                      <div
                        key={id}
                        className="list-group-item"
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center">
                              <strong>{t.nombreActividad}</strong>
                            </div>
                            <div className="small text-muted ms-3">
                              📅 {t.fechaInicio || '-'} → {t.fechaFinal || '-'}
                            </div>
                          </div>
                          <div className="text-end ms-2" style={{ minWidth: '120px' }}>
                            <div className="mb-1">
                              <Badge bg="dark" className="w-100" style={{ fontSize: '0.75rem' }}>
                                Compromiso: {t.porcentajeCompromiso != null ? `${t.porcentajeCompromiso}%` : '—'}
                              </Badge>
                            </div>
                            <div>
                              <Badge bg="secondary" className="w-100" style={{ fontSize: '0.75rem' }}>
                                Actual: {t.porcentaje != null ? `${t.porcentaje}%` : '0%'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="small text-muted">Nuevo %:</span>
                          <Form.Control
                            type="number"
                            min="0"
                            max="100"
                            size="sm"
                            style={{ width: '90px' }}
                            value={currentProgress}
                            onChange={(e) =>
                              setTaskProgress((p) => ({
                                ...p,
                                [id]: Number(e.target.value),
                              }))
                            }
                            disabled={updatingTaskId === id}
                          />
                          <Button
                            size="sm"
                            variant="success"
                            onClick={async () => {
                              if (!id) return;
                              const newVal = Number(
                                taskProgress[id] ?? t.porcentaje ?? 0
                              );
                              setUpdatingTaskId(id);
                              try {
                                await updateTask({
                                  id,
                                  nombreActividad: t.nombreActividad,
                                  developmentTypeId: t.developmentTypeId,
                                  fechaInicio: t.fechaInicio || undefined,
                                  fechaFinal: t.fechaFinal || undefined,
                                  porcentaje: t.porcentaje || 0,
                                  porcentajeCompromiso: newVal,
                                });
                              } catch (err) {
                                console.error(
                                  'Error actualizando compromiso:',
                                  err
                                );
                                alert('Error al actualizar el % de compromiso');
                              } finally {
                                setUpdatingTaskId(null);
                              }
                            }}
                            disabled={updatingTaskId === id}
                          >
                            <i className="bi bi-check-lg"></i> Guardar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="border">
            <Card.Header className="bg-light d-flex align-items-center">
              <strong>Defectos</strong>
            </Card.Header>
            <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <h6 className="text-muted mb-2">
                Abiertos ({openDefects.length})
              </h6>
              {openDefects.length === 0 ? (
                <div className="text-muted text-center py-2 mb-3">
                  <i className="bi bi-check-circle" style={{ fontSize: '1.5rem' }}></i>
                  <div className="small">No hay defectos abiertos.</div>
                </div>
              ) : (
                <div className="list-group mb-3">
                  {openDefects.map((d) => {
                    const id = d._id || d.id || d.ticket;
                    return (
                      <div key={id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <strong>{d.ticket}</strong>
                              <small className="text-muted ms-2">{d.data}</small>
                            </div>
                            <div className="small text-muted ms-4">{d.comentario}</div>
                          </div>
                          <div
                            className="text-end d-flex flex-column align-items-end ms-2"
                            style={{ gap: '6px', minWidth: '170px' }}
                          >
                            <Form.Control
                              type="date"
                              size="sm"
                              value={d.fechaCompromiso || ''}
                              onChange={(e) =>
                                handleFechaCompromisoChange(d, e.target.value)
                              }
                              disabled={updatingId === id}
                              style={{ width: '160px' }}
                            />
                            <Badge bg={getEstadoVariant(d.estado)} className="w-100">
                              {d.estado}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <h6 className="text-muted mb-2">
                Vencidos ({overdueDefects.length})
              </h6>
              {overdueDefects.length === 0 ? (
                <div className="text-muted text-center py-2">
                  <i className="bi bi-check-circle" style={{ fontSize: '1.5rem' }}></i>
                  <div className="small">No hay defectos vencidos.</div>
                </div>
              ) : (
                <div className="list-group">
                  {overdueDefects.map((d) => {
                    const id = d._id || d.id || d.ticket;
                    return (
                      <div key={`overdue-${id}`} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <strong>{d.ticket}</strong>
                              <small className="text-muted ms-2">{d.data}</small>
                            </div>
                            <div className="small text-muted ms-4">{d.comentario}</div>
                            <div className="small text-muted ms-4">
                              Compromiso: {d.fechaCompromiso ? formatDate(d.fechaCompromiso) : '—'}
                            </div>
                          </div>
                          <div
                            className="text-end d-flex flex-column align-items-end ms-2"
                            style={{ gap: '6px', minWidth: '170px' }}
                          >
                            <Form.Control
                              type="date"
                              size="sm"
                              value={d.fechaCompromiso || ''}
                              onChange={(e) =>
                                handleFechaCompromisoChange(d, e.target.value)
                              }
                              disabled={updatingId === id}
                              style={{ width: '160px' }}
                            />
                            <Badge bg="danger" className="w-100">
                              VENCIDO
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DailyReportPage;
