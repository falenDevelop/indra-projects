import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { Modal, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const ReportePage = () => {
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [expandedTeams, setExpandedTeams] = useState({});
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedDevType, setSelectedDevType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dateFilterMode, setDateFilterMode] = useState('ayer');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Estado para controlar qué tipos de desarrollo están visibles
  const [visibleDevTypes, setVisibleDevTypes] = useState({});

  const getPercentVariant = (v) => {
    if (v === null || v === undefined) return 'danger';
    const s = String(v).replace(/[^0-9.-]/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return 'danger';
    if (n <= 60) return 'danger';
    if (n <= 90) return 'warning';
    return 'success';
  };

  // Cargar bloques
  const blocksData = useQuery(api.blocks.list);
  const projectsData = useQuery(api.projects.list);

  // Cargar datos del reporte
  const reportData = useQuery(
    api.reports.getReportData,
    selectedBlockId ? { blockId: selectedBlockId } : 'skip'
  );

  // Cargar actividades del módulo seleccionado
  const moduleActivities = useQuery(
    api.reports.getModuleActivities,
    selectedModule ? { moduleId: selectedModule } : 'skip'
  );

  // Si el tipo seleccionado es 'defect' o 'defecto', cargar defects para el módulo
  const isSelectedDevTypeDefect = selectedDevType
    ? String(selectedDevType).toLowerCase().includes('defect') ||
      String(selectedDevType).toLowerCase().includes('defecto')
    : false;

  const defectsForModule = useQuery(
    api.defects.listByModule,
    selectedModule && isSelectedDevTypeDefect
      ? { moduleId: selectedModule }
      : 'skip'
  );

  // Cargar todas las actividades del usuario seleccionado (sin filtrar por módulo)
  const userActivities = useQuery(
    api.getUserActivities.getUserActivities,
    selectedUser ? { userName: selectedUser.nombre } : 'skip'
  );

  // Seleccionar el segundo bloque por defecto
  // Auto-select first project and its first block when data loads
  React.useEffect(() => {
    if ((projectsData || []).length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsData[0]._id);
    }
  }, [projectsData, selectedProjectId]);

  React.useEffect(() => {
    if (!blocksData) return;
    const filtered = (blocksData || []).filter((b) =>
      selectedProjectId ? b.projectId === selectedProjectId : true
    );
    if (filtered.length > 0) {
      setSelectedBlockId((prev) => (prev ? prev : filtered[0]._id));
    } else {
      setSelectedBlockId(null);
    }
  }, [blocksData, selectedProjectId]);

  const toggleTeam = (teamName) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamName]: !prev[teamName],
    }));
  };

  const toggleTask = (taskId) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleUserClick = (userName, userXp, moduleId) => {
    setSelectedModule(moduleId);
    setSelectedUser({ nombre: userName, xp: userXp });
    setDateFilterMode('ayer');
    setCustomStart('');
    setCustomEnd('');
    setShowUserModal(true);
  };

  const handleModuleClick = (moduleId, devType = null) => {
    setSelectedModule(moduleId);
    setSelectedDevType(devType);
    setShowModal(true);
  };

  const getProgressColor = (value) => {
    if (value === 0) return 'secondary';
    if (value === 100) return 'success';
    if (value >= 75) return 'primary';
    if (value >= 50) return 'warning';
    return 'danger';
  };

  const getDefectBadgeVariant = (estado) => {
    if (!estado) return 'secondary';
    const s = String(estado).toLowerCase();
    if (s === 'resuelto') return 'success';
    if (s === 'descartado') return 'secondary';
    if (s === 'bloqueante') return 'danger';
    if (s === 'observado') return 'warning';
    if (s === 'validar qa' || s === 'validar QA'.toLowerCase()) return 'info';
    if (s === 'procesos' || s === 'validacion banco') return 'primary';
    if (s === 'pendiente') return 'secondary';
    return 'dark';
  };

  const isYesterday = (timestamp) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const activityDate = new Date(timestamp);
    return activityDate >= yesterday && activityDate <= yesterdayEnd;
  };

  // Abrir automáticamente las tareas con actividades de ayer al mostrar el modal
  React.useEffect(() => {
    if (showModal && moduleActivities && moduleActivities.tasks) {
      const newExpanded = {};
      moduleActivities.tasks.forEach((task) => {
        if (
          task.activities.some((activity) => isYesterday(activity.createdAt))
        ) {
          newExpanded[task._id] = true;
        } else {
          newExpanded[task._id] = false;
        }
      });
      setExpandedTasks(newExpanded);
    }
  }, [showModal, moduleActivities]);

  // Obtener tipos de desarrollo únicos
  const developmentTypes = useMemo(() => {
    if (!reportData?.teams) return [];
    const types = new Set();
    reportData.teams.forEach((team) => {
      team.modules.forEach((module) => {
        Object.keys(module.porcentajesPorTipo || {}).forEach((type) =>
          types.add(type)
        );
      });
    });
    return Array.from(types);
  }, [reportData]);

  // Inicializar todos los tipos como visibles cuando cambien los developmentTypes
  React.useEffect(() => {
    if (developmentTypes.length > 0) {
      const allVisible = {};
      developmentTypes.forEach((type) => {
        allVisible[type] = true;
      });
      setVisibleDevTypes(allVisible);
    }
  }, [developmentTypes]);

  // Obtener solo los tipos visibles
  const visibleTypes = useMemo(() => {
    return developmentTypes.filter((type) => visibleDevTypes[type]);
  }, [developmentTypes, visibleDevTypes]);

  // Función para alternar la visibilidad de un tipo
  const toggleDevType = (type) => {
    setVisibleDevTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Función para seleccionar/deseleccionar todos
  const toggleAllDevTypes = () => {
    const allSelected = developmentTypes.every((type) => visibleDevTypes[type]);
    const newVisible = {};
    developmentTypes.forEach((type) => {
      newVisible[type] = !allSelected;
    });
    setVisibleDevTypes(newVisible);
  };

  // Función para calcular el porcentaje basado solo en los tipos visibles
  const calculateVisiblePercentage = (module) => {
    if (!module.porcentajesPorTipo || visibleTypes.length === 0) return 0;

    const visiblePercentages = visibleTypes
      .map((type) => module.porcentajesPorTipo[type])
      .filter((p) => p !== null && p !== undefined);

    if (visiblePercentages.length === 0) return 0;

    const sum = visiblePercentages.reduce((a, b) => a + b, 0);
    return sum / visiblePercentages.length;
  };

  if (!blocksData) {
    return (
      <div className="min-vh-100 bg-light p-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedBlock = blocksData?.find((b) => b._id === selectedBlockId);
  const totalModules =
    reportData?.teams?.reduce((sum, team) => sum + team.modules.length, 0) || 0;

  return (
    <div className="min-vh-100 bg-light p-4">
      {/* Header con selector de bloque */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="display-5 fw-bold text-dark mb-2">
              📊 Reporte de Avance por Feature
            </h1>
            <p className="text-muted">
              Vista detallada de módulos, equipos y porcentaje de avance por
              proceso
            </p>
          </div>
          <div style={{ minWidth: '500px' }}>
            <label className="form-label fw-semibold">
              Seleccionar Proyecto:
            </label>
            <select
              className="form-select form-select-lg mb-2"
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">-- Todos los proyectos --</option>
              {(projectsData || []).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: '300px' }}>
            <label className="form-label fw-semibold">
              Seleccionar Bloque:
            </label>
            <select
              className="form-select form-select-lg"
              value={selectedBlockId || ''}
              onChange={(e) => setSelectedBlockId(e.target.value)}
            >
              <option value="">-- Seleccione un bloque --</option>
              {(blocksData || [])
                .filter((b) =>
                  selectedProjectId ? b.projectId === selectedProjectId : true
                )
                .map((block) => (
                  <option key={block._id} value={block._id}>
                    {block.nombre}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {selectedBlock && (
          <div className="alert alert-info">
            <strong>{selectedBlock.nombre}</strong> - {totalModules} módulo
            {totalModules !== 1 ? 's' : ''} en total
          </div>
        )}

        {/* Filtro de tipos de desarrollo */}
        {developmentTypes.length > 0 && (
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="card-title mb-3">
                <i className="bi bi-funnel"></i> Filtrar Columnas de Tipos de
                Desarrollo
              </h6>
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="toggle-all"
                    checked={developmentTypes.every(
                      (type) => visibleDevTypes[type]
                    )}
                    onChange={toggleAllDevTypes}
                  />
                  <label
                    className="form-check-label fw-bold"
                    htmlFor="toggle-all"
                  >
                    Todos
                  </label>
                </div>
                <div className="vr"></div>
                {developmentTypes.map((type) => (
                  <div key={type} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`type-${type}`}
                      checked={visibleDevTypes[type] || false}
                      onChange={() => toggleDevType(type)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`type-${type}`}
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-2 small text-muted">
                <i className="bi bi-info-circle"></i> Los porcentajes de avance
                se calcularán solo con los tipos seleccionados
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de reporte */}
      {reportData?.teams && reportData.teams.length > 0 ? (
        <div className="card shadow">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-primary">
                <tr>
                  <th
                    className="px-3 py-3 text-start fw-semibold"
                    style={{ width: '40px' }}
                  ></th>
                  <th
                    className="px-3 py-3 text-start fw-semibold"
                    style={{ minWidth: '250px' }}
                  >
                    Equipo / Módulo
                  </th>
                  <th
                    className="px-3 py-3 text-start fw-semibold"
                    style={{ minWidth: '180px' }}
                  >
                    Responsable
                  </th>
                  <th
                    className="px-3 py-3 text-start fw-semibold"
                    style={{ minWidth: '120px' }}
                  >
                    Fecha Final
                  </th>
                  <th className="px-3 py-3 text-start fw-semibold">Estado</th>
                  {visibleTypes.map((type) => (
                    <th
                      key={type}
                      className="px-2 py-3 text-center fw-semibold"
                      style={{ width: '100px' }}
                    >
                      {type}
                    </th>
                  ))}
                  <th
                    className="px-3 py-3 text-center fw-semibold"
                    style={{ width: '120px' }}
                  >
                    % Avance Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.teams.map((team) => (
                  <React.Fragment key={team._id}>
                    {/* Fila del Equipo */}
                    <tr
                      className="table-info cursor-pointer"
                      onClick={() => toggleTeam(team.nombre)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td
                        className="px-3 py-3"
                        colSpan={5 + visibleTypes.length + 2}
                      >
                        <div className="d-flex align-items-center gap-2 fw-bold">
                          {expandedTeams[team.nombre] ? (
                            <ChevronDown className="me-1" size={20} />
                          ) : (
                            <ChevronRight className="me-1" size={20} />
                          )}
                          <span>{team.nombre}</span>
                          <span className="ms-2 badge bg-white text-primary">
                            {team.modules.length} módulo
                            {team.modules.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Filas de Módulos */}
                    {expandedTeams[team.nombre] &&
                      team.modules.map((module) => (
                        <tr key={module._id} className="border-bottom">
                          <td className="px-3 py-3 text-center">
                            {module.actividadesAyer > 0 && (
                              <Activity className="text-success" size={16} />
                            )}
                          </td>
                          <td
                            className="px-3 py-3"
                            style={{ cursor: 'default' }}
                          >
                            <div className="fw-medium text-dark">
                              {module.nombre}
                            </div>
                            {module.actividadesAyer > 0 && (
                              <div className="small text-success mt-1">
                                {module.actividadesAyer} cambio
                                {module.actividadesAyer !== 1 ? 's' : ''} ayer
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="d-flex flex-wrap gap-1">
                              {module.responsables.map((resp, i) => (
                                <span
                                  key={i}
                                  className={`badge ${
                                    resp.isFocal
                                      ? 'bg-warning text-dark fw-bold'
                                      : 'bg-secondary'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUserClick(
                                      resp.nombre,
                                      '',
                                      module._id
                                    );
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  title={`Ver actividades de ${resp.nombre}`}
                                >
                                  {resp.isFocal && '⭐ '}
                                  {resp.nombre}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center align-middle">
                            {(() => {
                              const fechaFinal = module.fechaFinal;
                              
                              if (!fechaFinal || fechaFinal === '' || fechaFinal === 'null' || fechaFinal === 'undefined') {
                                return <span className="text-muted">Vacío</span>;
                              }
                              
                              // Verificar formato válido
                              if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaFinal)) {
                                return <span className="text-muted">Vacío</span>;
                              }
                              
                              // Convertir a formato dd/mm/yyyy
                              const [year, month, day] = fechaFinal.split('-');
                              return <span>{`${day}/${month}/${year}`}</span>;
                            })()}
                          </td>
                          <td className="px-3 py-3">
                            <span className="badge bg-info text-dark">
                              {module.estado}
                            </span>
                          </td>
                          {visibleTypes.map((type) => {
                            const hasType =
                              module.porcentajesPorTipo &&
                              Object.prototype.hasOwnProperty.call(
                                module.porcentajesPorTipo,
                                type
                              );
                            const percentage = hasType
                              ? module.porcentajesPorTipo[type]
                              : null;
                            
                            // Verificar si es columna de defectos
                            const isDefectType = String(type).toLowerCase().includes('defect') || 
                                                String(type).toLowerCase().includes('defecto');
                            
                            return (
                              <td
                                key={type}
                                className="px-2 py-3 text-center"
                                onClick={isDefectType ? (e) => {
                                  e.stopPropagation();
                                  handleModuleClick(module._id, type);
                                } : undefined}
                                style={isDefectType ? { cursor: 'pointer' } : undefined}
                                title={isDefectType ? `Ver defectos de ${type}` : undefined}
                              >
                                {percentage === null ? (
                                  <span className="text-muted">No aplica</span>
                                ) : (
                                  <span
                                    className={`badge bg-${getProgressColor(
                                      percentage
                                    )}`}
                                  >
                                    {percentage.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td
                            className="px-3 py-3 text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModuleClick(module._id, null);
                            }}
                            style={{ cursor: 'pointer' }}
                            title="Ver todas las actividades"
                          >
                            {(() => {
                              const visiblePercentage =
                                calculateVisiblePercentage(module);
                              return (
                                <div className="d-flex align-items-center justify-content-center gap-2">
                                  <div
                                    className="progress flex-grow-1"
                                    style={{ maxWidth: '60px', height: '8px' }}
                                  >
                                    <div
                                      className={`progress-bar ${
                                        visiblePercentage >= 75
                                          ? 'bg-success'
                                          : visiblePercentage >= 50
                                            ? 'bg-primary'
                                            : visiblePercentage >= 25
                                              ? 'bg-warning'
                                              : 'bg-danger'
                                      }`}
                                      style={{
                                        width: `${visiblePercentage}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="fw-bold text-dark small"
                                    style={{
                                      minWidth: '50px',
                                      textAlign: 'right',
                                    }}
                                  >
                                    {visiblePercentage.toFixed(1)}%
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">
          {selectedBlockId
            ? 'No hay módulos en este bloque'
            : 'Seleccione un bloque para ver los módulos'}
        </div>
      )}

      {/* Modal de Actividades */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Detalle de Actividades
            {selectedDevType && (
              <span className="badge bg-primary ms-2">{selectedDevType}</span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isSelectedDevTypeDefect ? (
            <div>
              <h5 className="mb-3">Defectos</h5>
              {!defectsForModule || defectsForModule.length === 0 ? (
                <div className="text-muted">
                  No hay defectos registrados para este módulo.
                </div>
              ) : (
                <>
                  {/* Sección de conteo por estado */}
                  {(() => {
                    const countByEstado = {};
                    defectsForModule.forEach((d) => {
                      const estado = d.estado || 'Sin Estado';
                      countByEstado[estado] = (countByEstado[estado] || 0) + 1;
                    });

                    return (
                      <div className="card mb-3 bg-light">
                        <div className="card-body">
                          <h6 className="card-title mb-3">
                            Resumen por Estado
                          </h6>
                          <div className="d-flex flex-wrap gap-2">
                            {Object.entries(countByEstado)
                              .sort(([a], [b]) => a.localeCompare(b, 'es'))
                              .map(([estado, count]) => (
                                <span
                                  key={estado}
                                  className={`badge bg-${getDefectBadgeVariant(estado)} text-white py-2 px-3`}
                                >
                                  {estado}: {count}
                                </span>
                              ))}
                          </div>
                          <div className="mt-2 text-end">
                            <strong>Total: {defectsForModule.length}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Listado de defectos ordenado por estado */}
                  <div className="list-group">
                    {[...defectsForModule]
                      .sort((a, b) => {
                        const ea = String(a.estado || '').toLowerCase();
                        const eb = String(b.estado || '').toLowerCase();
                        return ea.localeCompare(eb, 'es', {
                          sensitivity: 'base',
                        });
                      })
                      .map((d) => (
                        <div
                          key={d.id}
                          className="list-group-item d-flex justify-content-between align-items-start"
                        >
                          <div>
                            <div className="fw-bold d-flex align-items-center gap-2">
                              <span
                                className={`badge bg-${getDefectBadgeVariant(d.estado)} text-white`}
                              >
                                {d.estado}
                              </span>
                              <a
                                href={`https://jira.globaldevtools.bbva.com/browse/${d.ticket}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {d.ticket}
                              </a>
                            </div>
                            {d.data && (
                              <div className="small text-primary">
                                Data: {d.data}
                              </div>
                            )}
                            <div className="small">{d.comentario}</div>
                            <div className="small text-muted mt-1">
                              Creado por: {d.creadoPor || '-'}
                            </div>
                          </div>
                          <div className="text-end">
                            <small className="text-muted">
                              {d.creadoAt
                                ? new Date(d.creadoAt).toLocaleString('es-PE')
                                : ''}
                            </small>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          ) : moduleActivities ? (
            <div>
              <h5 className="mb-3">{moduleActivities.module?.nombre}</h5>
              <p className="text-muted">
                {moduleActivities.module?.descripcion}
              </p>

              <h6 className="mt-4 mb-3">
                {selectedDevType
                  ? `Tareas de ${selectedDevType}:`
                  : 'Todas las Tareas y Actividades:'}
              </h6>
              {moduleActivities.tasks
                .filter((task) =>
                  selectedDevType
                    ? task.developmentType === selectedDevType
                    : true
                )
                .sort((a, b) => {
                  const cleanNum = (v) => {
                    if (v === null || v === undefined) return 0;
                    const s = String(v).replace(/[^0-9.-]/g, '');
                    const n = parseFloat(s);
                    return isNaN(n) ? 0 : n;
                  };
                  const pa = cleanNum(a.porcentaje);
                  const pb = cleanNum(b.porcentaje);
                  if (pa !== pb) return pa - pb;
                  // tie-breaker by fechaInicio if available
                  try {
                    return new Date(a.fechaInicio) - new Date(b.fechaInicio);
                  } catch {
                    return 0;
                  }
                })
                .map((task) => (
                  <div key={task._id} className="card mb-3">
                    <div
                      className="card-header bg-light"
                      onClick={() => toggleTask(task._id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                          {expandedTasks[task._id] ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                          <strong>{task.nombre}</strong>
                        </div>
                        <div>
                          <span className="badge bg-primary me-2">
                            {task.developmentType}
                          </span>
                          <span
                            className={`badge bg-${getPercentVariant(task.porcentaje)}`}
                          >
                            {task.porcentaje}%
                          </span>
                        </div>
                      </div>
                      <small className="text-muted d-block mt-1">
                        {task.fechaInicio} - {task.fechaFinal}
                      </small>
                    </div>
                    {expandedTasks[task._id] && (
                      <div className="card-body">
                        {task.activities.length > 0 ? (
                          <div className="list-group list-group-flush">
                            {[...task.activities]
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
                                return (
                                  new Date(a.createdAt) - new Date(b.createdAt)
                                );
                              })
                              .map((activity) => {
                                const fromYesterday = isYesterday(
                                  activity.createdAt
                                );
                                return (
                                  <div
                                    key={activity._id}
                                    className="list-group-item"
                                    style={{
                                      backgroundColor: fromYesterday
                                        ? '#fff3cd'
                                        : 'transparent',
                                      borderLeft: fromYesterday
                                        ? '4px solid #ffc107'
                                        : 'none',
                                    }}
                                  >
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div className="flex-grow-1">
                                        <p className="mb-1">
                                          {activity.descripcion}
                                        </p>
                                        <small className="text-muted">
                                          Por: {activity.registradoPor} (
                                          {activity.registradoPorXp}){' - '}
                                          {new Date(
                                            activity.createdAt
                                          ).toLocaleString('es-PE')}
                                        </small>
                                      </div>
                                      <div className="text-end ms-3">
                                        <div>
                                          <span className="badge bg-secondary">
                                            {activity.porcentajeAnterior}%
                                          </span>
                                          {' → '}
                                          <span
                                            className={`badge bg-${getPercentVariant(
                                              activity.porcentajeNuevo
                                            )}`}
                                          >
                                            {activity.porcentajeNuevo}%
                                          </span>
                                        </div>
                                        <small className="text-success fw-bold">
                                          {activity.porcentajeNuevo >
                                          activity.porcentajeAnterior
                                            ? '+'
                                            : ''}
                                          {(
                                            activity.porcentajeNuevo -
                                            activity.porcentajeAnterior
                                          ).toFixed(1)}
                                          %
                                        </small>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <p className="text-muted mb-0">
                            No hay actividades registradas
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              {moduleActivities.tasks.filter((task) =>
                selectedDevType
                  ? task.developmentType === selectedDevType
                  : true
              ).length === 0 && (
                <div className="alert alert-warning">
                  No hay tareas registradas
                  {selectedDevType && ` de tipo "${selectedDevType}"`}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Actividades por Usuario */}
      <Modal
        show={showUserModal}
        onHide={() => setShowUserModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Registro de actividades de {selectedUser?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {userActivities && selectedUser ? (
            <div>
              <div className="mb-3 d-flex align-items-center gap-2">
                <label className="form-label mb-0">Filtrar por:</label>
                <select
                  className="form-select w-auto"
                  value={dateFilterMode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDateFilterMode(v);
                    if (v === 'ayer') {
                      setCustomStart('');
                      setCustomEnd('');
                    }
                  }}
                >
                  <option value="ayer">Ayer</option>
                  <option value="personalizado">Personalizado</option>
                </select>
                {dateFilterMode === 'personalizado' && (
                  <div className="d-flex gap-2 ms-2">
                    <input
                      type="date"
                      className="form-control"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                    <input
                      type="date"
                      className="form-control"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <h5 className="mb-4">
                Actividades registradas por {selectedUser.nombre}
              </h5>
              {/** compute filtered activities based on dateFilterMode */}
              {(() => {
                const msPerDay = 24 * 60 * 60 * 1000;
                let filtered = userActivities || [];
                if (dateFilterMode === 'ayer') {
                  filtered = filtered.filter((a) => isYesterday(a.createdAt));
                } else if (dateFilterMode === 'personalizado') {
                  if (customStart && customEnd) {
                    const [sy, sm, sd] = customStart.split('-').map(Number);
                    const [ey, em, ed] = customEnd.split('-').map(Number);
                    const startUtc = Date.UTC(sy, sm - 1, sd);
                    const endUtc = Date.UTC(ey, em - 1, ed) + msPerDay - 1;
                    filtered = filtered.filter(
                      (a) => a.createdAt >= startUtc && a.createdAt <= endUtc
                    );
                  } else {
                    filtered = [];
                  }
                }
                return filtered.length > 0 ? (
                  filtered.map((activity) => {
                    const fromYesterday = isYesterday(activity.createdAt);
                    return (
                      <div
                        key={activity._id}
                        className="card mb-3"
                        style={{
                          backgroundColor: fromYesterday
                            ? '#fff9e6'
                            : 'transparent',
                          borderLeft: fromYesterday
                            ? '4px solid #ffc107'
                            : 'none',
                        }}
                      >
                        <div className="card-header bg-light d-flex justify-content-between align-items-center">
                          <div>
                            <span className="badge bg-primary me-2">
                              {activity.moduleName}
                            </span>
                            <span className="badge bg-info">
                              {activity.taskName}
                            </span>
                          </div>
                        </div>
                        <div className="card-body">
                          <strong className="d-block mb-2">
                            {activity.descripcion}
                          </strong>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              {new Date(activity.createdAt).toLocaleString(
                                'es-PE'
                              )}
                            </small>
                            <div className="text-end">
                              <div>
                                <span className="badge bg-secondary">
                                  {activity.porcentajeAnterior}%
                                </span>
                                {' → '}
                                <span
                                  className={`badge bg-${getPercentVariant(
                                    activity.porcentajeNuevo
                                  )}`}
                                >
                                  {activity.porcentajeNuevo}%
                                </span>
                              </div>
                              <small
                                className={`fw-bold ${
                                  activity.porcentajeNuevo >
                                  activity.porcentajeAnterior
                                    ? 'text-success'
                                    : 'text-danger'
                                }`}
                              >
                                {activity.porcentajeNuevo >
                                activity.porcentajeAnterior
                                  ? '+'
                                  : ''}
                                {(
                                  activity.porcentajeNuevo -
                                  activity.porcentajeAnterior
                                ).toFixed(1)}
                                %
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="alert alert-warning">
                    No hay actividades registradas por {selectedUser.nombre}.
                  </div>
                );
              })()}
              {/* Tareas para hoy (si hay módulo seleccionado) */}
              {moduleActivities &&
                moduleActivities.tasks &&
                (() => {
                  const today = new Date();
                  const yyyy = today.getFullYear();
                  const mm = String(today.getMonth() + 1).padStart(2, '0');
                  const dd = String(today.getDate()).padStart(2, '0');
                  const todayStr = `${yyyy}-${mm}-${dd}`;
                  const tasksToday = moduleActivities.tasks.filter(
                    (t) => t.fechaInicio === todayStr
                  );
                  return tasksToday.length > 0 ? (
                    <div className="mt-4">
                      <h6>Tareas para hoy</h6>
                      <div className="list-group">
                        {tasksToday.map((t) => (
                          <div
                            key={t._id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <strong>{t.nombre}</strong>
                              <div className="small text-muted">
                                {t.fechaInicio} - {t.fechaFinal}
                              </div>
                            </div>
                            <span
                              className={`badge bg-${getProgressColor(t.porcentaje)}`}
                            >
                              {t.porcentaje}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
            </div>
          ) : (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowUserModal(false);
              setDateFilterMode('ayer');
              setCustomStart('');
              setCustomEnd('');
              setSelectedUser(null);
            }}
          >
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ReportePage;
