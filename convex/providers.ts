import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('providers').collect();
  },
});

export const create = mutation({
  args: {
    nombre: v.string(),
    xp: v.string(),
    correoEmpresa: v.string(),
    correoContractor: v.optional(v.string()),
    estado: v.string(),
    fechaInicio: v.string(),
    fechaFin: v.string(),
    tipo: v.string(),
    perfil: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('providers', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('providers'),
    nombre: v.string(),
    xp: v.string(),
    correoEmpresa: v.string(),
    correoContractor: v.optional(v.string()),
    estado: v.string(),
    fechaInicio: v.string(),
    fechaFin: v.string(),
    tipo: v.string(),
    perfil: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    return await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: {
    id: v.id('providers'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
