import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('task_activities').collect();
  },
});

export const listByTask = query({
  args: { taskId: v.id('module_tasks') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('task_activities')
      .filter((q) => q.eq(q.field('taskId'), args.taskId))
      .order('desc')
      .collect();
  },
});

export const create = mutation({
  args: {
    taskId: v.id('module_tasks'),
    porcentajeAnterior: v.number(),
    porcentajeNuevo: v.number(),
    descripcion: v.string(),
    registradoPor: v.string(),
    registradoPorXp: v.string(),
  },
  handler: async (ctx, args) => {
    const activityId = await ctx.db.insert('task_activities', {
      taskId: args.taskId,
      porcentajeAnterior: args.porcentajeAnterior,
      porcentajeNuevo: args.porcentajeNuevo,
      descripcion: args.descripcion,
      createdAt: Date.now(),
      registradoPor: args.registradoPor,
      registradoPorXp: args.registradoPorXp,
    });

    // Actualizar el porcentaje de la tarea
    await ctx.db.patch(args.taskId, {
      porcentaje: args.porcentajeNuevo,
    });

    return activityId;
  },
});

export const remove = mutation({
  args: { id: v.id('task_activities') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
