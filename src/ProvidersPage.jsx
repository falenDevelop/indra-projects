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
} from 'react-bootstrap';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const initialForm = {
  nombre: '',
  xp: '',
  correoEmpresa: '',
  correoContractor: '',
  fechaInicio: '',
  fechaFin: '',
  tipo: '',
  perfil: '',
};

const ProvidersPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Convex hooks
  const proveedoresData = useQuery(api.providers.list);
  const projectsData = useQuery(api.projects.list);
  const createProveedor = useMutation(api.providers.create);
  const updateProveedor = useMutation(api.providers.update);
  // removeProveedor ya no se usa
  const loading = proveedoresData === undefined;

  const handleShowModal = (proveedor) => {
    if (proveedor) {
      // No mostrar campo estado en el formulario
      const rest = { ...proveedor };
      delete rest.estado;
      setForm(rest);
      setEditingId(proveedor._id);
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
    if (
      !form.nombre ||
      !form.xp ||
      !form.correoEmpresa ||
      !form.fechaInicio ||
      !form.fechaFin ||
      !form.tipo ||
      !form.perfil
    ) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    if (editingId) {
      // Buscar el proveedor actual para obtener el estado y limpiar campos extra
      const proveedorActual = (proveedoresData || []).find(
        (p) => p._id === editingId
      );
      const estado = proveedorActual ? proveedorActual.estado : 'activo';
      // Eliminar campos extra
      const { _id, _creationTime, ...rest } = { ...proveedorActual, ...form };
      await updateProveedor({ ...rest, id: editingId, estado });
    } else {
      // Registrar proveedor con estado 'activo'
      await createProveedor({ ...form, estado: 'activo' });
    }
    handleCloseModal();
  };

  // Cambiar estado: dar de baja o reincorporar
  const handleToggleEstado = async (id, nuevoEstado) => {
    const proveedor = (proveedoresData || []).find((p) => p._id === id);
    if (proveedor) {
      // Eliminar campos extra que no están en el validador de Convex
      const { _id, _creationTime, ...rest } = proveedor;
      await updateProveedor({ ...rest, id, estado: nuevoEstado });
    }
  };

  // Filtros
  const [filters, setFilters] = useState({
    nombre: '',
    xp: '',
    correoEmpresa: '',
    correoContractor: '',
    tipo: '',
    estado: '',
    perfil: '',
  });

  // Ordenar: primero activos, luego inactivos
  const proveedoresOrdenados = useMemo(() => {
    const arr = (proveedoresData || []).slice();
    arr.sort((a, b) => {
      if (a.estado === b.estado) return 0;
      if (a.estado === 'activo') return -1;
      return 1;
    });
    return arr;
  }, [proveedoresData]);

  // Filtrar por campos
  const proveedoresFiltrados = useMemo(() => {
    return proveedoresOrdenados.filter((p) => {
      return (
        (!filters.nombre ||
          p.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) &&
        (!filters.xp ||
          p.xp.toLowerCase().includes(filters.xp.toLowerCase())) &&
        (!filters.correoEmpresa ||
          p.correoEmpresa
            .toLowerCase()
            .includes(filters.correoEmpresa.toLowerCase())) &&
        (!filters.correoContractor ||
          p.correoContractor
            .toLowerCase()
            .includes(filters.correoContractor.toLowerCase())) &&
        (!filters.tipo || p.tipo === filters.tipo) &&
        (!filters.estado || p.estado === filters.estado) &&
        (!filters.perfil || p.perfil === filters.perfil)
      );
    });
  }, [proveedoresOrdenados, filters]);

  // Paginación sobre la lista filtrada
  const paginated = useMemo(
    () => proveedoresFiltrados.slice((page - 1) * pageSize, page * pageSize),
    [proveedoresFiltrados, page]
  );
  const totalPages = Math.ceil(proveedoresFiltrados.length / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold">Proveedores</h3>
        <Button onClick={() => handleShowModal()} variant="primary">
          Agregar proveedor
        </Button>
      </div>
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="mb-3">
            <Row className="g-2">
              <Col>
                <Form.Control
                  size="sm"
                  placeholder="Nombre"
                  value={filters.nombre}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, nombre: e.target.value }))
                  }
                />
              </Col>
              <Col>
                <Form.Control
                  size="sm"
                  placeholder="XP"
                  value={filters.xp}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, xp: e.target.value }))
                  }
                />
              </Col>
              <Col>
                <Form.Control
                  size="sm"
                  placeholder="Correo Empresa"
                  value={filters.correoEmpresa}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, correoEmpresa: e.target.value }))
                  }
                />
              </Col>
              <Col>
                <Form.Control
                  size="sm"
                  placeholder="Correo Contractor"
                  value={filters.correoContractor}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      correoContractor: e.target.value,
                    }))
                  }
                />
              </Col>
              <Col>
                <Form.Select
                  size="sm"
                  value={filters.tipo}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, tipo: e.target.value }))
                  }
                >
                  <option value="">Proyecto</option>
                  {(projectsData || []).map((proyecto) => (
                    <option key={proyecto._id} value={proyecto.nombre}>
                      {proyecto.nombre}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col>
                <Form.Select
                  size="sm"
                  value={filters.perfil}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, perfil: e.target.value }))
                  }
                >
                  <option value="">Perfil</option>
                  <option value="Joven profesional">Joven profesional</option>
                  <option value="Junior">Junior</option>
                  <option value="Semi Senior">Semi Senior</option>
                  <option value="Senior">Senior</option>
                  <option value="Lider Tecnico">Lider Tecnico</option>
                </Form.Select>
              </Col>
              <Col>
                <Form.Select
                  size="sm"
                  value={filters.estado}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, estado: e.target.value }))
                  }
                >
                  <option value="">Estado</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </Form.Select>
              </Col>
            </Row>
          </div>
          <Table bordered hover responsive>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>XP</th>
                <th>Correo Empresa</th>
                <th>Correo Contractor</th>
                <th>Estado</th>
                <th>F. Inicio</th>
                <th>F. Fin</th>
                <th>Proyecto</th>
                <th>Perfil</th>
                <th>Fase</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center text-muted">
                    No hay proveedores registrados.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => {
                  // Calcular fase: si fechaInicio < 3 meses, "Prueba", si no "Aprobado"
                  let fase = '-';
                  if (p.fechaInicio) {
                    const inicio = new Date(p.fechaInicio);
                    if (!isNaN(inicio.getTime())) {
                      const ahora = new Date();
                      const tresMesesDespues = new Date(inicio);
                      tresMesesDespues.setMonth(inicio.getMonth() + 3);
                      fase = ahora < tresMesesDespues ? 'Prueba' : 'Aprobado';
                    }
                  }
                  return (
                    <tr key={p._id}>
                      <td>{p.nombre}</td>
                      <td>{p.xp}</td>
                      <td>{p.correoEmpresa}</td>
                      <td>{p.correoContractor}</td>
                      <td>{p.estado}</td>
                      <td>{p.fechaInicio}</td>
                      <td>{p.fechaFin}</td>
                      <td>{p.tipo}</td>
                      <td>{p.perfil || '-'}</td>
                      <td>{fase}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="warning"
                          onClick={() => handleShowModal(p)}
                        >
                          Editar
                        </Button>{' '}
                        {p.estado === 'activo' ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              handleToggleEstado(p._id, 'inactivo')
                            }
                          >
                            Dar de baja
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleToggleEstado(p._id, 'activo')}
                          >
                            Reincorporar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Editar proveedor' : 'Agregar proveedor'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-2">
              <Col>
                <Form.Group>
                  <Form.Label>
                    Nombre <span className="text-danger">*</span>
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
              <Col>
                <Form.Group>
                  <Form.Label>
                    XP <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={form.xp}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, xp: e.target.value }))
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-2">
              <Form.Label>
                Correo Empresa <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                value={form.correoEmpresa}
                onChange={(e) =>
                  setForm((f) => ({ ...f, correoEmpresa: e.target.value }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Correo Contractor (opcional)</Form.Label>
              <Form.Control
                type="email"
                value={form.correoContractor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, correoContractor: e.target.value }))
                }
              />
            </Form.Group>
            {/* Estado eliminado del formulario */}
            <Row className="mb-2">
              <Col>
                <Form.Group>
                  <Form.Label>
                    F. Inicio de contrato <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={form.fechaInicio}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, fechaInicio: e.target.value }));
                      // Si se borra la fecha de inicio, también borra la de fin
                      if (!e.target.value)
                        setForm((f) => ({ ...f, fechaFin: '' }));
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>
                    F. Fin de contrato <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={form.fechaFin}
                    min={form.fechaInicio || undefined}
                    disabled={!form.fechaInicio}
                    onChange={(e) => {
                      // Validar que la fecha de fin sea mayor o igual a la de inicio
                      if (form.fechaInicio && e.target.value < form.fechaInicio)
                        return;
                      setForm((f) => ({ ...f, fechaFin: e.target.value }));
                    }}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-2">
              <Col>
                <Form.Group>
                  <Form.Label>
                    Proyecto <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tipo: e.target.value }))
                    }
                    required
                  >
                    <option value="">Selecciona un proyecto...</option>
                    {(projectsData || []).map((proyecto) => (
                      <option key={proyecto._id} value={proyecto.nombre}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>
                    Perfil <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={form.perfil}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, perfil: e.target.value }))
                    }
                    required
                  >
                    <option value="">Selecciona...</option>
                    <option value="Joven profesional">Joven profesional</option>
                    <option value="Junior">Junior</option>
                    <option value="Semi Senior">Semi Senior</option>
                    <option value="Senior">Senior</option>
                    <option value="Lider Tecnico">Lider Tecnico</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
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
    </div>
  );
};

export default ProvidersPage;
