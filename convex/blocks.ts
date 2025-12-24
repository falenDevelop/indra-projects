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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('blocks', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('blocks'),
    nombre: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
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
