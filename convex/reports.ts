import { v } from 'convex/values';
import { query } from './_generated/server';

export const getReportData = query({
  args: {
    blockId: v.optional(v.id('blocks')),
  },
  handler: async (ctx, args) => {
    // Obtener todos los bloques
    const blocks = await ctx.db.query('blocks').collect();

    // Si no se especifica un bloque, retornar todos los bloques
    if (!args.blockId) {
      return { blocks, teams: [], modules: [] };
    }

    const blockId = args.blockId; // TypeScript narrowing

    // Obtener los módulos del bloque seleccionado
    const blockModules = await ctx.db
      .query('block_modules')
      .withIndex('by_block', (q) => q.eq('blockId', blockId))
      .collect();

    const moduleIds = blockModules.map((bm) => bm.moduleId);

    // Obtener todos los equipos
    const allTeams = await ctx.db.query('teams').collect();

    // Obtener todos los team_members
    const allTeamMembers = await ctx.db.query('team_members').collect();

    // Obtener tipos de desarrollo UNA SOLA VEZ
    const developmentTypes = await ctx.db.query('development_types').collect();

    // Agrupar por equipos
    const teamsData = await Promise.all(
      allTeams.map(async (team) => {
        // Obtener miembros del equipo
        const teamMembers = allTeamMembers.filter(
          (tm) => tm.teamId === team._id
        );

        // Obtener módulos del equipo (únicos) que también estén en el bloque seleccionado
        const moduleIdSet = Array.from(
          new Set(
            teamMembers
              .filter((tm) => tm.moduleId && moduleIds.includes(tm.moduleId))
              .map((tm) => tm.moduleId)
          )
        );

        const teamModules = await Promise.all(
          moduleIdSet.map(async (moduleId) => {
            const module = moduleId ? await ctx.db.get(moduleId) : null;
            if (!module) return null;

            // Obtener las tareas del módulo
            const tasks = await ctx.db
              .query('module_tasks')
              .withIndex('by_module', (q) => q.eq('moduleId', module._id))
              .collect();

            // Calcular porcentajes por tipo de desarrollo (optimizado)
            const percentagesByType: Record<string, number[]> = {};
            const COMPLETED_DEFECT_STATES = new Set(['resuelto', 'descartado']);

            // Agrupar tareas por tipo en un solo loop
            for (const task of tasks) {
              const devType = developmentTypes.find(
                (dt) => dt._id === task.developmentTypeId
              );
              if (devType) {
                if (!percentagesByType[devType.nombre]) {
                  percentagesByType[devType.nombre] = [];
                }
                percentagesByType[devType.nombre].push(task.porcentaje);
              }
            }

            // Calcular promedio por tipo
            const averagesByType: Record<string, number> = {};
            for (const [typeName, percentages] of Object.entries(
              percentagesByType
            )) {
              const sum = percentages.reduce((a, b) => a + b, 0);
              averagesByType[typeName] =
                percentages.length > 0 ? sum / percentages.length : 0;
            }

            // Calcular defectos solo si hay un tipo "defecto" en developmentTypes
            const hasDefectType = developmentTypes.some((dt) => {
              const tn = String(dt.nombre || '').toLowerCase();
              return tn.includes('defect') || tn.includes('defecto');
            });

            if (hasDefectType) {
              const moduleDefects = await ctx.db
                .query('defects')
                .withIndex('by_module', (q) => q.eq('moduleId', module._id))
                .collect();

              const totalDefects = moduleDefects.length;
              const completed = moduleDefects.filter((d) => {
                const s = String(d.estado || '').trim().toLowerCase();
                return COMPLETED_DEFECT_STATES.has(s);
              }).length;

              const defectPercentage =
                totalDefects === 0 ? 100 : (completed / totalDefects) * 100;

              // Agregar porcentaje de defectos al tipo correspondiente
              for (const devType of developmentTypes) {
                const typeName = devType?.nombre || '';
                const tn = String(typeName).toLowerCase();
                if (tn.includes('defect') || tn.includes('defecto')) {
                  averagesByType[typeName] = defectPercentage;
                  break;
                }
              }
            }

            // Calcular porcentaje total
            const totalPercentage =
              Object.values(averagesByType).reduce((a, b) => a + b, 0) /
              (Object.keys(averagesByType).length || 1);

            // Obtener responsable focal
            const focalMember = teamMembers.find(
              (tm) => tm.moduleId === module._id && tm.isFocal
            );

            // Obtener todos los responsables del módulo (evitar duplicados por team_member id)
            const seenMemberIds = new Set();
            const moduleResponsables = teamMembers
              .filter((tm) => tm.moduleId === module._id)
              .filter((tm) => {
                if (seenMemberIds.has(String(tm._id))) return false;
                seenMemberIds.add(String(tm._id));
                return true;
              })
              .map((tm) => ({
                _id: tm._id,
                providerId: tm.providerId,
                nombre: tm.nombre,
                isFocal: tm.isFocal,
              }));

            return {
              _id: module._id,
              nombre: module.nombre,
              estado: module.estado,
              responsables: moduleResponsables,
              responsableFocal: focalMember?.nombre || '',
              porcentajesPorTipo: averagesByType,
              porcentajeTotal: totalPercentage,
              totalTareas: tasks.length,
              fechaFinal: tasks.length > 0 
                ? tasks.reduce((latest, t) => {
                    if (!t.fechaFinal) return latest;
                    if (!latest) return t.fechaFinal;
                    return t.fechaFinal > latest ? t.fechaFinal : latest;
                  }, '')
                : '',
            };
          })
        );

        // Filtrar módulos nulos
        const validModules = teamModules.filter((m) => m !== null);

        return {
          _id: team._id,
          nombre: team.nombre,
          bloque: team.bloque,
          modules: validModules,
        };
      })
    );

    // Filtrar equipos que tienen módulos
    const teamsWithModules = teamsData.filter((t) => t.modules.length > 0);

    return {
      blocks,
      teams: teamsWithModules,
      modules: [],
    };
  },
});

export const getModuleActivities = query({
  args: {
    moduleId: v.id('modules'),
  },
  handler: async (ctx, args) => {
    // Obtener el módulo
    const module = await ctx.db.get(args.moduleId);
    if (!module) return null;

    // Obtener todas las tareas del módulo
    const tasks = await ctx.db
      .query('module_tasks')
      .filter((q) => q.eq(q.field('moduleId'), args.moduleId))
      .collect();

    // Obtener actividades de cada tarea
    const tasksWithActivities = await Promise.all(
      tasks.map(async (task) => {
        const activities = await ctx.db
          .query('task_activities')
          .filter((q) => q.eq(q.field('taskId'), task._id))
          .order('desc')
          .collect();

        const devType = await ctx.db.get(task.developmentTypeId);

        return {
          _id: task._id,
          nombre: task.nombreActividad,
          porcentaje: task.porcentaje,
          developmentType: devType?.nombre || '',
          fechaInicio: task.fechaInicio,
          fechaFinal: task.fechaFinal,
          activities: activities.map((act) => ({
            _id: act._id,
            porcentajeAnterior: act.porcentajeAnterior,
            porcentajeNuevo: act.porcentajeNuevo,
            descripcion: act.descripcion,
            createdAt: act.createdAt,
            registradoPor: act.registradoPor || '',
            registradoPorXp: act.registradoPorXp || '',
          })),
        };
      })
    );

    return {
      module,
      tasks: tasksWithActivities,
    };
  },
});
