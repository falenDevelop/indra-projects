import { query } from './_generated/server';
import { v } from 'convex/values';

export const getDefectsReport = query({
  args: {
    projectId: v.optional(v.id('projects')),
    blockId: v.optional(v.id('blocks')),
  },
  handler: async (ctx, args) => {
    const modules = await ctx.db.query('modules').collect();
    const defects = await ctx.db.query('defects').collect();
    const blockModules = await ctx.db.query('block_modules').collect();
    const blocks = await ctx.db.query('blocks').collect();

    // Filtrar módulos según el bloque seleccionado
    let filteredModules = modules;
    if (args.blockId) {
      const moduleIdsInBlock = blockModules
        .filter((bm) => bm.blockId === args.blockId)
        .map((bm) => bm.moduleId);
      filteredModules = modules.filter((m) => moduleIdsInBlock.includes(m._id));
    }

    // Filtrar bloques según el proyecto seleccionado
    let filteredBlocks = blocks;
    if (args.projectId) {
      filteredBlocks = blocks.filter((b) => b.projectId === args.projectId);
      const filteredBlockIds = filteredBlocks.map((b) => b._id);
      const moduleIdsInProject = blockModules
        .filter((bm) => filteredBlockIds.includes(bm.blockId))
        .map((bm) => bm.moduleId);
      filteredModules = filteredModules.filter((m) =>
        moduleIdsInProject.includes(m._id)
      );
    }

    // Agrupar módulos por bloque
    const modulesByBlock = new Map<string, any[]>();
    
    for (const module of filteredModules) {
      // Encontrar el bloque del módulo
      const blockModule = blockModules.find((bm) => bm.moduleId === module._id);
      if (!blockModule) continue;

      const block = blocks.find((b) => b._id === blockModule.blockId);
      if (!block) continue;

      const blockName = block.nombre;
      if (!modulesByBlock.has(blockName)) {
        modulesByBlock.set(blockName, []);
      }

      const casos =
        (module.pruebasAndroid || 0) +
        (module.pruebasIOS || 0) +
        (module.pruebasHuawei || 0);

      const pruebasEjecutadas =
        (module.pruebasAndroidEjecutadas || 0) +
        (module.pruebasIOSEjecutadas || 0) +
        (module.pruebasHuaweiEjecutadas || 0);

      // Defectos resueltos
      const defectosResueltos = defects.filter(
        (d) =>
          d.moduleId === module._id &&
          d.estado.toLowerCase() === 'resuelto'
      ).length;

      // Cobertura = pruebas ejecutadas + defectos resueltos
      const cobertura = pruebasEjecutadas + defectosResueltos;

      // Defectos observados (sin contar Resuelto ni Descartado)
      const observados = defects.filter(
        (d) =>
          d.moduleId === module._id &&
          d.estado.toLowerCase() !== 'resuelto' &&
          d.estado.toLowerCase() !== 'descartado'
      ).length;

      const pendientes = casos - cobertura - observados;

      modulesByBlock.get(blockName)!.push({
        _id: module._id,
        nombre: module.nombre,
        casos,
        cobertura,
        observados,
        pendientes,
        coberturaPct: casos > 0 ? Math.round((cobertura / casos) * 100) : 0,
        observadosPct: casos > 0 ? Math.round((observados / casos) * 100) : 0,
        pendientesPct: casos > 0 ? Math.round((pendientes / casos) * 100) : 0,
      });
    }

    // Convertir el mapa a un array de bloques con sus módulos
    const report = Array.from(modulesByBlock.entries()).map(
      ([blockName, modules]) => {
        // Calcular totales del bloque
        const totalCasos = modules.reduce((sum, m) => sum + m.casos, 0);
        const totalCobertura = modules.reduce((sum, m) => sum + m.cobertura, 0);
        const totalObservados = modules.reduce(
          (sum, m) => sum + m.observados,
          0
        );
        const totalPendientes = modules.reduce(
          (sum, m) => sum + m.pendientes,
          0
        );

        return {
          blockName,
          modules,
          totals: {
            casos: totalCasos,
            cobertura: totalCobertura,
            observados: totalObservados,
            pendientes: totalPendientes,
            coberturaPct:
              totalCasos > 0
                ? Math.round((totalCobertura / totalCasos) * 100)
                : 0,
            observadosPct:
              totalCasos > 0
                ? Math.round((totalObservados / totalCasos) * 100)
                : 0,
            pendientesPct:
              totalCasos > 0
                ? Math.round((totalPendientes / totalCasos) * 100)
                : 0,
          },
        };
      }
    );

    return report;
  },
});
