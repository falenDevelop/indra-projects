import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('team_members').collect();
  },
});

export const listByTeam = query({
  args: {
    teamId: v.id('teams'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('team_members')
      .filter((q) => q.eq(q.field('teamId'), args.teamId))
      .collect();
  },
});

export const create = mutation({
  args: {
    teamId: v.id('teams'),
    providerId: v.id('providers'),
    nombre: v.string(),
    estado: v.string(),
    moduleId: v.optional(v.id('modules')),
    isFocal: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verificar si ya existe esta relación
    const existing = await ctx.db
      .query('team_members')
      .filter((q) =>
        q.and(
          q.eq(q.field('teamId'), args.teamId),
          q.eq(q.field('providerId'), args.providerId)
        )
      )
      .first();

    if (existing) {
      throw new Error('Este proveedor ya está asignado a este equipo');
    }

    return await ctx.db.insert('team_members', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('team_members'),
    nombre: v.string(),
    estado: v.string(),
    moduleId: v.optional(v.id('modules')),
    isFocal: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    return await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: {
    id: v.id('team_members'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
