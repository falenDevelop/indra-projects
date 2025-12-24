import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Pagination,
  Spinner,
} from 'react-bootstrap';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const initialForm = {
  nombre: '',
  numeroDias: '',
  porcentaje: '',
};

const DevelopmentTypesPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Convex hooks
  const typesData = useQuery(api.development_types.list);
  const createType = useMutation(api.development_types.create);
  const updateType = useMutation(api.development_types.update);
  const removeType = useMutation(api.development_types.remove);
  const loading = typesData === undefined;

  const handleShowModal = (type) => {
    if (type) {
      const { _id, _creationTime, ...rest } = type;
      setForm(rest);
      setEditingId(type._id);
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
    if (!form.nombre) {
      alert('Por favor complete el nombre');
      return;
    }

    const dataToSave = {
      nombre: form.nombre,
      numeroDias: form.numeroDias ? Number(form.numeroDias) : undefined,
      porcentaje: form.porcentaje ? Number(form.porcentaje) : undefined,
    };

    if (editingId) {
      await updateType({ ...dataToSave, id: editingId });
    } else {
      await createType(dataToSave);
    }
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este tipo de desarrollo?')) {
      await removeType({ id });
    }
  };

  // Paginación
  const paginated = useMemo(
    () => (typesData || []).slice((page - 1) * pageSize, page * pageSize),
    [typesData, page]
  );
  const totalPages = Math.ceil((typesData || []).length / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold">Tipos de Desarrollo</h3>
        <Button onClick={() => handleShowModal()} variant="primary">
          Agregar tipo
        </Button>
      </div>

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
                <th>Número de Días</th>
                <th>Porcentaje</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No hay tipos de desarrollo registrados.
                  </td>
                </tr>
              ) : (
                paginated.map((t) => (
                  <tr key={t._id}>
                    <td>{t.nombre}</td>
                    <td>{t.numeroDias || '-'}</td>
                    <td>{t.porcentaje ? `${t.porcentaje}%` : '-'}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => handleShowModal(t)}
                      >
                        Editar
                      </Button>{' '}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(t._id)}
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

      {/* Modal para crear/editar tipo */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId
              ? 'Editar tipo de desarrollo'
              : 'Agregar tipo de desarrollo'}
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
            <Form.Group className="mb-3">
              <Form.Label>Número de Días</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={form.numeroDias}
                onChange={(e) =>
                  setForm((f) => ({ ...f, numeroDias: e.target.value }))
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Porcentaje (%)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                value={form.porcentaje}
                onChange={(e) =>
                  setForm((f) => ({ ...f, porcentaje: e.target.value }))
                }
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
    </div>
  );
};

export default DevelopmentTypesPage;
