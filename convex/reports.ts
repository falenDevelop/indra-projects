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

    // Obtener los módulos del bloque seleccionado
    const blockModules = await ctx.db
      .query('block_modules')
      .filter((q) => q.eq(q.field('blockId'), args.blockId))
      .collect();

    const moduleIds = blockModules.map((bm) => bm.moduleId);

    // Obtener todos los equipos
    const allTeams = await ctx.db.query('teams').collect();

    // Obtener todos los team_members
    const allTeamMembers = await ctx.db.query('team_members').collect();

    // Agrupar por equipos
    const teamsData = await Promise.all(
      allTeams.map(async (team) => {
        // Obtener miembros del equipo
        const teamMembers = allTeamMembers.filter(
          (tm) => tm.teamId === team._id
        );

        // Obtener módulos del equipo (que también estén en el bloque seleccionado)
        const teamModules = await Promise.all(
          teamMembers
            .filter((tm) => tm.moduleId && moduleIds.includes(tm.moduleId))
            .map(async (tm) => {
              const module = tm.moduleId ? await ctx.db.get(tm.moduleId) : null;
              if (!module) return null;

              // Obtener las tareas del módulo
              const tasks = await ctx.db
                .query('module_tasks')
                .filter((q) => q.eq(q.field('moduleId'), module._id))
                .collect();

              // Obtener los tipos de desarrollo
              const developmentTypes = await ctx.db
                .query('development_types')
                .collect();

              // Calcular porcentajes por tipo de desarrollo
              const percentagesByType: Record<string, number[]> = {};

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

              // Calcular porcentaje total
              const totalPercentage =
                Object.values(averagesByType).reduce((a, b) => a + b, 0) /
                (Object.keys(averagesByType).length || 1);

              // Obtener responsable focal
              const focalMember = teamMembers.find(
                (tm) => tm.moduleId === module._id && tm.isFocal
              );

              // Obtener todos los responsables del módulo
              const moduleResponsables = teamMembers
                .filter((tm) => tm.moduleId === module._id)
                .map((tm) => ({
                  nombre: tm.nombre,
                  isFocal: tm.isFocal,
                }));

              // Obtener actividades recientes
              const recentActivities = await Promise.all(
                tasks.map(async (task) => {
                  const activities = await ctx.db
                    .query('task_activities')
                    .filter((q) => q.eq(q.field('taskId'), task._id))
                    .order('desc')
                    .take(5);
                  return activities;
                })
              );

              const allActivities = recentActivities.flat();

              // Contar actividades de ayer
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              yesterday.setHours(0, 0, 0, 0);
              const yesterdayTimestamp = yesterday.getTime();

              const actividadesAyer = allActivities.filter(
                (act) => act.createdAt >= yesterdayTimestamp
              ).length;

              return {
                _id: module._id,
                nombre: module.nombre,
                estado: module.estado,
                responsables: moduleResponsables,
                responsableFocal: focalMember?.nombre || '',
                porcentajesPorTipo: averagesByType,
                porcentajeTotal: totalPercentage,
                actividadesAyer,
                tasks: tasks.map((t) => ({
                  _id: t._id,
                  nombre: t.nombreActividad,
                  porcentaje: t.porcentaje,
                  developmentTypeId: t.developmentTypeId,
                })),
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

export const getFocalModules = query({
  args: {
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    // Buscar todos los team_members donde el usuario es focal
    const focalMembers = await ctx.db
      .query('team_members')
      .filter((q) =>
        q.and(
          q.eq(q.field('nombre'), args.userName),
          q.eq(q.field('isFocal'), true)
        )
      )
      .collect();

    // Obtener los módulos donde es focal
    const modules = await Promise.all(
      focalMembers
        .filter((fm) => fm.moduleId)
        .map(async (fm) => {
          const module = fm.moduleId ? await ctx.db.get(fm.moduleId) : null;
          if (!module) return null;

          // Obtener el equipo
          const team = await ctx.db.get(fm.teamId);

          // Obtener el bloque del módulo
          const blockModule = await ctx.db
            .query('block_modules')
            .filter((q) => q.eq(q.field('moduleId'), module._id))
            .first();

          const block = blockModule
            ? await ctx.db.get(blockModule.blockId)
            : null;

          return {
            _id: module._id,
            nombre: module.nombre,
            descripcion: module.descripcion,
            estado: module.estado,
            teamName: team?.nombre || '',
            blockName: block?.nombre || '',
          };
        })
    );

    return modules.filter((m) => m !== null);
  },
});
