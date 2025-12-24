import { v } from 'convex/values';
import { query } from './_generated/server';

export const getUserActivities = query({
  args: {
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    // Buscar todas las actividades registradas por el usuario en cualquier módulo/tarea
    const activities = await ctx.db
      .query('task_activities')
      .filter((q) => q.eq(q.field('registradoPor'), args.userName))
      .order('desc')
      .collect();

    // Obtener info de tarea y módulo para cada actividad
    const results = await Promise.all(
      activities.map(async (act) => {
        const task = await ctx.db.get(act.taskId);
        const module = task ? await ctx.db.get(task.moduleId) : null;
        return {
          _id: act._id,
          descripcion: act.descripcion,
          porcentajeAnterior: act.porcentajeAnterior,
          porcentajeNuevo: act.porcentajeNuevo,
          createdAt: act.createdAt,
          moduleName: module ? module.nombre : '',
          taskName: task ? task.nombreActividad : '',
        };
      })
    );
    return results;
  },
});
