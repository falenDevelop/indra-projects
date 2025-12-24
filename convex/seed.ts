import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedUsers = mutation({
  handler: async (ctx) => {
    const users = [
      { name: "Juan Pérez", email: "juan@example.com", role: "Administrador", status: "Activo" },
      { name: "María García", email: "maria@example.com", role: "Usuario", status: "Activo" },
      { name: "Carlos López", email: "carlos@example.com", role: "Editor", status: "Inactivo" },
    ];

    for (const user of users) {
      await ctx.db.insert("users", user);
    }

    return { success: true, count: users.length };
  },
});