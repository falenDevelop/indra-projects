import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('modules').collect();
  },
});

export const create = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.string(),
    estado: v.string(),
    repositorio: v.optional(v.string()),
    figma: v.optional(v.string()),
    pruebasAndroid: v.optional(v.number()),
    pruebasIOS: v.optional(v.number()),
    pruebasHuawei: v.optional(v.number()),
    pruebasAndroidEjecutadas: v.optional(v.number()),
    pruebasIOSEjecutadas: v.optional(v.number()),
    pruebasHuaweiEjecutadas: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('modules', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('modules'),
    nombre: v.string(),
    descripcion: v.string(),
    estado: v.string(),
    repositorio: v.optional(v.string()),
    figma: v.optional(v.string()),
    pruebasAndroid: v.optional(v.number()),
    pruebasIOS: v.optional(v.number()),
    pruebasHuawei: v.optional(v.number()),
    pruebasAndroidEjecutadas: v.optional(v.number()),
    pruebasIOSEjecutadas: v.optional(v.number()),
    pruebasHuaweiEjecutadas: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    return await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: {
    id: v.id('modules'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
