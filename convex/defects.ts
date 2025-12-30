import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('defects').collect();
  },
});

export const listByModule = query({
  args: {
    moduleId: v.id('modules'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('defects')
      .filter((q) => q.eq(q.field('moduleId'), args.moduleId))
      .collect();
  },
});

export const create = mutation({
  args: {
    moduleId: v.id('modules'),
    ticket: v.string(),
    data: v.optional(v.string()),
    comentario: v.optional(v.string()),
    estado: v.string(),
    usuario: v.optional(v.string()),
    contrasena: v.optional(v.string()),
    creadoPor: v.optional(v.string()),
    creadoPorXp: v.optional(v.string()),
    creadoAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('defects', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('defects'),
    ticket: v.string(),
    data: v.optional(v.string()),
    comentario: v.optional(v.string()),
    estado: v.string(),
    usuario: v.optional(v.string()),
    contrasena: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    return await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: {
    id: v.id('defects'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
