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
  bloque: '',
  projectId: '',
};

const TeamsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeamBlock, setSelectedTeamBlock] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [isFocal, setIsFocal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Convex hooks
  const teamsData = useQuery(api.teams.list);
  const blocksData = useQuery(api.blocks.list);
  const projectsData = useQuery(api.projects.list);
  const providersData = useQuery(api.providers.list);
  const modulesData = useQuery(api.modules.list);
  const blockModulesData = useQuery(
    api.block_modules.listByBlockName,
    selectedTeamBlock ? { blockName: selectedTeamBlock } : 'skip'
  );
  const teamMembers = useQuery(
    api.team_members.listByTeam,
    selectedTeamId ? { teamId: selectedTeamId } : 'skip'
  );
  const createTeam = useMutation(api.teams.create);
  const updateTeam = useMutation(api.teams.update);
  const removeTeam = useMutation(api.teams.remove);
  const addMember = useMutation(api.team_members.create);
  const updateMember = useMutation(api.team_members.update);
  const removeMember = useMutation(api.team_members.remove);
  const loading = teamsData === undefined;

  const handleShowModal = (team) => {
    if (team) {
      const { _id, _creationTime, ...rest } = team;
      // try to infer projectId from block name
      const block = (blocksData || []).find((b) => b.nombre === team.bloque);
      setForm({ ...rest, projectId: block?.projectId || '' });
      setEditingId(team._id);
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
    if (!form.nombre || !form.bloque || !form.projectId) {
      alert('Por favor complete todos los campos obligatorios (Proyecto y Bloque)');
      return;
    }

    if (editingId) {
      await updateTeam({ ...form, id: editingId });
    } else {
      await createTeam(form);
    }
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        '¿Está seguro de eliminar este equipo? Se eliminarán también todos los proveedores asignados.'
      )
    ) {
      await removeTeam({ id });
    }
  };

  const handleShowAssignModal = (teamId) => {
    const team = teamsData?.find((t) => t._id === teamId);
    setSelectedTeamId(teamId);
    setSelectedTeamBlock(team?.bloque || '');
    setSelectedProviderId('');
    setSelectedModuleId('');
    setIsFocal(false);
    setEditingMemberId(null);
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedTeamId(null);
    setSelectedTeamBlock('');
    setSelectedProviderId('');
    setSelectedModuleId('');
    setIsFocal(false);
    setEditingMemberId(null);
  };

  const handleEditMember = (member) => {
    setEditingMemberId(member._id);
    setSelectedProviderId(member.providerId);
    setSelectedModuleId(member.moduleId || '');
    setIsFocal(member.isFocal);
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setSelectedProviderId('');
    setSelectedModuleId('');
    setIsFocal(false);
  };

  const handleAddMember = async () => {
    if (!selectedProviderId) {
      alert('Por favor seleccione un proveedor');
      return;
    }

    const provider = (providersData || []).find(
      (p) => p._id === selectedProviderId
    );
    if (!provider) return;

    try {
      if (editingMemberId) {
        // Modo edición
        await updateMember({
          id: editingMemberId,
          nombre: provider.nombre,
          estado: 'activo',
          moduleId: selectedModuleId || undefined,
          isFocal: isFocal,
        });
        handleCancelEdit();
      } else {
        // Modo agregar
        await addMember({
          teamId: selectedTeamId,
          providerId: selectedProviderId,
          nombre: provider.nombre,
          estado: 'activo',
          moduleId: selectedModuleId || undefined,
          isFocal: isFocal,
        });
        setSelectedProviderId('');
        setSelectedModuleId('');
        setIsFocal(false);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('¿Está seguro de quitar este proveedor del equipo?')) {
      await removeMember({ id: memberId });
    }
  };

  // Paginación
  const paginated = useMemo(
    () => (teamsData || []).slice((page - 1) * pageSize, page * pageSize),
    [teamsData, page]
  );
  const totalPages = Math.ceil((teamsData || []).length / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold">Equipos</h3>
        <Button onClick={() => handleShowModal()} variant="primary">
          Agregar equipo
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
                <th>Nombre del Equipo</th>
                <th>Bloque</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    No hay equipos registrados.
                  </td>
                </tr>
              ) : (
                paginated.map((t) => (
                  <tr key={t._id}>
                    <td>{t.nombre}</td>
                    <td>{t.bloque}</td>
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
                      </Button>{' '}
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleShowAssignModal(t._id)}
                      >
                        Asignar
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

      {/* Modal para crear/editar equipo */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Editar equipo' : 'Agregar equipo'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>
                Nombre del Equipo <span className="text-danger">*</span>
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
              <Form.Label>
                Bloque <span className="text-danger">*</span>
              </Form.Label>
              <Form.Group className="mb-2">
                <Form.Label>Proyecto <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, bloque: '' }))}
                  required
                >
                  <option value="">Selecciona un proyecto...</option>
                  {(projectsData || []).map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nombre}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Select
                value={form.bloque}
                onChange={(e) => setForm((f) => ({ ...f, bloque: e.target.value }))}
                required
              >
                <option value="">Selecciona un bloque...</option>
                {(blocksData || [])
                  .filter((b) => (form.projectId ? b.projectId === form.projectId : true))
                  .map((bloque) => (
                    <option key={bloque._id} value={bloque.nombre}>
                      {bloque.nombre}
                    </option>
                  ))}
              </Form.Select>
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

      {/* Modal para asignar proveedores */}
      <Modal show={showAssignModal} onHide={handleCloseAssignModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Asignar Proveedores al Equipo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <Form.Label>
              {editingMemberId ? 'Editar Proveedor' : 'Seleccionar Proveedor'}
            </Form.Label>
            <div className="d-flex gap-2">
              <Form.Select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="flex-grow-1"
                disabled={editingMemberId !== null}
              >
                <option value="">Selecciona un proveedor...</option>
                {(providersData || [])
                  .filter((p) => p.estado === 'activo')
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nombre} - {p.perfil}
                    </option>
                  ))}
              </Form.Select>
              {editingMemberId ? (
                <>
                  <Button variant="success" onClick={handleAddMember}>
                    Guardar
                  </Button>
                  <Button variant="secondary" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={handleAddMember}>
                  Agregar
                </Button>
              )}
            </div>
          </div>

          <div className="mb-3">
            <Form.Label>Módulo (del bloque: {selectedTeamBlock})</Form.Label>
            <Form.Select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
            >
              <option value="">Selecciona un módulo...</option>
              {(blockModulesData || []).map((m) => (
                <option key={m._id} value={m._id}>
                  {m.nombre} - {m.estado}
                </option>
              ))}
            </Form.Select>
            {(!blockModulesData || blockModulesData.length === 0) && (
              <Form.Text className="text-muted">
                No hay módulos asignados a este bloque.
              </Form.Text>
            )}
          </div>

          <div className="mb-3">
            <Form.Check
              type="checkbox"
              label="¿Es Focal?"
              checked={isFocal}
              onChange={(e) => setIsFocal(e.target.checked)}
            />
          </div>

          <h6 className="mb-2">Proveedores Asignados</h6>
          <Table bordered hover size="sm">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Módulo</th>
                <th>Focal</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!teamMembers || teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted">
                    No hay proveedores asignados a este equipo.
                  </td>
                </tr>
              ) : (
                teamMembers.map((member) => {
                  const module = modulesData?.find(
                    (m) => m._id === member.moduleId
                  );
                  const isEditing = editingMemberId === member._id;
                  return (
                    <tr
                      key={member._id}
                      className={isEditing ? 'table-warning' : ''}
                    >
                      <td>{member.nombre}</td>
                      <td>{module ? module.nombre : '-'}</td>
                      <td>
                        <span
                          className={`badge ${member.isFocal ? 'bg-warning text-dark' : 'bg-secondary'}`}
                        >
                          {member.isFocal ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td>{member.estado}</td>
                      <td>
                        {!editingMemberId && (
                          <>
                            <Button
                              size="sm"
                              variant="warning"
                              onClick={() => handleEditMember(member)}
                              className="me-1"
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleRemoveMember(member._id)}
                            >
                              Quitar
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
          <Button variant="secondary" onClick={handleCloseAssignModal}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TeamsPage;
