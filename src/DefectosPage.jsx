import React, { useState, useMemo } from 'react';
import {
  Table,
  Form,
  Row,
  Col,
  Button,
  Spinner,
  Card,
  Badge,
  Modal,
} from 'react-bootstrap';
import { useQuery, useMutation } from 'convex/react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from './useAuth';
import { api } from '../convex/_generated/api';

const DefectosPage = () => {
  const defects = useQuery(api.defects.list) || [];
  const modules = useQuery(api.modules.list) || [];

  const [moduleFilter, setModuleFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [showPruebasModal, setShowPruebasModal] = useState(false);
  const [pruebasData, setPruebasData] = useState({
    android: 0,
    ios: 0,
    huawei: 0,
    androidEjecutadas: 0,
    iosEjecutadas: 0,
    huaweiEjecutadas: 0,
  });

  const estados = useMemo(() => {
    const s = new Set(defects.map((d) => d.estado));
    return Array.from(s).filter(Boolean);
  }, [defects]);

  const filtered = useMemo(() => {
    return defects.filter((d) => {
      if (moduleFilter && d.moduleId !== moduleFilter) return false;
      if (estadoFilter && d.estado !== estadoFilter) return false;
      return true;
    });
  }, [defects, moduleFilter, estadoFilter]);

  const getModuleName = (moduleId) => {
    return modules.find((m) => m._id === moduleId)?.nombre || '—';
  };

  const handleEditClick = (d) => {
    const id = d._id || d.id;
    setEditingId(id);
    setNewDefect({
      moduleId: d.moduleId || '',
      ticket: d.ticket || '',
      data: d.data || '',
      comentario: d.comentario || '',
      estado: d.estado || estados[0] || '',
    });
    setShowCreateModal(true);
  };

  const handleDeleteClick = async (d) => {
    const id = d._id || d.id;
    if (!id) return;
    if (!window.confirm('¿Eliminar este defecto?')) return;
    try {
      await removeDefect({ id });
    } catch (err) {
      console.error('Error eliminando defecto:', err);
      alert('Error al eliminar defecto');
    }
  };

  const totalsByEstado = useMemo(() => {
    const map = {};
    filtered.forEach((d) => {
      const k = d.estado || 'Sin Estado';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [filtered]);

  const totalDefects = filtered.length;

  const totalPruebas = useMemo(() => {
    if (!moduleFilter) {
      // Todos los módulos: sumar todas las pruebas
      const android = modules.reduce(
        (sum, m) => sum + (m.pruebasAndroid || 0),
        0
      );
      const ios = modules.reduce((sum, m) => sum + (m.pruebasIOS || 0), 0);
      const huawei = modules.reduce(
        (sum, m) => sum + (m.pruebasHuawei || 0),
        0
      );
      const androidEjecutadas = modules.reduce(
        (sum, m) => sum + (m.pruebasAndroidEjecutadas || 0),
        0
      );
      const iosEjecutadas = modules.reduce(
        (sum, m) => sum + (m.pruebasIOSEjecutadas || 0),
        0
      );
      const huaweiEjecutadas = modules.reduce(
        (sum, m) => sum + (m.pruebasHuaweiEjecutadas || 0),
        0
      );
      return {
        android,
        ios,
        huawei,
        androidEjecutadas,
        iosEjecutadas,
        huaweiEjecutadas,
        androidPendientes: android - androidEjecutadas,
        iosPendientes: ios - iosEjecutadas,
        huaweiPendientes: huawei - huaweiEjecutadas,
      };
    } else {
      // Módulo específico
      const mod = modules.find((m) => m._id === moduleFilter);
      const android = mod?.pruebasAndroid || 0;
      const ios = mod?.pruebasIOS || 0;
      const huawei = mod?.pruebasHuawei || 0;
      const androidEjecutadas = mod?.pruebasAndroidEjecutadas || 0;
      const iosEjecutadas = mod?.pruebasIOSEjecutadas || 0;
      const huaweiEjecutadas = mod?.pruebasHuaweiEjecutadas || 0;
      return {
        android,
        ios,
        huawei,
        androidEjecutadas,
        iosEjecutadas,
        huaweiEjecutadas,
        androidPendientes: android - androidEjecutadas,
        iosPendientes: ios - iosEjecutadas,
        huaweiPendientes: huawei - huaweiEjecutadas,
      };
    }
  }, [modules, moduleFilter]);

  const estadoVariant = (estado) => {
    const key = (estado || '').toLowerCase();
    if (key.includes('pend')) return 'warning';
    if (key.includes('resuel')) return 'success';
    if (key.includes('descart')) return 'danger';
    if (key.includes('qa') || key.includes('valid')) return 'info';
    if (key.includes('obs')) return 'secondary';
    return 'dark';
  };

  const updateDefect = useMutation(api.defects.update);
  const [updatingId, setUpdatingId] = useState(null);
  const removeDefect = useMutation(api.defects.remove);
  const [editingId, setEditingId] = useState(null);
  const { currentUser } = useAuth();
  const createDefect = useMutation(api.defects.create);
  const updateModule = useMutation(api.modules.update);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDefect, setNewDefect] = useState({
    moduleId: '',
    ticket: '',
    data: '',
    comentario: '',
    estado: estados[0] || '',
  });

  const handleEditPruebas = () => {
    if (!moduleFilter) {
      alert('Selecciona un feature específico para editar las pruebas');
      return;
    }
    const mod = modules.find((m) => m._id === moduleFilter);
    if (!mod) return;
    setPruebasData({
      android: mod.pruebasAndroid || 0,
      ios: mod.pruebasIOS || 0,
      huawei: mod.pruebasHuawei || 0,
      androidEjecutadas: mod.pruebasAndroidEjecutadas || 0,
      iosEjecutadas: mod.pruebasIOSEjecutadas || 0,
      huaweiEjecutadas: mod.pruebasHuaweiEjecutadas || 0,
    });
    setShowPruebasModal(true);
  };

  const handleSavePruebas = async (e) => {
    e.preventDefault();
    if (!moduleFilter) return;
    try {
      const mod = modules.find((m) => m._id === moduleFilter);
      if (!mod) return;
      await updateModule({
        id: mod._id,
        nombre: mod.nombre,
        descripcion: mod.descripcion,
        estado: mod.estado,
        repositorio: mod.repositorio,
        figma: mod.figma,
        pruebasAndroid: pruebasData.android,
        pruebasIOS: pruebasData.ios,
        pruebasHuawei: pruebasData.huawei,
        pruebasAndroidEjecutadas: pruebasData.androidEjecutadas,
        pruebasIOSEjecutadas: pruebasData.iosEjecutadas,
        pruebasHuaweiEjecutadas: pruebasData.huaweiEjecutadas,
      });
      setShowPruebasModal(false);
    } catch (err) {
      console.error('Error actualizando pruebas:', err);
      alert('Error al actualizar pruebas');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDefect.moduleId || !newDefect.ticket) {
      alert('Seleccione feature y escriba el ticket');
      return;
    }
    try {
      if (editingId) {
        await updateDefect({
          id: editingId,
          ticket: newDefect.ticket,
          data: newDefect.data,
          comentario: newDefect.comentario,
          estado: newDefect.estado,
        });
      } else {
        await createDefect({
          moduleId: newDefect.moduleId,
          ticket: newDefect.ticket,
          data: newDefect.data,
          comentario: newDefect.comentario,
          estado: newDefect.estado,
          creadoPor: currentUser?.nombre || 'Usuario',
          creadoPorXp: currentUser?.xp || 'N/A',
          creadoAt: Date.now(),
        });
      }
      setShowCreateModal(false);
      setEditingId(null);
      setNewDefect({
        moduleId: '',
        ticket: '',
        data: '',
        comentario: '',
        estado: estados[0] || '',
      });
    } catch (err) {
      console.error('Error creando defecto:', err);
      alert('Error al crear defecto');
    }
  };

  const handleEstadoChange = async (defect, nuevoEstado) => {
    const id = defect._id || defect.id;
    if (!id) return;
    setUpdatingId(id);
    try {
      await updateDefect({
        id,
        ticket: defect.ticket || '',
        estado: nuevoEstado,
      });
    } catch (err) {
      console.error('Error updating defect estado:', err);
      alert('Error al actualizar estado');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <h1>Defectos</h1>

      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={3}>
              <div className="small text-muted">Total defectos registrados</div>
              <h4 className="mb-0">{totalDefects}</h4>
            </Col>
            <Col>
              <div className="small text-muted mb-2">Defectos por estado</div>
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(totalsByEstado).map(([estado, cnt]) => (
                  <Badge
                    key={estado}
                    bg={estadoVariant(estado)}
                    className="py-2 px-3"
                  >
                    {estado}: {cnt}
                  </Badge>
                ))}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Body>
          <Row className="mb-4">
            <Col>
              <h5 className="mb-3">
                {moduleFilter ? `Pruebas del Feature: ${getModuleName(moduleFilter)}` : 'Resumen Global de Pruebas'}
              </h5>
              <Row className="text-center">
                <Col md={3}>
                  <div className="p-3 bg-light rounded">
                    <div className="small text-muted">Total de Pruebas</div>
                    <h3 className="mb-0 text-primary">
                      {totalPruebas.android +
                        totalPruebas.ios +
                        totalPruebas.huawei}
                    </h3>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="p-3 bg-light rounded">
                    <div className="small text-muted">Ejecutadas</div>
                    <h3 className="mb-0 text-success">
                      {totalPruebas.androidEjecutadas +
                        totalPruebas.iosEjecutadas +
                        totalPruebas.huaweiEjecutadas}
                    </h3>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="p-3 bg-light rounded">
                    <div className="small text-muted">Pendientes</div>
                    <h3 className="mb-0 text-warning">
                      {totalPruebas.androidPendientes +
                        totalPruebas.iosPendientes +
                        totalPruebas.huaweiPendientes}
                    </h3>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="p-3 bg-success bg-opacity-10 rounded">
                    <div className="small text-muted">% Avance Global</div>
                    <h3 className="mb-0 text-success">
                      {(() => {
                        const total =
                          totalPruebas.android +
                          totalPruebas.ios +
                          totalPruebas.huawei;
                        const ejecutadas =
                          totalPruebas.androidEjecutadas +
                          totalPruebas.iosEjecutadas +
                          totalPruebas.huaweiEjecutadas;
                        return total > 0
                          ? ((ejecutadas / total) * 100).toFixed(1)
                          : 0;
                      })()}
                      %
                    </h3>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>

          <hr />

          <Row className="g-3">
            <Col md={4}>
              <Card className="h-100 border-success">
                <Card.Body>
                  <h6 className="text-success mb-3">
                    <i className="bi bi-android2"></i> Android
                  </h6>
                  <div className="mb-2">
                    <small className="text-muted">Total:</small>
                    <strong className="ms-2">{totalPruebas.android}</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Ejecutadas:</small>
                    <strong className="ms-2 text-success">
                      {totalPruebas.androidEjecutadas}
                    </strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Pendientes:</small>
                    <strong className="ms-2 text-warning">
                      {totalPruebas.androidPendientes}
                    </strong>
                  </div>
                  <div className="mt-3 pt-2 border-top">
                    <small className="text-muted">% Avance:</small>
                    <strong className="ms-2 text-success">
                      {totalPruebas.android > 0
                        ? (
                            (totalPruebas.androidEjecutadas /
                              totalPruebas.android) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </strong>
                    <div
                      className="progress mt-2"
                      style={{ height: '8px' }}
                    >
                      <div
                        className="progress-bar bg-success"
                        style={{
                          width: `${
                            totalPruebas.android > 0
                              ? (totalPruebas.androidEjecutadas /
                                  totalPruebas.android) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="h-100 border-primary">
                <Card.Body>
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-apple"></i> iOS
                  </h6>
                  <div className="mb-2">
                    <small className="text-muted">Total:</small>
                    <strong className="ms-2">{totalPruebas.ios}</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Ejecutadas:</small>
                    <strong className="ms-2 text-success">
                      {totalPruebas.iosEjecutadas}
                    </strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Pendientes:</small>
                    <strong className="ms-2 text-warning">
                      {totalPruebas.iosPendientes}
                    </strong>
                  </div>
                  <div className="mt-3 pt-2 border-top">
                    <small className="text-muted">% Avance:</small>
                    <strong className="ms-2 text-success">
                      {totalPruebas.ios > 0
                        ? (
                            (totalPruebas.iosEjecutadas /
                              totalPruebas.ios) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </strong>
                    <div
                      className="progress mt-2"
                      style={{ height: '8px' }}
                    >
                      <div
                        className="progress-bar bg-primary"
                        style={{
                          width: `${
                            totalPruebas.ios > 0
                              ? (totalPruebas.iosEjecutadas /
                                  totalPruebas.ios) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="h-100 border-danger">
                <Card.Body>
                  <h6 className="text-danger mb-3">
                    <i className="bi bi-phone"></i> Huawei
                  </h6>
                  <div className="mb-2">
                    <small className="text-muted">Total:</small>
                    <strong className="ms-2">{totalPruebas.huawei}</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Ejecutadas:</small>
                    <strong className="ms-2 text-success">
                      {totalPruebas.huaweiEjecutadas}
                    </strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Pendientes:</small>
                    <strong className="ms-2 text-warning">
                      {totalPruebas.huaweiPendientes}
                    </strong>
                  </div>
                  <div className="mt-3 pt-2 border-top">
                    <small className="text-muted">% Avance:</small>
                    <strong className="ms-2 text-success">
                      {totalPruebas.huawei > 0
                        ? (
                            (totalPruebas.huaweiEjecutadas /
                              totalPruebas.huawei) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </strong>
                    <div
                      className="progress mt-2"
                      style={{ height: '8px' }}
                    >
                      <div
                        className="progress-bar bg-danger"
                        style={{
                          width: `${
                            totalPruebas.huawei > 0
                              ? (totalPruebas.huaweiEjecutadas /
                                  totalPruebas.huawei) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {moduleFilter && (
            <Row className="mt-3">
              <Col className="text-center">
                <Button
                  variant="outline-primary"
                  onClick={handleEditPruebas}
                >
                  Editar pruebas del feature
                </Button>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      <Form className="mb-3">
        <Row className="g-2">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Feature</Form.Label>
              <Form.Select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {modules.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>Estado</Form.Label>
              <Form.Select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {estados.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </Form>

      <div className="mb-3 d-flex justify-content-end">
        <Button
          onClick={() => {
            setEditingId(null);
            setNewDefect({
              moduleId: '',
              ticket: '',
              data: '',
              comentario: '',
              estado: estados[0] || '',
            });
            setShowCreateModal(true);
          }}
        >
          Nuevo defecto
        </Button>
      </div>

      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setEditingId(null);
          setNewDefect({
            moduleId: '',
            ticket: '',
            data: '',
            comentario: '',
            estado: estados[0] || '',
          });
        }}
      >
        <Form onSubmit={handleCreate}>
          <Modal.Header closeButton>
            <Modal.Title>Registrar nuevo defecto</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Feature</Form.Label>
              <Form.Select
                value={newDefect.moduleId}
                onChange={(e) =>
                  setNewDefect((s) => ({ ...s, moduleId: e.target.value }))
                }
                required
              >
                <option value="">Seleccione...</option>
                {modules.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Ticket</Form.Label>
              <Form.Control
                value={newDefect.ticket}
                onChange={(e) =>
                  setNewDefect((s) => ({ ...s, ticket: e.target.value }))
                }
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Estado</Form.Label>
              <Form.Select
                value={newDefect.estado}
                onChange={(e) =>
                  setNewDefect((s) => ({ ...s, estado: e.target.value }))
                }
              >
                {estados.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Data</Form.Label>
              <Form.Control
                value={newDefect.data}
                onChange={(e) =>
                  setNewDefect((s) => ({ ...s, data: e.target.value }))
                }
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Observación</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newDefect.comentario}
                onChange={(e) =>
                  setNewDefect((s) => ({ ...s, comentario: e.target.value }))
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setEditingId(null);
                setNewDefect({
                  moduleId: '',
                  ticket: '',
                  data: '',
                  comentario: '',
                  estado: estados[0] || '',
                });
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">{editingId ? 'Guardar' : 'Crear'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showPruebasModal} onHide={() => setShowPruebasModal(false)}>
        <Form onSubmit={handleSavePruebas}>
          <Modal.Header closeButton>
            <Modal.Title>Editar cantidad de pruebas</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h6 className="mb-3">Android</h6>
            <Form.Group className="mb-2">
              <Form.Label>Total de pruebas</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={pruebasData.android}
                onChange={(e) =>
                  setPruebasData((s) => ({
                    ...s,
                    android: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Pruebas ejecutadas</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={pruebasData.androidEjecutadas}
                onChange={(e) =>
                  setPruebasData((s) => ({
                    ...s,
                    androidEjecutadas: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <Form.Text className="text-muted">
                Pendientes:{' '}
                {pruebasData.android - pruebasData.androidEjecutadas}
              </Form.Text>
            </Form.Group>

            <hr />

            <h6 className="mb-3">iOS</h6>
            <Form.Group className="mb-2">
              <Form.Label>Total de pruebas</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={pruebasData.ios}
                onChange={(e) =>
                  setPruebasData((s) => ({
                    ...s,
                    ios: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Pruebas ejecutadas</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={pruebasData.iosEjecutadas}
                onChange={(e) =>
                  setPruebasData((s) => ({
                    ...s,
                    iosEjecutadas: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <Form.Text className="text-muted">
                Pendientes: {pruebasData.ios - pruebasData.iosEjecutadas}
              </Form.Text>
            </Form.Group>

            <hr />

            <h6 className="mb-3">Huawei</h6>
            <Form.Group className="mb-2">
              <Form.Label>Total de pruebas</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={pruebasData.huawei}
                onChange={(e) =>
                  setPruebasData((s) => ({
                    ...s,
                    huawei: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Pruebas ejecutadas</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={pruebasData.huaweiEjecutadas}
                onChange={(e) =>
                  setPruebasData((s) => ({
                    ...s,
                    huaweiEjecutadas: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <Form.Text className="text-muted">
                Pendientes: {pruebasData.huawei - pruebasData.huaweiEjecutadas}
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowPruebasModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Table striped bordered hover responsive>
        <colgroup>
          <col style={{ width: '200px' }} />
          <col style={{ width: '200px' }} />
          <col />
          <col style={{ width: '150px' }} />
          <col style={{ width: '250px' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Ticket</th>
            <th>Data</th>
            <th>Estado</th>
            <th>Creado Por</th>
            <th>Comentario</th>
            <th style={{ width: '90px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d) => (
            <tr key={d._id || JSON.stringify(d)}>
              <td>{getModuleName(d.moduleId)}</td>
              <td>
                <a
                  href={`https://jira.globaldevtools.bbva.com/browse/${d.ticket}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {d.ticket}
                </a>
              </td>
              <td>{d.data ?? '—'}</td>
              <td>
                <Form.Select
                  value={d.estado}
                  onChange={(e) => handleEstadoChange(d, e.target.value)}
                  disabled={updatingId === (d._id || d.id)}
                  size="sm"
                >
                  {estados.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Form.Select>
                {updatingId === (d._id || d.id) && (
                  <div className="mt-1">
                    <Spinner animation="border" size="sm" />
                  </div>
                )}
              </td>
              <td>{d.creadoPor ?? '—'}</td>
              <td>{d.comentario ?? '—'}</td>
              <td className="text-center">
                <Button
                  variant="link"
                  className="p-0 me-2 text-primary"
                  onClick={() => handleEditClick(d)}
                  aria-label="Editar"
                >
                  <FaEdit />
                </Button>
                <Button
                  variant="link"
                  className="p-0 text-danger"
                  onClick={() => handleDeleteClick(d)}
                  aria-label="Eliminar"
                >
                  <FaTrash />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default DefectosPage;
