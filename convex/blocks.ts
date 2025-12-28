import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('blocks').collect();
  },
});

export const create = mutation({
  args: {
    nombre: v.string(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const payload: any = { nombre: args.nombre };
    if (args.projectId !== undefined) payload.projectId = args.projectId;
    return await ctx.db.insert('blocks', payload);
  },
});

export const update = mutation({
  args: {
    id: v.id('blocks'),
    nombre: v.string(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const { id } = args;
    const data: any = {};
    if (args.nombre !== undefined) data.nombre = args.nombre;
    if (args.projectId !== undefined) data.projectId = args.projectId;
    return await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: {
    id: v.id('blocks'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
