import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const setBlocksProject = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const blocks = await ctx.db.query('blocks').collect();
    for (const b of blocks) {
      await ctx.db.patch(b._id, { projectId: args.projectId });
    }
    return { updated: blocks.length };
  },
});

export const listProjects = query({
  handler: async (ctx) => {
    return await ctx.db.query('projects').collect();
  },
});
