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
  fechaInicio: '',
  fechaFin: '',
};

const ProjectsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Convex hooks
  const projectsData = useQuery(api.projects.list);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const removeProject = useMutation(api.projects.remove);
  const loading = projectsData === undefined;

  const handleShowModal = (project) => {
    if (project) {
      const { _id, _creationTime, ...rest } = project;
      setForm(rest);
      setEditingId(project._id);
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
    if (!form.nombre || !form.fechaInicio || !form.fechaFin) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    if (editingId) {
      await updateProject({ ...form, id: editingId });
    } else {
      await createProject(form);
    }
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este proyecto?')) {
      await removeProject({ id });
    }
  };

  // Filtros
  const [filters, setFilters] = useState({
    nombre: '',
  });

  // Filtrar por campos
  const projectsFiltrados = useMemo(() => {
    return (projectsData || []).filter((p) => {
      return (
        !filters.nombre ||
        p.nombre.toLowerCase().includes(filters.nombre.toLowerCase())
      );
    });
  }, [projectsData, filters]);

  // Paginación sobre la lista filtrada
  const paginated = useMemo(
    () => projectsFiltrados.slice((page - 1) * pageSize, page * pageSize),
    [projectsFiltrados, page]
  );
  const totalPages = Math.ceil(projectsFiltrados.length / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold">Proyectos</h3>
        <Button onClick={() => handleShowModal()} variant="primary">
          Agregar proyecto
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
                  placeholder="Buscar por nombre"
                  value={filters.nombre}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, nombre: e.target.value }))
                  }
                />
              </Col>
            </Row>
          </div>
          <Table bordered hover responsive>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>F. Inicio</th>
                <th>F. Fin</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No hay proyectos registrados.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p._id}>
                    <td>{p.nombre}</td>
                    <td>{p.fechaInicio}</td>
                    <td>{p.fechaFin}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => handleShowModal(p)}
                      >
                        Editar
                      </Button>{' '}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(p._id)}
                      >
                        Eliminar
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
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Editar proyecto' : 'Agregar proyecto'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
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
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>
                    F. Inicio <span className="text-danger">*</span>
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
                    F. Fin <span className="text-danger">*</span>
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

export default ProjectsPage;
