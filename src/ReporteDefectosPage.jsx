import React, { useState, useMemo } from 'react';
import { Table, Form, Row, Col, Card, Badge } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const ReporteDefectosPage = () => {
  const projectsData = useQuery(api.projects.list);
  const blocksData = useQuery(api.blocks.list);

  const projects = useMemo(() => projectsData || [], [projectsData]);
  const allBlocks = useMemo(() => blocksData || [], [blocksData]);

  // Determinar valores iniciales
  const defaultProject = useMemo(() => {
    return projects.length > 0 ? projects[0]._id : '';
  }, [projects]);

  const defaultBlock = useMemo(() => {
    if (allBlocks.length > 0) {
      const bloque2 = allBlocks.find((b) => b.nombre === 'BLOQUE 2');
      return bloque2 ? bloque2._id : '';
    }
    return '';
  }, [allBlocks]);

  const [projectFilter, setProjectFilter] = useState(() => defaultProject);
  const [blockFilter, setBlockFilter] = useState(() => defaultBlock);

  const report = useQuery(
    api.reports_defects.getDefectsReport,
    projectFilter || blockFilter
      ? {
          projectId: projectFilter || undefined,
          blockId: blockFilter || undefined,
        }
      : {}
  );

  // Filtrar bloques según proyecto seleccionado
  const filteredBlocks = useMemo(() => {
    if (!projectFilter) return allBlocks;
    return allBlocks.filter((b) => b.projectId === projectFilter);
  }, [projectFilter, allBlocks]);

  const getPercentageColor = (pct) => {
    if (pct >= 70) return 'success';
    if (pct >= 40) return 'warning';
    return 'danger';
  };

  return (
    <div>
      <h2 className="mb-4">Reporte de Defectos</h2>

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Proyecto</Form.Label>
                <Form.Select
                  value={projectFilter}
                  onChange={(e) => {
                    setProjectFilter(e.target.value);
                    setBlockFilter(''); // Limpiar filtro de bloque al cambiar proyecto
                  }}
                >
                  <option value="">Todos los proyectos</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nombre}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Bloque</Form.Label>
                <Form.Select
                  value={blockFilter}
                  onChange={(e) => setBlockFilter(e.target.value)}
                >
                  <option value="">Todos los bloques</option>
                  {filteredBlocks.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.nombre}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de Reporte */}
      {report && report.length > 0 ? (
        report.map((blockData) => (
          <Card key={blockData.blockName} className="mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Bloque: {blockData.blockName}</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped bordered hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Feature / Module</th>
                    <th className="text-center">CASOS</th>
                    <th className="text-center">COBERTURA</th>
                    <th className="text-center">OBSERVADOS</th>
                    <th className="text-center">PENDIENTES</th>
                    <th className="text-center">COBERTURA %</th>
                    <th className="text-center">OBSERVADOS %</th>
                    <th className="text-center">PENDIENTES %</th>
                  </tr>
                </thead>
                <tbody>
                  {blockData.modules.map((module) => (
                    <tr key={module._id}>
                      <td>{module.nombre}</td>
                      <td className="text-center">{module.casos}</td>
                      <td className="text-center">{module.cobertura}</td>
                      <td className="text-center">{module.observados}</td>
                      <td className="text-center">{module.pendientes}</td>
                      <td className="text-center">
                        <Badge
                          bg={getPercentageColor(module.coberturaPct)}
                          className="w-100"
                        >
                          {module.coberturaPct}%
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Badge
                          bg={
                            module.observadosPct > 20
                              ? 'danger'
                              : module.observadosPct > 10
                                ? 'warning'
                                : 'success'
                          }
                          className="w-100"
                        >
                          {module.observadosPct}%
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Badge
                          bg={
                            module.pendientesPct > 50
                              ? 'danger'
                              : module.pendientesPct > 30
                                ? 'warning'
                                : 'success'
                          }
                          className="w-100"
                        >
                          {module.pendientesPct}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {/* Fila de totales */}
                  <tr className="table-info fw-bold">
                    <td>Total {blockData.blockName}</td>
                    <td className="text-center">{blockData.totals.casos}</td>
                    <td className="text-center">
                      {blockData.totals.cobertura}
                    </td>
                    <td className="text-center">
                      {blockData.totals.observados}
                    </td>
                    <td className="text-center">
                      {blockData.totals.pendientes}
                    </td>
                    <td className="text-center">
                      <Badge
                        bg={getPercentageColor(blockData.totals.coberturaPct)}
                        className="w-100"
                      >
                        {blockData.totals.coberturaPct}%
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Badge
                        bg={
                          blockData.totals.observadosPct > 20
                            ? 'danger'
                            : blockData.totals.observadosPct > 10
                              ? 'warning'
                              : 'success'
                        }
                        className="w-100"
                      >
                        {blockData.totals.observadosPct}%
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Badge
                        bg={
                          blockData.totals.pendientesPct > 50
                            ? 'danger'
                            : blockData.totals.pendientesPct > 30
                              ? 'warning'
                              : 'success'
                        }
                        className="w-100"
                      >
                        {blockData.totals.pendientesPct}%
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ))
      ) : (
        <Card>
          <Card.Body className="text-center text-muted">
            {report === undefined ? (
              <p>Cargando datos...</p>
            ) : (
              <p>No hay datos disponibles para los filtros seleccionados.</p>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default ReporteDefectosPage;
