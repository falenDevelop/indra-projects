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
};

const BlocksPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Convex hooks
  const blocksData = useQuery(api.blocks.list);
  const modulesData = useQuery(api.modules.list);
  const blockModules = useQuery(
    api.block_modules.listByBlock,
    selectedBlockId ? { blockId: selectedBlockId } : 'skip'
  );
  const createBlock = useMutation(api.blocks.create);
  const updateBlock = useMutation(api.blocks.update);
  const removeBlock = useMutation(api.blocks.remove);
  const addModule = useMutation(api.block_modules.create);
  const removeModule = useMutation(api.block_modules.remove);
  const loading = blocksData === undefined;

  const handleShowModal = (block) => {
    if (block) {
      const { _id, _creationTime, ...rest } = block;
      setForm(rest);
      setEditingId(block._id);
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
      alert('Por favor complete el nombre del bloque');
      return;
    }

    if (editingId) {
      await updateBlock({ ...form, id: editingId });
    } else {
      await createBlock(form);
    }
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este bloque?')) {
      await removeBlock({ id });
    }
  };

  const handleShowAssignModal = (blockId) => {
    setSelectedBlockId(blockId);
    setSelectedModuleId('');
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedBlockId(null);
    setSelectedModuleId('');
  };

  const handleAddModule = async () => {
    if (!selectedModuleId) {
      alert('Por favor seleccione un módulo');
      return;
    }

    try {
      await addModule({
        blockId: selectedBlockId,
        moduleId: selectedModuleId,
      });
      setSelectedModuleId('');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRemoveModule = async (moduleId) => {
    if (window.confirm('¿Está seguro de quitar este módulo del bloque?')) {
      await removeModule({ id: moduleId });
    }
  };

  // Paginación
  const paginated = useMemo(
    () => (blocksData || []).slice((page - 1) * pageSize, page * pageSize),
    [blocksData, page]
  );
  const totalPages = Math.ceil((blocksData || []).length / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold">Bloques</h3>
        <Button onClick={() => handleShowModal()} variant="primary">
          Agregar bloque
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
                <th>Nombre del Bloque</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center text-muted">
                    No hay bloques registrados.
                  </td>
                </tr>
              ) : (
                paginated.map((b) => (
                  <tr key={b._id}>
                    <td>{b.nombre}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => handleShowModal(b)}
                      >
                        Editar
                      </Button>{' '}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(b._id)}
                      >
                        Eliminar
                      </Button>{' '}
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleShowAssignModal(b._id)}
                      >
                        Asignar Módulos
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

      {/* Modal para crear/editar bloque */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Editar bloque' : 'Agregar bloque'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>
                Nombre del Bloque <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
                required
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

      {/* Modal para asignar módulos */}
      <Modal show={showAssignModal} onHide={handleCloseAssignModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Asignar Módulos al Bloque</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <Form.Label>Seleccionar Módulo</Form.Label>
            <div className="d-flex gap-2">
              <Form.Select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="flex-grow-1"
              >
                <option value="">Selecciona un módulo...</option>
                {(modulesData || [])
                  .filter(
                    (m) => m.estado === 'Activo' || m.estado === 'En Desarrollo'
                  )
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.nombre} - {m.estado}
                    </option>
                  ))}
              </Form.Select>
              <Button variant="primary" onClick={handleAddModule}>
                Agregar
              </Button>
            </div>
          </div>

          <h6 className="mb-2">Módulos Asignados</h6>
          <Table bordered hover size="sm">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {!blockModules || blockModules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No hay módulos asignados a este bloque.
                  </td>
                </tr>
              ) : (
                blockModules.map((bm) => {
                  const module = modulesData?.find(
                    (m) => m._id === bm.moduleId
                  );
                  return (
                    <tr key={bm._id}>
                      <td>{module?.nombre || '-'}</td>
                      <td>{module?.descripcion || '-'}</td>
                      <td>
                        <span
                          className={`badge ${
                            module?.estado === 'Activo'
                              ? 'bg-success'
                              : module?.estado === 'En Desarrollo'
                                ? 'bg-primary'
                                : 'bg-secondary'
                          }`}
                        >
                          {module?.estado}
                        </span>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveModule(bm._id)}
                        >
                          Quitar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAssignModal}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BlocksPage;
