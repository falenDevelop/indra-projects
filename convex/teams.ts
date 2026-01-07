import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('teams').collect();
  },
});

export const create = mutation({
  args: {
    nombre: v.string(),
    bloque: v.string(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('teams', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('teams'),
    nombre: v.string(),
    bloque: v.string(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    return await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: {
    id: v.id('teams'),
  },
  handler: async (ctx, args) => {
    // Primero eliminar todos los miembros del equipo
    const members = await ctx.db
      .query('team_members')
      .filter((q) => q.eq(q.field('teamId'), args.id))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Luego eliminar el equipo
    return await ctx.db.delete(args.id);
  },
});
