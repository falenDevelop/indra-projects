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
    // Obtener el defecto actual para comparar el estado
    const currentDefect = await ctx.db.get(id);

    // Si el estado cambió, actualizar ultimaActualizacionEstado
    if (currentDefect && currentDefect.estado !== args.estado) {
      return await ctx.db.patch(id, {
        ...data,
        ultimaActualizacionEstado: Date.now(),
      });
    }

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

export const clearNotifications = mutation({
  args: {
    defectIds: v.array(v.id('defects')),
  },
  handler: async (ctx, args) => {
    for (const id of args.defectIds) {
      await ctx.db.patch(id, {
        ultimaActualizacionEstado: undefined,
      });
    }
  },
});

export const getNotificationsByUser = query({
  args: {
    userXp: v.string(),
  },
  handler: async (ctx, args) => {
    // Obtener todos los defectos con notificaciones
    const allDefects = await ctx.db
      .query('defects')
      .filter((q) => q.neq(q.field('ultimaActualizacionEstado'), undefined))
      .collect();

    // Obtener el provider del usuario por su XP
    const providers = await ctx.db.query('providers').collect();
    const userProvider = providers.find((p) => p.xp === args.userXp);

    if (!userProvider) {
      return [];
    }

    // Obtener los módulos asignados a este provider
    const teamMembers = await ctx.db
      .query('team_members')
      .filter((q) => q.eq(q.field('providerId'), userProvider._id))
      .collect();

    const userModuleIds = teamMembers.map((tm) => tm.moduleId).filter(Boolean);

    // Filtrar defectos que pertenecen a los módulos del usuario
    const userDefects = allDefects.filter((d) =>
      userModuleIds.includes(d.moduleId)
    );

    return userDefects;
  },
});
