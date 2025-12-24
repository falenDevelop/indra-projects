import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});