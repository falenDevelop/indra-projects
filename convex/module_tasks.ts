import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('module_tasks').collect();
  },
});

export const listByModule = query({
  args: {
    moduleId: v.id('modules'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('module_tasks')
      .filter((q) => q.eq(q.field('moduleId'), args.moduleId))
      .collect();
  },
});

export const create = mutation({
  args: {
    moduleId: v.id('modules'),
    nombreActividad: v.string(),
    developmentTypeId: v.id('development_types'),
    fechaInicio: v.string(),
    fechaFinal: v.string(),
    porcentaje: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('module_tasks', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('module_tasks'),
    nombreActividad: v.string(),
    developmentTypeId: v.id('development_types'),
    fechaInicio: v.string(),
    fechaFinal: v.string(),
    porcentaje: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    return await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: {
    id: v.id('module_tasks'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
