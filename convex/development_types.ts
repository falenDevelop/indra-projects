import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('development_types').collect();
  },
});

export const create = mutation({
  args: {
    nombre: v.string(),
    numeroDias: v.optional(v.number()),
    porcentaje: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('development_types', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('development_types'),
    nombre: v.string(),
    numeroDias: v.optional(v.number()),
    porcentaje: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    return await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: {
    id: v.id('development_types'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
