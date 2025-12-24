import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listByBlock = query({
  args: {
    blockId: v.id('blocks'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('block_modules')
      .filter((q) => q.eq(q.field('blockId'), args.blockId))
      .collect();
  },
});

export const listByBlockName = query({
  args: {
    blockName: v.string(),
  },
  handler: async (ctx, args) => {
    // Buscar el bloque por nombre
    const block = await ctx.db
      .query('blocks')
      .filter((q) => q.eq(q.field('nombre'), args.blockName))
      .first();

    if (!block) {
      return [];
    }

    // Obtener las relaciones block_modules para este bloque
    const blockModules = await ctx.db
      .query('block_modules')
      .filter((q) => q.eq(q.field('blockId'), block._id))
      .collect();

    // Obtener los módulos completos
    const modules = await Promise.all(
      blockModules.map(async (bm) => {
        const module = await ctx.db.get(bm.moduleId);
        return module;
      })
    );

    return modules.filter((m) => m !== null);
  },
});

export const create = mutation({
  args: {
    blockId: v.id('blocks'),
    moduleId: v.id('modules'),
  },
  handler: async (ctx, args) => {
    // Verificar si ya existe esta relación
    const existing = await ctx.db
      .query('block_modules')
      .filter((q) =>
        q.and(
          q.eq(q.field('blockId'), args.blockId),
          q.eq(q.field('moduleId'), args.moduleId)
        )
      )
      .first();

    if (existing) {
      throw new Error('Este módulo ya está asignado a este bloque');
    }

    return await ctx.db.insert('block_modules', args);
  },
});

export const remove = mutation({
  args: {
    id: v.id('block_modules'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
